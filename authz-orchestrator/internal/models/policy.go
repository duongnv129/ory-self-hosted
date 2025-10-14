package models

import "time"

// TenantConfig represents the complete policy configuration for a tenant
type TenantConfig struct {
	TenantID        string                 `json:"tenant_id"`
	Version         string                 `json:"version"`
	Active          *PolicyConfig          `json:"active,omitempty"`
	Draft           *PolicyConfig          `json:"draft,omitempty"`
	LastModified    time.Time              `json:"last_modified"`
	LastPublished   *time.Time             `json:"last_published,omitempty"`
}

// PolicyConfig represents the actual policy configuration
type PolicyConfig struct {
	WorkingHours      *WorkingHoursConfig      `json:"working_hours,omitempty"`
	ActionTimeWindows *ActionTimeWindowsConfig `json:"action_time_windows,omitempty"`
	Assurance         *AssuranceConfig         `json:"assurance,omitempty"`
	ClearanceOffsets  map[string]int           `json:"clearance_offsets,omitempty"`
	IPRestrictions    *IPRestrictionsConfig    `json:"ip_restrictions,omitempty"`
}

// WorkingHoursConfig defines allowed working hours
type WorkingHoursConfig struct {
	Blocks           []TimeBlock `json:"blocks"`
	OverrideSubjects []string    `json:"override_subjects"`
}

// TimeBlock represents a time window
type TimeBlock struct {
	Days      []string `json:"days"`      // MON, TUE, WED, THU, FRI, SAT, SUN
	StartHour int      `json:"start_hour"` // 0-23
	EndHour   int      `json:"end_hour"`   // 0-23
}

// ActionTimeWindowsConfig defines time windows for specific actions
type ActionTimeWindowsConfig struct {
	Actions           map[string][]TimeBlock `json:"actions"`
	Freezes           []FreezeInterval       `json:"freezes"`
	EmergencyOverride bool                   `json:"emergency_override"`
}

// FreezeInterval represents a maintenance/freeze period
type FreezeInterval struct {
	ActionPattern string    `json:"action_pattern"`
	StartISO      string    `json:"start_iso"`
	EndISO        string    `json:"end_iso"`
	Reason        string    `json:"reason"`
}

// AssuranceConfig defines authentication assurance requirements
type AssuranceConfig struct {
	BaseActionAAL        map[string]int            `json:"base_action_aal"`
	RiskEscalationRules  []RiskEscalationRule      `json:"risk_escalation_rules"`
	AcceptedFactors      map[string][]string       `json:"accepted_factors"`
	StepUpTTLMinutes     map[string]int            `json:"step_up_ttl_minutes"`
}

// RiskEscalationRule defines when to escalate AAL based on risk/classification
type RiskEscalationRule struct {
	Match       map[string]interface{} `json:"match"`
	RequiredAAL int                    `json:"required_aal"`
}

// IPRestrictionsConfig defines IP-based access controls
type IPRestrictionsConfig struct {
	IPAllowlist    []string `json:"ip_allowlist,omitempty"`
	AllowedRegions []string `json:"allowed_regions,omitempty"`
}

// ValidationResult represents the result of policy configuration validation
type ValidationResult struct {
	Valid    bool              `json:"valid"`
	Errors   []ValidationError `json:"errors"`
	Warnings []ValidationError `json:"warnings"`
}

// ValidationError represents a validation error or warning
type ValidationError struct {
	Code    string `json:"code"`
	Field   string `json:"field"`
	Message string `json:"message"`
}

// PolicyTemplate represents a policy template definition
type PolicyTemplate struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Parameters  []TemplateParameter    `json:"parameters"`
	Schema      map[string]interface{} `json:"schema"`
}

// TemplateParameter represents an editable parameter in a policy template
type TemplateParameter struct {
	Name        string      `json:"name"`
	Type        string      `json:"type"`
	Description string      `json:"description"`
	Required    bool        `json:"required"`
	Default     interface{} `json:"default,omitempty"`
	Options     []string    `json:"options,omitempty"`
}

// Validation error codes
const (
	ErrOverlapBlock        = "OVERLAP_BLOCK"
	ErrInvalidTimeRange    = "INVALID_TIME_RANGE"
	ErrInvalidAAL          = "INVALID_AAL"
	ErrInvalidFreezeRange  = "INVALID_FREEZE_RANGE"
	ErrMissingActionAAL    = "MISSING_ACTION_AAL"
	ErrDuplicateMatch      = "DUPLICATE_MATCH"
	ErrEmptyMatch          = "EMPTY_MATCH"
)