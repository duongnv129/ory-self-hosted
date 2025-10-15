# 👤 User Permissions Guide - AuthZ Orchestrator

## Overview

This document explains user permissions in the **authz-orchestrator** namespace, demonstrating how **hybrid authorization** works with both structural permissions (Keto) and contextual policies (OPA).

## 🎭 User Roles & Permissions Matrix

### Current User Setup

| User | Role | Structural Permissions | Contextual Restrictions |
|------|------|----------------------|------------------------|
| **Alice** | `admin` | Full access (list, create, edit, delete on users, products & categories) | 24/7 override privileges |
| **Bob** | `moderator` | Limited access (list users, list/edit categories) | Working hours only (9-17 UTC) |

---

## 👨‍💼 Bob (Moderator) - Detailed Permissions

### 🔑 **Role Assignment**
```json
{
  "namespace": "authz-orchestrator",
  "object": "role:moderator", 
  "relation": "member",
  "subject_id": "user:bob@example.com"
}
```

### 📋 **Structural Permissions (Keto)**

#### ✅ **What Bob CAN Do**
- **List Users**: `user:collection` → `list` relation
  ```bash
  curl -G "http://localhost:4466/relation-tuples/check" \
    --data-urlencode "namespace=authz-orchestrator" \
    --data-urlencode "object=user:collection" \
    --data-urlencode "relation=list" \
    --data-urlencode "subject_id=user:bob@example.com"
  # Response: {"allowed": true}
  ```

- **List Categories**: `category:collection` → `list` relation
  ```bash
  curl -G "http://localhost:4466/relation-tuples/check" \
    --data-urlencode "namespace=authz-orchestrator" \
    --data-urlencode "object=category:collection" \
    --data-urlencode "relation=list" \
    --data-urlencode "subject_id=user:bob@example.com"
  # Response: {"allowed": true}
  ```

- **Edit Categories**: `category:collection` → `edit` relation
  ```bash
  curl -G "http://localhost:4466/relation-tuples/check" \
    --data-urlencode "namespace=authz-orchestrator" \
    --data-urlencode "object=category:collection" \
    --data-urlencode "relation=edit" \
    --data-urlencode "subject_id=user:bob@example.com"
  # Response: {"allowed": true}
  ```

#### ❌ **What Bob CANNOT Do**
- **Delete Users**: No `delete` relation on `user:collection`
- **Product Operations**: No permissions on `product:collection`
- **Create Categories**: No `create` relation on `category:collection`
- **Delete Categories**: No `delete` relation on `category:collection`
- **Admin Functions**: No access to admin-only resources

### ⏰ **Contextual Restrictions (OPA Policies)**

#### **Working Hours Policy**
- **Allowed**: Monday-Friday, 9:00-17:00 UTC
- **Denied**: Weekends, nights, holidays
- **Override**: Bob is NOT in override list (unlike Alice)

#### **Authentication Assurance**
- **Required AAL**: 1 (password authentication)
- **Step-up**: Not required for list operations
- **Session**: Must have valid authentication token

---

## 🧪 **Test Scenarios for Bob**

### ✅ **Scenario 1: Valid Access (Success)**
```bash
# Bob accessing during work hours
curl -X POST http://localhost:8080/decision \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "user:bob@example.com",
    "action": "user.list",
    "resource": "user:collection",
    "tenant": "tenant-a",
    "context": {
      "hour_utc": 14,
      "classification": "public", 
      "session": {"aal": 1}
    }
  }'

# Expected Response:
{
  "state": "ALLOW",
  "structural": {"allowed": true},
  "reasons": [],
  "required_aal": 1,
  "session_aal": 1
}
```

### ❌ **Scenario 2: Working Hours Violation**
```bash
# Bob accessing outside work hours (8 PM)
curl -X POST http://localhost:8080/decision \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "user:bob@example.com",
    "action": "user.list", 
    "resource": "user:collection",
    "tenant": "tenant-a",
    "context": {
      "hour_utc": 20,
      "classification": "public",
      "session": {"aal": 1}
    }
  }'

# Expected Response:
{
  "state": "DENY",
  "structural": {"allowed": true},
  "reasons": ["working_hours_violation"],
  "required_aal": 1,
  "session_aal": 1
}
```

