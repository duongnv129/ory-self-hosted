# 📚 Complete Guide: Adding New Policies to AuthZ Orchestrator

## 🎯 **Overview**

The AuthZ Orchestrator supports two types of policy extensions:
1. **OPA Contextual Policies** (`.rego` files) - Runtime decision logic
2. **Tenant Configuration Policies** (JSON schemas) - Per-tenant parameters

## 🛠️ **Method 1: Adding New OPA Contextual Policies**

### **Step 1: Create New Policy File**
```bash
# Create new policy in the policies directory
touch authz-orchestrator/policies/your-policy-name.rego
```

### **Step 2: Write Policy Logic (Rego)**
```rego
package authz.your_policy_name

import rego.v1

# Default policy result
default your_policy_allow := true

# Policy logic
your_policy_allow if {
    # Your custom conditions here
    input.context.some_field == "expected_value"
    input.tenant_config.your_policy.enabled
}

# Denial reasons
your_policy_reasons := reasons if {
    not your_policy_allow
    reasons := ["your_policy_violation"]
} else := []

# Optional: Risk escalation
your_policy_risk_escalation := 2 if {
    # Conditions that require higher AAL
    input.context.some_risk_factor
} else := 0
```

### **Step 3: Integrate into Main Policy**
Edit `authz-orchestrator/policies/authz.rego`:

```rego
# Add to the main allow rule
allow if {
    input.structural_allowed
    working_hours_allow
    action_window_allow
    clearance_allow
    assurance_allow
    your_policy_allow  # <-- Add your policy
}

# Add to reasons collection
reasons := array.concat(
    working_hours_reasons,
    array.concat(
        action_window_reasons,
        array.concat(
            clearance_reasons,
            array.concat(
                assurance_reasons,
                your_policy_reasons  # <-- Add your reasons
            )
        )
    )
)
```

### **Step 4: Update Tenant Configuration Schema**
Add to `authz-orchestrator/internal/models/policy.go`:

```go
type PolicyConfig struct {
    WorkingHours      *WorkingHoursConfig      `json:"working_hours,omitempty"`
    ActionTimeWindows *ActionTimeWindowsConfig `json:"action_time_windows,omitempty"`
    Assurance         *AssuranceConfig         `json:"assurance,omitempty"`
    ClearanceOffsets  map[string]int           `json:"clearance_offsets,omitempty"`
    IPRestrictions    *IPRestrictionsConfig    `json:"ip_restrictions,omitempty"`
    YourPolicy        *YourPolicyConfig        `json:"your_policy,omitempty"` // <-- Add this
}

// Define your policy configuration structure
type YourPolicyConfig struct {
    Enabled     bool                   `json:"enabled"`
    Parameters  map[string]interface{} `json:"parameters"`
    // Add specific fields as needed
}
```

### **Step 5: Update Tenant Configuration Files**
Edit `authz-orchestrator/config/tenant-a.json`:

```json
{
  "tenant_id": "tenant-a",
  "version": "1.0.0",
  "active": {
    "working_hours": { ... },
    "assurance": { ... },
    "your_policy": {
      "enabled": true,
      "parameters": {
        "custom_setting": "value"
      }
    }
  }
}
```

### **Step 6: Test and Deploy**
```bash
# Rebuild and restart
cd authz-orchestrator
docker compose up -d --build

# Test the new policy
curl -X POST http://localhost:8080/decision \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "user:test@example.com",
    "action": "test.action",
    "resource": "test:resource",
    "tenant": "tenant-a",
    "context": {
      "your_custom_field": "test_value"
    }
  }'
```

## 🏢 **Method 2: Adding Template-Based Policies**

### **Step 1: Create Policy Template**
Add to `authz-orchestrator/internal/services/policy/templates.go`:

```go
func (m *Manager) GetTemplates() []*models.PolicyTemplate {
    return []*models.PolicyTemplate{
        // ... existing templates
        {
            Name:        "your-policy-template",
            Description: "Your custom policy description",
            Parameters: []models.TemplateParameter{
                {
                    Name:        "enabled",
                    Type:        "boolean",
                    Description: "Enable/disable this policy",
                    Required:    true,
                    Default:     false,
                },
                {
                    Name:        "threshold",
                    Type:        "number",
                    Description: "Policy threshold value",
                    Required:    false,
                    Default:     10,
                },
            },
            Schema: map[string]interface{}{
                "type": "object",
                "properties": map[string]interface{}{
                    "enabled": map[string]interface{}{
                        "type": "boolean",
                    },
                    "threshold": map[string]interface{}{
                        "type": "number",
                        "minimum": 0,
                    },
                },
            },
        },
    }
}
```

### **Step 2: Add to Web Demo Interface**
Update `web-demo/src/app/authz-orchestrator/page.tsx`:

```typescript
// Add to the decision request form
<div>
  <Label htmlFor="your-custom-field">Your Custom Field</Label>
  <Input
    id="your-custom-field"
    value={request.context.your_custom_field || ''}
    onChange={(e) => setRequest(prev => ({
      ...prev,
      context: { ...prev.context, your_custom_field: e.target.value }
    }))}
    placeholder="Enter custom value"
  />
</div>
```

## 📋 **Common Policy Examples**

