package policy

import (
	"fmt"
	"time"

	"github.com/rs/zerolog/log"

	"github.com/ory-self-hosted/authz-orchestrator/internal/models"
)

// Manager handles policy configuration management
type Manager struct {
	storage Storage
}

// Storage interface for tenant configuration persistence
type Storage interface {
	GetTenantConfig(tenantID string) (*models.TenantConfig, error)
	SaveTenantConfig(config *models.TenantConfig) error
	ListTenants() ([]string, error)
	DeleteTenantConfig(tenantID string) error
}

// NewManager creates a new policy manager
func NewManager(storage Storage) *Manager {
	return &Manager{
		storage: storage,
	}
}

// GetTenantConfig retrieves the configuration for a tenant
func (m *Manager) GetTenantConfig(tenantID string) (*models.TenantConfig, error) {
	log.Debug().Str("tenant", tenantID).Msg("Getting tenant configuration")
	
	config, err := m.storage.GetTenantConfig(tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get tenant config: %w", err)
	}

	return config, nil
}

// UpdateDraftConfig updates the draft configuration for a tenant
func (m *Manager) UpdateDraftConfig(tenantID string, policyConfig *models.PolicyConfig) (*models.TenantConfig, error) {
	log.Info().Str("tenant", tenantID).Msg("Updating draft configuration")

	// Get existing config or create new one
	config, err := m.storage.GetTenantConfig(tenantID)
	if err != nil {
		// Create new config if doesn't exist
		config = &models.TenantConfig{
			TenantID:     tenantID,
			Version:      "v1",
			LastModified: time.Now(),
		}
	}

	// Update draft
	config.Draft = policyConfig
	config.LastModified = time.Now()

	// Save to storage
	if err := m.storage.SaveTenantConfig(config); err != nil {
		return nil, fmt.Errorf("failed to save draft config: %w", err)
	}

	log.Info().Str("tenant", tenantID).Msg("Draft configuration updated")
	return config, nil
}

// ValidateConfig validates a policy configuration
func (m *Manager) ValidateConfig(policyConfig *models.PolicyConfig) *models.ValidationResult {
	result := &models.ValidationResult{
		Valid:    true,
		Errors:   []models.ValidationError{},
		Warnings: []models.ValidationError{},
	}

	// Validate working hours
	if policyConfig.WorkingHours != nil {
		m.validateWorkingHours(policyConfig.WorkingHours, result)
	}

	// Validate action time windows
	if policyConfig.ActionTimeWindows != nil {
		m.validateActionTimeWindows(policyConfig.ActionTimeWindows, result)
	}

	// Validate assurance config
	if policyConfig.Assurance != nil {
		m.validateAssurance(policyConfig.Assurance, result)
	}

	// Validate clearance offsets
	if policyConfig.ClearanceOffsets != nil {
		m.validateClearanceOffsets(policyConfig.ClearanceOffsets, result)
	}

	result.Valid = len(result.Errors) == 0
	return result
}

// PublishConfig promotes draft configuration to active
func (m *Manager) PublishConfig(tenantID string) (*models.TenantConfig, error) {
	log.Info().Str("tenant", tenantID).Msg("Publishing draft configuration")

	// Get current config
	config, err := m.storage.GetTenantConfig(tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get tenant config: %w", err)
	}

	if config.Draft == nil {
		return nil, fmt.Errorf("no draft configuration to publish")
	}

	// Validate before publishing
	validation := m.ValidateConfig(config.Draft)
	if !validation.Valid {
		return nil, fmt.Errorf("draft configuration is invalid: %d errors", len(validation.Errors))
	}

	// Promote draft to active
	config.Active = config.Draft
	config.Draft = nil
	
	// Update version and timestamps
	config.Version = m.generateVersion()
	now := time.Now()
	config.LastModified = now
	config.LastPublished = &now

	// Save to storage
	if err := m.storage.SaveTenantConfig(config); err != nil {
		return nil, fmt.Errorf("failed to publish config: %w", err)
	}

	log.Info().
		Str("tenant", tenantID).
		Str("version", config.Version).
		Msg("Configuration published successfully")

	return config, nil
}

// ListTenants returns all tenant IDs
func (m *Manager) ListTenants() ([]string, error) {
	return m.storage.ListTenants()
}

// DeleteTenantConfig removes a tenant's configuration
func (m *Manager) DeleteTenantConfig(tenantID string) error {
	log.Info().Str("tenant", tenantID).Msg("Deleting tenant configuration")
	return m.storage.DeleteTenantConfig(tenantID)
}

// GetPolicyTemplates returns available policy templates
func (m *Manager) GetPolicyTemplates() []models.PolicyTemplate {
	return []models.PolicyTemplate{
		{
			Name:        "working_hours",
			Description: "Restrict actions outside allowed hours",
			Parameters: []models.TemplateParameter{
				{
					Name:        "blocks",
					Type:        "array",
					Description: "Time blocks defining allowed hours",
					Required:    true,
				},
				{
					Name:        "override_subjects",
					Type:        "array",
					Description: "Users who can bypass working hours restrictions",
					Required:    false,
				},
			},
		},
		{
			Name:        "action_time_windows",
			Description: "Restrict specific actions to time windows",
			Parameters: []models.TemplateParameter{
				{
					Name:        "actions",
					Type:        "object",
					Description: "Action-specific time windows",
					Required:    true,
				},
				{
					Name:        "freezes",
					Type:        "array",
					Description: "Maintenance freeze periods",
					Required:    false,
				},
				{
					Name:        "emergency_override",
					Type:        "boolean",
					Description: "Allow emergency override of all restrictions",
					Required:    false,
				},
			},
		},
		{
			Name:        "assurance",
			Description: "Risk-based authentication assurance",
			Parameters: []models.TemplateParameter{
				{
					Name:        "base_action_aal",
					Type:        "object",
					Description: "Base AAL requirements per action",
					Required:    true,
				},
				{
					Name:        "risk_escalation_rules",
					Type:        "array",
					Description: "Rules for escalating AAL based on risk",
					Required:    false,
				},
			},
		},
		{
			Name:        "clearance",
			Description: "Enforce clearance levels for classified data",
			Parameters: []models.TemplateParameter{
				{
					Name:        "clearance_offsets",
					Type:        "object",
					Description: "Required clearance levels per classification",
					Required:    true,
				},
			},
		},
	}
}