### ❌ **Scenario 3: Insufficient Permissions**
```bash
# Bob trying to delete users (no structural permission)
curl -X POST http://localhost:8080/decision \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "user:bob@example.com",
    "action": "user.delete",
    "resource": "user:collection", 
    "tenant": "tenant-a",
    "context": {
      "hour_utc": 14,
      "classification": "public",
      "session": {"aal": 1}
    }
  }'

# Expected Response:
{
  "state": "DENY",
  "structural": {"allowed": false},
  "reasons": ["structural_denied"],
  "required_relations": ["delete"]
}
```

### ✅ **Scenario 4: Category Management (Success)**
```bash
# Bob editing categories during work hours
curl -X POST http://localhost:8080/decision \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "user:bob@example.com",
    "action": "category.edit",
    "resource": "category:collection",
    "tenant": "tenant-a",
    "context": {
      "hour_utc": 14,
      "classification": "public",
      "session": {"aal": 1}
    }
  }'

# Expected Response:
{
  "state": "ALLOW",
  "structural": {"allowed": true},
  "reasons": [],
  "required_aal": 1,
  "session_aal": 1
}
```

### ❌ **Scenario 5: Category Creation Denied**
```bash
# Bob trying to create categories (no structural permission)
curl -X POST http://localhost:8080/decision \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "user:bob@example.com",
    "action": "category.create",
    "resource": "category:collection",
    "tenant": "tenant-a",
    "context": {
      "hour_utc": 14,
      "classification": "public",
      "session": {"aal": 1}
    }
  }'

# Expected Response:
{
  "state": "DENY",
  "structural": {"allowed": false},
  "reasons": ["structural_denied"],
  "required_relations": ["create"]
}
```

---

## 🔧 **Management Commands**

### **Check Bob's Current Permissions**

#### **List All Relations for Bob**
```bash
curl -s "http://localhost:4466/relation-tuples?namespace=authz-orchestrator" | \
  jq '.relation_tuples[] | select(.subject_id == "user:bob@example.com" or (.subject_set and .subject_set.object == "role:moderator"))'
```

#### **Verify Specific Permission**
```bash
# Check if Bob can list users
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=authz-orchestrator" \
  --data-urlencode "object=user:collection" \
  --data-urlencode "relation=list" \
  --data-urlencode "subject_id=user:bob@example.com"
```

#### **Expand Role Hierarchy**
```bash
# See all permissions Bob inherits through moderator role
curl -G "http://localhost:4466/relation-tuples/expand" \
  --data-urlencode "namespace=authz-orchestrator" \
  --data-urlencode "object=role:moderator" \
  --data-urlencode "relation=member" \
  --data-urlencode "max-depth=3" | jq .
```

### **Grant Additional Permissions to Bob**

#### **Add Product List Permission**
```bash
curl -X PUT "http://localhost:4467/admin/relation-tuples" \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "authz-orchestrator",
    "object": "product:collection",
    "relation": "list",
    "subject_set": {
      "namespace": "authz-orchestrator", 
      "object": "role:moderator",
      "relation": "member"
    }
  }'
```

#### **Add User Create Permission** 
```bash
curl -X PUT "http://localhost:4467/admin/relation-tuples" \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "authz-orchestrator",
    "object": "user:collection",
    "relation": "create",
    "subject_set": {
      "namespace": "authz-orchestrator",
      "object": "role:moderator", 
      "relation": "member"
    }
  }'
```

#### **Add Category Create Permission to Moderators**
```bash
curl -X PUT "http://localhost:4467/admin/relation-tuples" \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "authz-orchestrator",
    "object": "category:collection",
    "relation": "create",
    "subject_set": {
      "namespace": "authz-orchestrator",
      "object": "role:moderator",
      "relation": "member"
    }
  }'
```

#### **Remove Category Edit Permission from Moderators**
```bash
curl -X DELETE "http://localhost:4467/admin/relation-tuples" \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "authz-orchestrator",
    "object": "category:collection",
    "relation": "edit",
    "subject_set": {
      "namespace": "authz-orchestrator",
      "object": "role:moderator",
      "relation": "member"
    }
  }'
```

### **Modify Contextual Policies**

#### **Add Bob to Working Hours Override**
Edit tenant configuration file:
```json
{
  "tenant_id": "tenant-a",
  "active": {
    "working_hours": {
      "blocks": [
        {"days": ["MON","TUE","WED","THU","FRI"], "start_hour": 9, "end_hour": 17}
      ],
      "override_subjects": [
        "user:alice@example.com",
        "user:bob@example.com"  // Add Bob here for 24/7 access
      ]
    }
  }
}
```

