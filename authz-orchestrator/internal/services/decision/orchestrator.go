package decision

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/rs/zerolog/log"

	"github.com/ory-self-hosted/authz-orchestrator/internal/clients/keto"
	"github.com/ory-self-hosted/authz-orchestrator/internal/clients/opa"
	"github.com/ory-self-hosted/authz-orchestrator/internal/models"
	"github.com/ory-self-hosted/authz-orchestrator/internal/services/policy"
)

// Orchestrator coordinates authorization decisions between Keto and OPA
type Orchestrator struct {
	ketoClient    *keto.Client
	opaClient     *opa.Client
	policyManager *policy.Manager
}

// NewOrchestrator creates a new decision orchestrator
func NewOrchestrator(ketoClient *keto.Client, opaClient *opa.Client, policyManager *policy.Manager) *Orchestrator {
	return &Orchestrator{
		ketoClient:    ketoClient,
		opaClient:     opaClient,
		policyManager: policyManager,
	}
}

// MakeDecision processes an authorization request through the complete pipeline
func (o *Orchestrator) MakeDecision(ctx context.Context, req *models.DecisionRequest) (*models.DecisionResponse, error) {
	start := time.Now()
	
	log.Info().
		Str("subject", req.Subject).
		Str("action", req.Action).
		Str("resource", req.Resource).
		Str("tenant", req.Tenant).
		Msg("Processing authorization decision")

	response := &models.DecisionResponse{
		Action:    req.Action,
		Resource:  req.Resource,
		Subject:   req.Subject,
		Tenant:    req.Tenant,
		Timestamp: time.Now(),
		Policies:  []*models.PolicyResult{},
		Reasons:   []string{},
	}

	// Step 1: Map action to required structural relations
	requiredRelations := o.mapActionToRelations(req.Action)

	// Step 2: Check structural authorization via Keto
	structuralResult, err := o.checkStructuralAuthorization(ctx, req, requiredRelations)
	if err != nil {
		log.Error().Err(err).Msg("Failed to check structural authorization")
		return o.buildErrorResponse(req, "structural_check_failed"), nil
	}
	response.Structural = structuralResult

	// If structural check fails, return immediate DENY
	if !structuralResult.Allowed {
		response.State = models.DecisionDeny
		response.Reasons = []string{models.ReasonStructuralDenied}
		
		log.Info().
			Dur("duration", time.Since(start)).
			Bool("allowed", false).
			Str("reason", "structural_denied").
			Msg("Authorization decision completed")
		return response, nil
	}

	// Step 3: Get tenant policy configuration
	tenantConfig, err := o.policyManager.GetTenantConfig(req.Tenant)
	if err != nil {
		log.Warn().Err(err).Str("tenant", req.Tenant).Msg("Failed to get tenant config, using defaults")
		tenantConfig = o.getDefaultTenantConfig(req.Tenant)
	}
	response.ConfigVersion = tenantConfig.Version

	// Step 4: Assess risk level
	riskAssessment := o.assessRisk(req)
	response.Risk = riskAssessment

	// Step 5: Enrich context for OPA evaluation
	enrichedContext := o.enrichContext(req, riskAssessment)

	// Step 6: Evaluate contextual policies via OPA
	policyInput := &opa.PolicyInput{
		Subject: opa.Subject{
			ID:        req.Subject,
			Clearance: o.extractUserClearance(req),
			Attributes: map[string]interface{}{
				"after_hours_override": o.hasAfterHoursOverride(req.Subject, tenantConfig),
			},
		},
		Resource: opa.Resource{
			Type: o.extractResourceType(req.Resource),
			Attributes: map[string]interface{}{
				"classification":      o.extractResourceClassification(req),
				"required_clearance": o.extractRequiredClearance(req),
				"tags":               o.extractResourceTags(req),
			},
		},
		Action:            req.Action,
		Context:           enrichedContext,
		TenantConfig:      o.convertTenantConfigForOPA(tenantConfig),
		StructuralAllowed: true,
	}

	policyDecision, err := o.opaClient.Evaluate(ctx, policyInput)
	if err != nil {
		log.Error().Err(err).Msg("Failed to evaluate OPA policies")
		return o.buildErrorResponse(req, "policy_engine_unavailable"), nil
	}

	// Step 7: Merge structural and policy results
	response = o.mergeResults(response, policyDecision)

	log.Info().
		Dur("duration", time.Since(start)).
		Str("state", string(response.State)).
		Strs("reasons", response.Reasons).
		Int("required_aal", response.RequiredAAL).
		Msg("Authorization decision completed")

	return response, nil
}