// Validation helper functions

func (m *Manager) validateWorkingHours(config *models.WorkingHoursConfig, result *models.ValidationResult) {
	// Check for overlapping time blocks
	for i, block1 := range config.Blocks {
		for j, block2 := range config.Blocks {
			if i >= j {
				continue
			}
			if m.blocksOverlap(block1, block2) {
				result.Errors = append(result.Errors, models.ValidationError{
					Code:    models.ErrOverlapBlock,
					Field:   fmt.Sprintf("working_hours.blocks[%d]", j),
					Message: "Time blocks overlap",
				})
			}
		}

		// Validate time range
		if block1.StartHour < 0 || block1.StartHour > 23 || block1.EndHour < 0 || block1.EndHour > 23 {
			result.Errors = append(result.Errors, models.ValidationError{
				Code:    models.ErrInvalidTimeRange,
				Field:   fmt.Sprintf("working_hours.blocks[%d]", i),
				Message: "Hour must be between 0 and 23",
			})
		}

		if block1.StartHour >= block1.EndHour {
			result.Errors = append(result.Errors, models.ValidationError{
				Code:    models.ErrInvalidTimeRange,
				Field:   fmt.Sprintf("working_hours.blocks[%d]", i),
				Message: "Start hour must be less than end hour",
			})
		}
	}
}

func (m *Manager) validateActionTimeWindows(config *models.ActionTimeWindowsConfig, result *models.ValidationResult) {
	// Validate freeze intervals
	for i, freeze := range config.Freezes {
		startTime, err1 := time.Parse(time.RFC3339, freeze.StartISO)
		endTime, err2 := time.Parse(time.RFC3339, freeze.EndISO)

		if err1 != nil || err2 != nil {
			result.Errors = append(result.Errors, models.ValidationError{
				Code:    models.ErrInvalidFreezeRange,
				Field:   fmt.Sprintf("action_time_windows.freezes[%d]", i),
				Message: "Invalid ISO 8601 timestamp format",
			})
			continue
		}

		if !startTime.Before(endTime) {
			result.Errors = append(result.Errors, models.ValidationError{
				Code:    models.ErrInvalidFreezeRange,
				Field:   fmt.Sprintf("action_time_windows.freezes[%d]", i),
				Message: "Start time must be before end time",
			})
		}
	}
}

func (m *Manager) validateAssurance(config *models.AssuranceConfig, result *models.ValidationResult) {
	// Validate AAL values
	for action, aal := range config.BaseActionAAL {
		if aal < 1 || aal > 3 {
			result.Errors = append(result.Errors, models.ValidationError{
				Code:    models.ErrInvalidAAL,
				Field:   fmt.Sprintf("assurance.base_action_aal.%s", action),
				Message: "AAL must be between 1 and 3",
			})
		}
	}

	// Validate escalation rules
	for i, rule := range config.RiskEscalationRules {
		if len(rule.Match) == 0 {
			result.Warnings = append(result.Warnings, models.ValidationError{
				Code:    models.ErrEmptyMatch,
				Field:   fmt.Sprintf("assurance.risk_escalation_rules[%d]", i),
				Message: "Empty match criteria",
			})
		}

		if rule.RequiredAAL < 1 || rule.RequiredAAL > 3 {
			result.Errors = append(result.Errors, models.ValidationError{
				Code:    models.ErrInvalidAAL,
				Field:   fmt.Sprintf("assurance.risk_escalation_rules[%d].required_aal", i),
				Message: "Required AAL must be between 1 and 3",
			})
		}
	}
}

func (m *Manager) validateClearanceOffsets(offsets map[string]int, result *models.ValidationResult) {
	for classification, offset := range offsets {
		if offset < 0 || offset > 10 {
			result.Errors = append(result.Errors, models.ValidationError{
				Code:    models.ErrInvalidAAL,
				Field:   fmt.Sprintf("clearance_offsets.%s", classification),
				Message: "Clearance offset must be between 0 and 10",
			})
		}
	}
}

func (m *Manager) blocksOverlap(block1, block2 models.TimeBlock) bool {
	// Check if any days overlap
	daySet1 := make(map[string]bool)
	for _, day := range block1.Days {
		daySet1[day] = true
	}

	for _, day := range block2.Days {
		if daySet1[day] {
			// Same day, check time overlap
			if !(block1.EndHour <= block2.StartHour || block2.EndHour <= block1.StartHour) {
				return true
			}
		}
	}

	return false
}

func (m *Manager) generateVersion() string {
	return fmt.Sprintf("v%d", time.Now().Unix())
}