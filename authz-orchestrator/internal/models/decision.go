package models

import (
	"time"
)

// DecisionState represents the final authorization decision
type DecisionState string

const (
	DecisionAllow          DecisionState = "ALLOW"
	DecisionDeny           DecisionState = "DENY"
	DecisionStepUpRequired DecisionState = "STEP_UP_REQUIRED"
)

// DecisionRequest represents an authorization request to the orchestrator
type DecisionRequest struct {
	Subject  string                 `json:"subject" binding:"required"`
	Action   string                 `json:"action" binding:"required"`
	Resource string                 `json:"resource" binding:"required"`
	Context  map[string]interface{} `json:"context"`
	Tenant   string                 `json:"tenant"`
}

// DecisionResponse represents the unified authorization decision
type DecisionResponse struct {
	State         DecisionState     `json:"state"`
	Action        string            `json:"action"`
	Resource      string            `json:"resource"`
	Subject       string            `json:"subject"`
	Tenant        string            `json:"tenant"`
	Structural    *StructuralResult `json:"structural"`
	Policies      []*PolicyResult   `json:"policies"`
	Risk          *RiskAssessment   `json:"risk"`
	RequiredAAL   int               `json:"required_aal"`
	SessionAAL    int               `json:"session_aal"`
	FactorsSuggested []string       `json:"factors_suggested,omitempty"`
	Reasons       []string          `json:"reasons"`
	ConfigVersion string            `json:"config_version"`
	Timestamp     time.Time         `json:"timestamp"`
}

// StructuralResult represents the result of Keto structural authorization
type StructuralResult struct {
	Allowed           bool     `json:"allowed"`
	RequiredRelations []string `json:"required_relations"`
	Path              []string `json:"path,omitempty"`
}

// PolicyResult represents the result of a single policy evaluation
type PolicyResult struct {
	Template    string                 `json:"template"`
	Status      string                 `json:"status"` // pass, fail
	ReasonCodes []string               `json:"reason_codes"`
	Details     map[string]interface{} `json:"details,omitempty"`
}

// RiskAssessment represents the risk evaluation for the request
type RiskAssessment struct {
	Level   string   `json:"level"`   // LOW, MED, HIGH
	Reasons []string `json:"reasons"`
}

// Reason codes as defined in the spec
const (
	// Structural
	ReasonStructuralDenied = "structural_denied"

	// Working Hours
	ReasonWorkingHoursViolation     = "working_hours_violation"
	ReasonWorkingHoursOverride      = "working_hours_override_applied"

	// Action Windows
	ReasonActionWindowDenied = "action_window_denied"

	// Freeze
	ReasonFreezeActive = "freeze_active"

	// Assurance
	ReasonAssuranceStepUpRequired = "assurance_step_up_required"
	ReasonAssuranceSufficient     = "assurance_sufficient"

	// Clearance
	ReasonClearanceInsufficient = "clearance_insufficient"

	// Emergency
	ReasonEmergencyOverride = "emergency_override_active"

	// System
	ReasonPolicyEngineUnavailable = "policy_engine_unavailable"
)