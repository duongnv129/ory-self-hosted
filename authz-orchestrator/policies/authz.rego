package authz

import rego.v1

# Main decision entry point
decision := {
    "allow": allow,
    "reasons": reasons,
    "required_aal": required_aal,
    "session_aal": session_aal,
    "details": details
}

# Safe session AAL extraction
session_aal := input.context.session.aal if {
    input.context.session.aal
} else := 1

# Default allow is false
default allow := false

# Allow if all policies pass and structural authorization succeeded
allow if {
    input.structural_allowed
    working_hours_allow
    action_window_allow
    clearance_allow
    assurance_allow
}

# Collect all denial reasons
reasons := array.concat(
    working_hours_reasons,
    array.concat(
        action_window_reasons,
        array.concat(
            clearance_reasons,
            assurance_reasons
        )
    )
)

# Additional details for step-up scenarios
details := {
    "factors_suggested": factors_suggested,
    "risk_level": input.context.risk.level,
    "hour_utc": input.context.hour_utc
}

# Working Hours Policy  
default working_hours_allow := false
working_hours_reasons := reasons if {
    not working_hours_allow
    reasons := ["working_hours_violation"]
} else := []

working_hours_allow if {
    # Check if user has override
    input.subject.id in input.tenant_config.working_hours.override_subjects
}

working_hours_allow if {
    # Check if current time falls within allowed blocks
    some block in input.tenant_config.working_hours.blocks
    current_day in block.days
    input.context.hour_utc >= block.start_hour
    input.context.hour_utc < block.end_hour
}

# Get current day (simplified - assume MON-FRI for demo)
current_day := "MON" if input.context.hour_utc >= 0  # Simplified logic

# Action Time Windows Policy
default action_window_allow := true
action_window_reasons := reasons if {
    not action_window_allow
    freeze_active
    reasons := ["freeze_active"]
} else if {
    not action_window_allow
    reasons := ["action_window_denied"]
} else := []

# Check for active freezes
freeze_active if {
    some freeze in input.tenant_config.action_time_windows.freezes
    # Simplified: assume current time falls in freeze window
    # In real implementation, would parse ISO timestamps
    true  # Placeholder logic
}

# Clearance Policy
default clearance_allow := true
clearance_reasons := reasons if {
    not clearance_allow
    reasons := ["clearance_insufficient"]
} else := []

clearance_allow if {
    # Check if user clearance meets requirement
    required_clearance := input.tenant_config.clearance_offsets[input.resource.attributes.classification]
    input.subject.clearance >= required_clearance
}

clearance_allow if {
    # Allow if no clearance requirement
    not input.resource.attributes.classification
}

clearance_allow if {
    # Allow if classification is public
    input.resource.attributes.classification == "public"
}

# Assurance Policy
default assurance_allow := true
assurance_reasons := reasons if {
    required_aal > input.context.session.aal
    reasons := ["assurance_step_up_required"]
} else := []

# Calculate required AAL
required_aal := max_aal if {
    base_aal := base_action_aal
    escalated_aal := escalation_aal
    max_aal := base_aal
    base_aal >= escalated_aal
} else := max_aal if {
    base_aal := base_action_aal
    escalated_aal := escalation_aal
    max_aal := escalated_aal
    escalated_aal > base_aal
} else := 1

# Helper for base action AAL
base_action_aal := input.tenant_config.assurance.base_action_aal[input.action] if {
    input.tenant_config.assurance.base_action_aal[input.action]
} else := 1

# Escalation based on risk and classification
escalation_aal := aal if {
    some rule in input.tenant_config.assurance.risk_escalation_rules
    rule.match.risk == input.context.risk.level
    aal := rule.required_aal
} else if {
    some rule in input.tenant_config.assurance.risk_escalation_rules
    rule.match.classification == input.resource.attributes.classification
    aal := rule.required_aal
} else := 1

# Suggested factors for step-up
factors_suggested := input.tenant_config.assurance.accepted_factors[sprintf("%d", [required_aal])] if {
    required_aal > input.context.session.aal
} else := []