### **1. Device Trust Policy**
```rego
# Check if device is trusted
device_trust_allow if {
    input.context.device.fingerprint in input.tenant_config.device_trust.trusted_devices
}

device_trust_allow if {
    input.context.device.certificate_valid
    input.tenant_config.device_trust.certificate_based
}
```

### **2. API Rate Limiting Policy**
```rego
# Check rate limits
rate_limit_allow if {
    input.context.rate_limit.current_requests < input.tenant_config.rate_limits.max_requests_per_hour
}
```

### **3. Data Classification Policy**
```rego
# Enhanced classification checks
classification_allow if {
    required_clearance := input.tenant_config.classifications[input.resource.classification].required_clearance
    input.subject.clearance_level >= required_clearance
}
```

### **4. Maintenance Window Policy**
```rego
# Block access during maintenance
maintenance_allow if {
    not maintenance_active
}

maintenance_active if {
    some window in input.tenant_config.maintenance_windows
    current_time >= window.start_time
    current_time <= window.end_time
}
```

## 🔧 **Context Data Available**

Your policies can access:

```json
{
  "input": {
    "structural_allowed": true,
    "subject": "user:alice@example.com",
    "action": "user.list",
    "resource": "user:collection",
    "tenant_config": {
      "working_hours": { ... },
      "assurance": { ... },
      "your_custom_policy": { ... }
    },
    "context": {
      "hour_utc": 14,
      "classification": "public",
      "session": { "aal": 1 },
      "request": {
        "ip": "192.168.1.1",
        "user_agent": "...",
        "headers": { ... }
      },
      "risk": { "level": "low" },
      "custom_fields": { ... }
    }
  }
}
```

## 🧪 **Testing New Policies**

### **1. Unit Test with OPA CLI**
```bash
# Install OPA CLI
go install github.com/open-policy-agent/opa@latest

# Test policy directly
opa eval -d policies/ -i test-input.json "data.authz.your_policy_allow"
```

### **2. Integration Test via API**
```bash
# Test through AuthZ Orchestrator
curl -X POST http://localhost:8080/decision \
  -H "Content-Type: application/json" \
  -d @test-decision-request.json
```

### **3. Web Demo Testing**
- Use the interactive form at `http://localhost:3000/authz-orchestrator`
- Add custom context fields
- See real-time policy evaluation results

## 📝 **Best Practices**

1. **Policy Naming**: Use descriptive names (`geolocation_allow`, `device_trust_allow`)
2. **Default Values**: Always provide sensible defaults (`default your_policy_allow := true`)
3. **Error Handling**: Include proper reason codes for denials
4. **Documentation**: Add comments explaining policy logic
5. **Testing**: Create comprehensive test cases for all scenarios
6. **Gradual Rollout**: Test with specific tenants before global deployment

## 🚀 **Deployment Process**

1. **Development**: Write and test policy locally
2. **Staging**: Deploy to staging environment with test tenants
3. **Validation**: Verify policy behavior matches expectations
4. **Production**: Update tenant configurations gradually
5. **Monitoring**: Watch logs and metrics for policy impact

This approach allows you to add any type of contextual authorization policy while maintaining the existing system's stability and extensibility.

## 📂 **File Structure for New Policies**

```
authz-orchestrator/
├── policies/
│   ├── authz.rego                    # Main policy orchestration
│   ├── your-new-policy.rego          # Your custom policy
│   └── ...
├── config/
│   ├── tenant-a.json                 # Updated with new policy config
│   ├── tenant-b.json
│   └── ...
├── internal/
│   ├── models/policy.go              # Updated with new config types
│   └── services/policy/templates.go   # Updated with new templates
└── web-demo/src/app/authz-orchestrator/
    └── page.tsx                      # Updated UI components
```

## 🔄 **Quick Checklist for Adding Policies**

- [ ] Create `.rego` policy file
- [ ] Integrate into main `authz.rego`
- [ ] Update Go models in `policy.go`
- [ ] Update tenant configuration files
- [ ] Add policy template (optional)
- [ ] Update web demo UI (optional)
- [ ] Write tests
- [ ] Deploy and monitor

## 💡 **Example: Complete Device Trust Policy Implementation**

### 1. Policy File (`device-trust.rego`)
```rego
package authz.device_trust

import rego.v1

default device_trust_allow := true

device_trust_allow if {
    not input.tenant_config.device_trust.enabled
}

device_trust_allow if {
    input.tenant_config.device_trust.enabled
    input.context.device.fingerprint in input.tenant_config.device_trust.trusted_devices
}

device_trust_reasons := ["untrusted_device"] if {
    not device_trust_allow
} else := []
```

### 2. Integration (`authz.rego`)
```rego
allow if {
    input.structural_allowed
    working_hours_allow
    action_window_allow
    clearance_allow
    assurance_allow
    device_trust_allow  # Add this
}
```

### 3. Configuration Schema (`policy.go`)
```go
type DeviceTrustConfig struct {
    Enabled        bool     `json:"enabled"`
    TrustedDevices []string `json:"trusted_devices"`
}
```

### 4. Tenant Config (`tenant-a.json`)
```json
{
  "active": {
    "device_trust": {
      "enabled": true,
      "trusted_devices": [
        "device_fingerprint_123",
        "device_fingerprint_456"
      ]
    }
  }
}
```

This provides a complete end-to-end example of policy development in the AuthZ Orchestrator system.