// mapActionToRelations maps an action to required Keto relations
func (o *Orchestrator) mapActionToRelations(action string) []string {
	// Extract the base action from different formats:
	// - "user.list" or "products/list" -> "list"
	// - "list" -> "list"
	var baseAction string
	
	// Handle dot notation (user.list)
	if strings.Contains(action, ".") {
		parts := strings.Split(action, ".")
		baseAction = parts[len(parts)-1]
	} else if strings.Contains(action, "/") {
		// Handle slash notation (products/list)
		parts := strings.Split(action, "/")
		baseAction = parts[len(parts)-1]
	} else {
		// Single action word
		baseAction = action
	}
	
	// Map actions to Keto relations (1:1 mapping for clarity)
	switch baseAction {
	case "list":
		return []string{"list"}
	case "get", "view":
		return []string{"view"}
	case "create":
		return []string{"create"}
	case "update", "edit":
		return []string{"edit"}
	case "delete":
		return []string{"delete"}
	case "approve":
		return []string{"approve"}
	case "export":
		return []string{"export"}
	default:
		// Default to view for unknown actions
		return []string{"view"}
	}
}

// checkStructuralAuthorization checks authorization via Keto
func (o *Orchestrator) checkStructuralAuthorization(ctx context.Context, req *models.DecisionRequest, requiredRelations []string) (*models.StructuralResult, error) {
	result := &models.StructuralResult{
		RequiredRelations: requiredRelations,
		Path:              []string{},
	}

	// Extract resource object and namespace
	resourceObject := o.extractResourceObject(req.Resource)
	namespace := o.extractNamespace(req)

	// Check each required relation
	for _, relation := range requiredRelations {
		checkReq := &keto.CheckRequest{
			Namespace: namespace,
			Object:    resourceObject,
			Relation:  relation,
			SubjectID: req.Subject,
		}

		checkResp, err := o.ketoClient.CheckRelation(ctx, checkReq)
		if err != nil {
			return nil, fmt.Errorf("keto check failed: %w", err)
		}

		if checkResp.Allowed {
			result.Allowed = true
			result.Path = []string{relation, req.Subject}
			break // One successful relation is enough
		}
	}

	return result, nil
}

// assessRisk evaluates the risk level for the request
func (o *Orchestrator) assessRisk(req *models.DecisionRequest) *models.RiskAssessment {
	reasons := []string{}
	level := "LOW"

	// Extract hour from context
	hour := o.extractHour(req)
	classification := o.extractResourceClassification(req)

	// Risk rule: HIGH if outside business hours AND accessing internal/confidential
	if (hour < 6 || hour >= 22) && (classification == "internal" || classification == "confidential") {
		level = "HIGH"
		reasons = append(reasons, "after_hours", "sensitive_data")
	} else if classification == "internal" {
		level = "MED"
		reasons = append(reasons, "internal_data")
	}

	// Additional risk factors from context
	if ip := o.extractIP(req); ip != "" && o.isNewLocation(ip) {
		if level != "HIGH" {
			level = "MED"
		}
		reasons = append(reasons, "new_location")
	}

	return &models.RiskAssessment{
		Level:   level,
		Reasons: reasons,
	}
}

// Helper functions for extracting context information
func (o *Orchestrator) extractResourceObject(resource string) string {
	// Use the resource as provided, no transformation needed
	// Examples: "user:collection", "product:collection", "file:doc-123"
	return resource
}

func (o *Orchestrator) extractNamespace(req *models.DecisionRequest) string {
	// Extract from context or default to authz-orchestrator
	if ns, ok := req.Context["keto_namespace"].(string); ok {
		return ns
	}
	// Default to authz-orchestrator namespace for this service
	return "authz-orchestrator"
}

func (o *Orchestrator) extractResourceType(resource string) string {
	parts := strings.Split(resource, ":")
	if len(parts) >= 1 {
		return parts[0]
	}
	return "file"
}

func (o *Orchestrator) extractResourceClassification(req *models.DecisionRequest) string {
	if classification, ok := req.Context["classification"].(string); ok {
		return classification
	}
	return "public"
}

func (o *Orchestrator) extractRequiredClearance(req *models.DecisionRequest) int {
	if clearance, ok := req.Context["required_clearance"].(float64); ok {
		return int(clearance)
	}
	return 0
}

func (o *Orchestrator) extractResourceTags(req *models.DecisionRequest) []string {
	if tags, ok := req.Context["tags"].([]interface{}); ok {
		result := make([]string, len(tags))
		for i, tag := range tags {
			if s, ok := tag.(string); ok {
				result[i] = s
			}
		}
		return result
	}
	return []string{}
}

func (o *Orchestrator) extractUserClearance(req *models.DecisionRequest) int {
	if clearance, ok := req.Context["user_clearance"].(float64); ok {
		return int(clearance)
	}
	return 1 // default clearance
}

func (o *Orchestrator) extractHour(req *models.DecisionRequest) int {
	if hour, ok := req.Context["hour_utc"].(float64); ok {
		return int(hour)
	}
	// Default to current UTC hour
	return time.Now().UTC().Hour()
}