#### **Create Different Role with More Permissions**
```bash
# 1. Create senior-moderator role
curl -X PUT "http://localhost:4467/admin/relation-tuples" \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "authz-orchestrator",
    "object": "role:senior-moderator",
    "relation": "member", 
    "subject_id": "user:bob@example.com"
  }'

# 2. Grant delete permissions to senior-moderator
curl -X PUT "http://localhost:4467/admin/relation-tuples" \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "authz-orchestrator",
    "object": "user:collection",
    "relation": "delete",
    "subject_set": {
      "namespace": "authz-orchestrator",
      "object": "role:senior-moderator",
      "relation": "member"
    }
  }'
```

---

## 🔄 **Authorization Decision Flow**

### **How Bob's Access is Evaluated**

1. **Structural Check (Keto)**
   - Does Bob have required relation?
   - Check: `user:bob@example.com` → `role:moderator` → `permission`

2. **Contextual Policies (OPA)**
   - Working hours compliance?
   - Authentication assurance level?
   - Risk assessment passed?
   - Classification clearance?

3. **Final Decision**
   - **ALLOW**: Both structural AND contextual pass
   - **DENY**: Either structural OR contextual fails
   - **STEP_UP_REQUIRED**: Structural passes, AAL insufficient

### **Decision Matrix**

| Structural | Contextual | Result | Reason |
|-----------|-----------|---------|---------|
| ✅ Pass | ✅ Pass | **ALLOW** | Full access granted |
| ❌ Fail | ✅ Pass | **DENY** | `structural_denied` |
| ✅ Pass | ❌ Fail | **DENY** | Policy violation (e.g., `working_hours_violation`) |
| ❌ Fail | ❌ Fail | **DENY** | Multiple failures |

---

## 🎯 **Permission Comparison**

### **Bob vs Alice**

| Capability | Bob (Moderator) | Alice (Admin) |
|------------|----------------|---------------|
| **User List** | ✅ Working hours only | ✅ 24/7 access |
| **User Delete** | ❌ No permission | ✅ 24/7 access |
| **Product List** | ❌ No permission | ✅ 24/7 access |
| **Product Delete** | ❌ No permission | ✅ 24/7 access |
| **Category List** | ✅ Working hours only | ✅ 24/7 access |
| **Category Edit** | ✅ Working hours only | ✅ 24/7 access |
| **Category Create** | ❌ No permission | ✅ 24/7 access |
| **Category Delete** | ❌ No permission | ✅ 24/7 access |
| **Working Hours Override** | ❌ Restricted | ✅ Override enabled |
| **Step-up Auth** | Based on action | Based on action |

---

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **Bob Gets DENY During Work Hours**
```bash
# Check if structural permission exists
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=authz-orchestrator" \
  --data-urlencode "object=user:collection" \
  --data-urlencode "relation=list" \
  --data-urlencode "subject_id=user:bob@example.com"

# If false, add the permission:
curl -X PUT "http://localhost:4467/admin/relation-tuples" \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "authz-orchestrator",
    "object": "user:collection",
    "relation": "list",
    "subject_set": {
      "namespace": "authz-orchestrator",
      "object": "role:moderator",
      "relation": "member"
    }
  }'
```

#### **Bob Needs After-Hours Access**
```bash
# Option 1: Add to override list in tenant config
# Option 2: Promote to admin role
curl -X PUT "http://localhost:4467/admin/relation-tuples" \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "authz-orchestrator",
    "object": "role:admin",
    "relation": "member",
    "subject_id": "user:bob@example.com"
  }'
```

### **Debug Commands**
```bash
# View all permissions in namespace
curl -s "http://localhost:4466/relation-tuples?namespace=authz-orchestrator" | jq .

# Test specific authorization scenarios
curl -X POST http://localhost:8080/decision \
  -H "Content-Type: application/json" \
  -d '{...}' | jq .

# Check OPA policy evaluation
curl -X POST http://localhost:8181/v1/data/authz/decision \
  -H "Content-Type: application/json" \
  -d '{"input": {...}}' | jq .
```

---

## 📚 **Related Documentation**

- [AuthZ Orchestrator README](../README.md)
- [Policy Development Guide](../POLICY_DEVELOPMENT_GUIDE.md)
- [Keto Relation Tuples Guide](../../keto/README.md)
- [OPA Policy Reference](../policies/README.md)

This guide demonstrates the power of **hybrid authorization** - combining **structural permissions** with **contextual business rules** for enterprise-grade access control! 🔐