func (o *Orchestrator) extractIP(req *models.DecisionRequest) string {
	if ip, ok := req.Context["ip"].(string); ok {
		return ip
	}
	return ""
}

func (o *Orchestrator) extractSessionAAL(req *models.DecisionRequest) int {
	// First try the flat structure (for backward compatibility)
	if aal, ok := req.Context["session_aal"].(float64); ok {
		return int(aal)
	}
	
	// Then try the nested structure (context.session.aal)
	if session, ok := req.Context["session"].(map[string]interface{}); ok {
		if aal, ok := session["aal"].(float64); ok {
			return int(aal)
		}
	}
	
	return 1 // default AAL
}

func (o *Orchestrator) hasAfterHoursOverride(subject string, config *models.TenantConfig) bool {
	if config.Active == nil || config.Active.WorkingHours == nil {
		return false
	}
	
	for _, override := range config.Active.WorkingHours.OverrideSubjects {
		if override == subject {
			return true
		}
	}
	return false
}

func (o *Orchestrator) isNewLocation(ip string) bool {
	// Simplified: check if IP is from common internal ranges
	return !strings.HasPrefix(ip, "192.168.") && !strings.HasPrefix(ip, "10.") && !strings.HasPrefix(ip, "172.")
}

func (o *Orchestrator) enrichContext(req *models.DecisionRequest, risk *models.RiskAssessment) opa.Context {
	return opa.Context{
		IP:      o.extractIP(req),
		HourUTC: o.extractHour(req),
		Risk: opa.RiskContext{
			Level: risk.Level,
		},
		Session: opa.SessionContext{
			AAL: o.extractSessionAAL(req),
		},
	}
}

func (o *Orchestrator) convertTenantConfigForOPA(config *models.TenantConfig) map[string]interface{} {
	if config.Active == nil {
		return map[string]interface{}{}
	}

	// Convert policy config to map for OPA
	configMap := map[string]interface{}{}
	
	if config.Active.WorkingHours != nil {
		configMap["working_hours"] = config.Active.WorkingHours
	}
	if config.Active.ActionTimeWindows != nil {
		configMap["action_time_windows"] = config.Active.ActionTimeWindows
	}
	if config.Active.Assurance != nil {
		configMap["assurance"] = config.Active.Assurance
	}
	if config.Active.ClearanceOffsets != nil {
		configMap["clearance_offsets"] = config.Active.ClearanceOffsets
	}

	return configMap
}

func (o *Orchestrator) mergeResults(response *models.DecisionResponse, policyDecision *opa.PolicyDecision) *models.DecisionResponse {
	response.RequiredAAL = policyDecision.RequiredAAL
	response.SessionAAL = policyDecision.SessionAAL

	// Determine final state
	if !policyDecision.Allow {
		response.State = models.DecisionDeny
	} else if policyDecision.RequiredAAL > policyDecision.SessionAAL {
		response.State = models.DecisionStepUpRequired
		if factors, ok := policyDecision.Details["factors_suggested"].([]interface{}); ok {
			response.FactorsSuggested = make([]string, len(factors))
			for i, factor := range factors {
				if s, ok := factor.(string); ok {
					response.FactorsSuggested[i] = s
				}
			}
		}
	} else {
		response.State = models.DecisionAllow
	}

	// Merge reasons (maintain priority order)
	response.Reasons = append(response.Reasons, policyDecision.Reasons...)

	return response
}

func (o *Orchestrator) getDefaultTenantConfig(tenantID string) *models.TenantConfig {
	return &models.TenantConfig{
		TenantID: tenantID,
		Version:  "default",
		Active: &models.PolicyConfig{
			WorkingHours: &models.WorkingHoursConfig{
				Blocks: []models.TimeBlock{
					{
						Days:      []string{"MON", "TUE", "WED", "THU", "FRI"},
						StartHour: 8,
						EndHour:   18,
					},
				},
				OverrideSubjects: []string{},
			},
			Assurance: &models.AssuranceConfig{
				BaseActionAAL: map[string]int{
					"file.read":    1,
					"file.edit":    2,
					"file.approve": 2,
					"file.export":  2,
				},
				AcceptedFactors: map[string][]string{
					"2": {"totp", "passkey"},
					"3": {"fido2_key"},
				},
			},
		},
	}
}

func (o *Orchestrator) buildErrorResponse(req *models.DecisionRequest, reason string) *models.DecisionResponse {
	return &models.DecisionResponse{
		State:     models.DecisionDeny,
		Action:    req.Action,
		Resource:  req.Resource,
		Subject:   req.Subject,
		Tenant:    req.Tenant,
		Reasons:   []string{reason},
		Timestamp: time.Now(),
	}
}