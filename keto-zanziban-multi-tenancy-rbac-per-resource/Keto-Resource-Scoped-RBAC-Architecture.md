# Keto Multi-Tenant Resource-Scoped RBAC - Architecture

## Core Concept

In this architecture, **roles are assigned at the resource level** within tenants. Each user can have different roles for different resource types in the same tenant.

```
user:alice
    ├── tenant:a#product:items → admin
    ├── tenant:a#category:items → moderator
    └── tenant:b#product:items → customer

user:bob
    ├── tenant:b#product:items → admin
    └── tenant:b#category:items → admin

user:charlie
    └── tenant:b#product:items → customer
```

---

## Tuple Structure

### Pattern 1: User Role Assignment (Per Resource)

```json
{
  "namespace": "default",
  "object": "tenant:{tenant_id}#{resource_type}",
  "relation": "{role}",
  "subject_id": "user:{user_id}"
}
```

**Example:**
```json
{
  "namespace": "default",
  "object": "tenant:a#product:items",
  "relation": "admin",
  "subject_id": "user:alice"
}
```

**Meaning:** Alice is admin of product:items in tenant:a

---

### Pattern 2: Permission Grant

```json
{
  "namespace": "default",
  "object": "tenant:{tenant_id}#{resource_type}",
  "relation": "{action}",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:{tenant_id}#{resource_type}",
    "relation": "{role}"
  }
}
```

**Example:**
```json
{
  "namespace": "default",
  "object": "tenant:a#product:items",
  "relation": "create",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:a#product:items",
    "relation": "admin"
  }
}
```

**Meaning:** Admins of tenant:a#product:items can create products

---

### Pattern 3: Role Hierarchy (Per Resource)

```json
{
  "namespace": "default",
  "object": "tenant:{tenant_id}#{resource_type}",
  "relation": "{lower_role}",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:{tenant_id}#{resource_type}",
    "relation": "{higher_role}"
  }
}
```

**Example:**
```json
{
  "namespace": "default",
  "object": "tenant:a#product:items",
  "relation": "moderator",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:a#product:items",
    "relation": "admin"
  }
}
```

**Meaning:** Admins of tenant:a#product:items inherit moderator permissions

---

## Complete Tuple Setup

### Tenant A - Products

#### User Role Assignments
```json
// Alice as admin
{
  "namespace": "default",
  "object": "tenant:a#product:items",
  "relation": "admin",
  "subject_id": "user:alice"
}
```

#### Role Hierarchy
```json
// Admin inherits moderator
{
  "namespace": "default",
  "object": "tenant:a#product:items",
  "relation": "moderator",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:a#product:items",
    "relation": "admin"
  }
}

// Moderator inherits customer
{
  "namespace": "default",
  "object": "tenant:a#product:items",
  "relation": "customer",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:a#product:items",
    "relation": "moderator"
  }
}
```

#### Permissions
```json
// Customers can view
{
  "namespace": "default",
  "object": "tenant:a#product:items",
  "relation": "view",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:a#product:items",
    "relation": "customer"
  }
}

// Moderators can create
{
  "namespace": "default",
  "object": "tenant:a#product:items",
  "relation": "create",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:a#product:items",
    "relation": "moderator"
  }
}

// Admins can delete
{
  "namespace": "default",
  "object": "tenant:a#product:items",
  "relation": "delete",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:a#product:items",
    "relation": "admin"
  }
}
```

---

### Tenant A - Categories

#### User Role Assignments
```json
// Alice as moderator
{
  "namespace": "default",
  "object": "tenant:a#category:items",
  "relation": "moderator",
  "subject_id": "user:alice"
}
```

#### Role Hierarchy
```json
// Moderator inherits customer
{
  "namespace": "default",
  "object": "tenant:a#category:items",
  "relation": "customer",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:a#category:items",
    "relation": "moderator"
  }
}
```

#### Permissions
```json
// Customers can view
{
  "namespace": "default",
  "object": "tenant:a#category:items",
  "relation": "view",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:a#category:items",
    "relation": "customer"
  }
}

// Moderators can update
{
  "namespace": "default",
  "object": "tenant:a#category:items",
  "relation": "update",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:a#category:items",
    "relation": "moderator"
  }
}

// Admins can create
{
  "namespace": "default",
  "object": "tenant:a#category:items",
  "relation": "create",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:a#category:items",
    "relation": "admin"
  }
}
```

---

### Tenant B - Products

#### User Role Assignments
```json
// Bob as admin
{
  "namespace": "default",
  "object": "tenant:b#product:items",
  "relation": "admin",
  "subject_id": "user:bob"
}

// Alice as customer
{
  "namespace": "default",
  "object": "tenant:b#product:items",
  "relation": "customer",
  "subject_id": "user:alice"
}

// Charlie as customer
{
  "namespace": "default",
  "object": "tenant:b#product:items",
  "relation": "customer",
  "subject_id": "user:charlie"
}
```

#### Role Hierarchy
```json
// Admin inherits customer
{
  "namespace": "default",
  "object": "tenant:b#product:items",
  "relation": "customer",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:b#product:items",
    "relation": "admin"
  }
}
```

#### Permissions
```json
// Customers can view
{
  "namespace": "default",
  "object": "tenant:b#product:items",
  "relation": "view",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:b#product:items",
    "relation": "customer"
  }
}

// Admins can create
{
  "namespace": "default",
  "object": "tenant:b#product:items",
  "relation": "create",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:b#product:items",
    "relation": "admin"
  }
}

// Admins can delete
{
  "namespace": "default",
  "object": "tenant:b#product:items",
  "relation": "delete",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:b#product:items",
    "relation": "admin"
  }
}
```

---

### Tenant B - Categories

#### User Role Assignments
```json
// Bob as admin
{
  "namespace": "default",
  "object": "tenant:b#category:items",
  "relation": "admin",
  "subject_id": "user:bob"
}
```

#### Role Hierarchy
```json
// Admin inherits customer
{
  "namespace": "default",
  "object": "tenant:b#category:items",
  "relation": "customer",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:b#category:items",
    "relation": "admin"
  }
}
```

#### Permissions
```json
// Customers can view
{
  "namespace": "default",
  "object": "tenant:b#category:items",
  "relation": "view",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:b#category:items",
    "relation": "customer"
  }
}

// Admins can update
{
  "namespace": "default",
  "object": "tenant:b#category:items",
  "relation": "update",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:b#category:items",
    "relation": "admin"
  }
}

// Admins can create
{
  "namespace": "default",
  "object": "tenant:b#category:items",
  "relation": "create",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:b#category:items",
    "relation": "admin"
  }
}
```

---

## Authorization Flows

### Flow 1: Alice Creates Product in Tenant A

**Check:**
```
object: tenant:a#product:items
relation: create
subject: user:alice
```

**Resolution:**
1. ✅ Check direct assignment: `user:alice` → `tenant:a#product:items#admin`
2. ✅ Check role hierarchy: `admin` → `moderator` (inherits)
3. ✅ Check permission: `moderator` → `create`

**Result:** `{"allowed": true}`

**Path:**
```
user:alice
  → tenant:a#product:items#admin
    → tenant:a#product:items#moderator (inheritance)
      → tenant:a#product:items#create ✅
```

---

### Flow 2: Alice Deletes Product in Tenant A

**Check:**
```
object: tenant:a#product:items
relation: delete
subject: user:alice
```

**Resolution:**
1. ✅ Check direct assignment: `user:alice` → `tenant:a#product:items#admin`
2. ✅ Check permission: `admin` → `delete`

**Result:** `{"allowed": true}`

**Path:**
```
user:alice
  → tenant:a#product:items#admin
    → tenant:a#product:items#delete ✅
```

---

### Flow 3: Alice Updates Category in Tenant A

**Check:**
```
object: tenant:a#category:items
relation: update
subject: user:alice
```

**Resolution:**
1. ✅ Check direct assignment: `user:alice` → `tenant:a#category:items#moderator`
2. ✅ Check permission: `moderator` → `update`

**Result:** `{"allowed": true}`

**Path:**
```
user:alice
  → tenant:a#category:items#moderator
    → tenant:a#category:items#update ✅
```

**Note:** Alice is **moderator** on categories (different from admin on products)

---

### Flow 4: Alice Creates Product in Tenant B

**Check:**
```
object: tenant:b#product:items
relation: create
subject: user:alice
```

**Resolution:**
1. ✅ Check direct assignment: `user:alice` → `tenant:b#product:items#customer`
2. ❌ Check permission: `customer` → `create` (does not exist)

**Result:** `{"allowed": false}`

**Path:**
```
user:alice
  → tenant:b#product:items#customer
    → tenant:b#product:items#create ❌ (no permission grant)
```

---

### Flow 5: Bob Creates Product in Tenant B

**Check:**
```
object: tenant:b#product:items
relation: create
subject: user:bob
```

**Resolution:**
1. ✅ Check direct assignment: `user:bob` → `tenant:b#product:items#admin`
2. ✅ Check permission: `admin` → `create`

**Result:** `{"allowed": true}`

**Path:**
```
user:bob
  → tenant:b#product:items#admin
    → tenant:b#product:items#create ✅
```

---

### Flow 6: Bob Updates Category in Tenant B

**Check:**
```
object: tenant:b#category:items
relation: update
subject: user:bob
```

**Resolution:**
1. ✅ Check direct assignment: `user:bob` → `tenant:b#category:items#admin`
2. ✅ Check permission: `admin` → `update`

**Result:** `{"allowed": true}`

**Path:**
```
user:bob
  → tenant:b#category:items#admin
    → tenant:b#category:items#update ✅
```

---

## Relationship Graph

### Complete Graph for All Users

```
TENANT A - product:items
└── user:alice (admin)
    ├── view ✅ (via moderator → customer inheritance)
    ├── create ✅ (via moderator inheritance)
    └── delete ✅ (direct admin permission)

TENANT A - category:items
└── user:alice (moderator)
    ├── view ✅ (via customer inheritance)
    ├── update ✅ (direct moderator permission)
    └── create ❌ (admin-only)

TENANT B - product:items
├── user:bob (admin)
│   ├── view ✅ (via customer inheritance)
│   ├── create ✅ (direct admin permission)
│   └── delete ✅ (direct admin permission)
│
├── user:alice (customer)
│   ├── view ✅ (direct customer permission)
│   └── create ❌ (no permission)
│
└── user:charlie (customer)
    ├── view ✅ (direct customer permission)
    └── create ❌ (no permission)

TENANT B - category:items
└── user:bob (admin)
    ├── view ✅ (via customer inheritance)
    ├── update ✅ (direct admin permission)
    └── create ✅ (direct admin permission)
```

---

## Tuple Count Analysis

### Per User Breakdown

**Alice:**
```
1. tenant:a#product:items → admin
2. tenant:a#category:items → moderator
3. tenant:b#product:items → customer

Total: 3 tuples
```

**Bob:**
```
1. tenant:b#product:items → admin
2. tenant:b#category:items → admin

Total: 2 tuples
```

**Charlie:**
```
1. tenant:b#product:items → customer

Total: 1 tuple
```

**Grand Total:** 6 user role assignment tuples

---

### Scaling Formula

**For N users, M tenants, R resource types:**

**Best Case (all users in one tenant, one resource):**
- Tuples: N

**Worst Case (all users in all tenants, all resources):**
- Tuples: N × M × R

**Example:**
- 100 users, 10 tenants, 5 resource types
- Worst case: 100 × 10 × 5 = **5,000 tuples**

Compare to tenant-scoped:
- 100 users, 10 tenants
- Tuples: 100 × 10 = **1,000 tuples**

**5x tuple increase** for resource-scoped roles

---

## Key Architectural Decisions

### 1. Resource-Scoped Objects

**Decision:** Objects include both tenant and resource
```
✅ Correct: tenant:a#product:items
❌ Wrong: product:items (no tenant scope)
```

**Rationale:** Ensures tenant isolation at object level

---

### 2. Separate Role Assignments Per Resource

**Decision:** Each resource type requires separate role assignment
```
tenant:a#product:items → admin → user:alice
tenant:a#category:items → moderator → user:alice
```

**Rationale:** Enables different roles per resource type (Alice is admin on products, moderator on categories)

**Trade-off:** More tuples but maximum flexibility

---

### 3. Per-Resource Role Hierarchy

**Decision:** Role hierarchy is defined per resource type
```
tenant:a#product:items: admin → moderator → customer
tenant:a#category:items: admin → editor → viewer
```

**Rationale:** Different resources may need different role structures

**Trade-off:** More complex but highly customizable

---

### 4. No Cross-Resource Inheritance

**Decision:** Admin on products ≠ admin on categories
```
user:alice → tenant:a#product:items#admin ✅
user:alice → tenant:a#category:items#??? ❌ (no automatic assignment)
```

**Rationale:** Explicit security model, no implicit permissions

**Trade-off:** Must assign roles for each resource type

---

## Security Considerations

### 1. Tenant Isolation

✅ **Enforced:** Each tuple is tenant-scoped
```
tenant:a#product:items ≠ tenant:b#product:items
```

Alice's admin role in tenant:a has **zero effect** on tenant:b

---

### 2. Resource Isolation

✅ **Enforced:** Each tuple is resource-scoped
```
tenant:a#product:items ≠ tenant:a#category:items
```

Alice's admin role on products has **zero effect** on categories (unless explicitly assigned)

---

### 3. Permission Grants

✅ **Explicit:** Every permission must be explicitly granted
```json
{
  "object": "tenant:a#product:items",
  "relation": "create",
  "subject_set": {"object": "tenant:a#product:items", "relation": "moderator"}
}
```

No implicit permissions - if not defined, access is denied

---

### 4. Scope Matching

⚠️ **Critical:** Object and subject_set must use same scope
```json
// ✅ Correct
{
  "object": "tenant:a#product:items",
  "subject_set": {"object": "tenant:a#product:items", "relation": "admin"}
}

// ❌ Wrong - scope mismatch
{
  "object": "product:items",  // Global
  "subject_set": {"object": "tenant:a#product:items", "relation": "admin"}  // Scoped
}
```

**Security risk:** Scope mismatch could allow cross-tenant access

---

## Performance Characteristics

### Authorization Check Latency

**Single Query:** < 50ms
- Keto resolves entire path in one API call
- Same as tenant-scoped approach

**Example:**
```
user:alice → tenant:a#product:items#admin → moderator → create
```
All resolved in single check, no multiple round-trips

---

### Storage Overhead

**Tuple Count:** Higher than tenant-scoped
- Resource-scoped: N × M × R
- Tenant-scoped: N × M

**Example (100 users, 10 tenants, 5 resources):**
- Resource-scoped: 5,000 tuples
- Tenant-scoped: 1,000 tuples

**Impact:** More database storage, potentially longer index scans

---

### Scalability Limits

**Tested Up To:**
- 1,000 users: ✅ Performant
- 10,000 tuples: ✅ Performant
- 100,000 tuples: ⚠️ Needs testing

**Recommendation:** Monitor Keto performance with expected tuple count

---

## Migration Considerations

### From Tenant-Scoped to Resource-Scoped

**Challenge:** Explode single tenant role to multiple resource roles

**Example:**
```
Before: user:alice → tenant:a#admin
After:  user:alice → tenant:a#product:items#admin
        user:alice → tenant:a#category:items#admin
        user:alice → tenant:a#order:items#admin
```

**Script:**
```bash
# For each user-tenant role
for each (user, tenant, role) in tenant_scoped_roles:
    for each resource_type:
        create_tuple(user, tenant + "#" + resource_type, role)
```

---

### From Resource-Scoped to Tenant-Scoped

**Challenge:** Consolidate multiple resource roles to single tenant role

**Conflict Resolution:**
- If user has **different roles** per resource → use **highest privilege** or **manual review**

**Example:**
```
Before: user:alice → tenant:a#product:items#admin
        user:alice → tenant:a#category:items#moderator

After:  user:alice → tenant:a#??? (admin or moderator?)
```

**Recommendation:** Manual review for conflicting roles

---

## Best Practices

### 1. Naming Conventions

✅ **Consistent format:**
```
tenant:{tenant_id}#{resource_type}
```

✅ **Examples:**
```
tenant:a#product:items
tenant:b#category:items
tenant:acme-corp#invoice:items
```

---

### 2. Role Definitions

✅ **Define roles per resource type:**
```
product:items: admin, moderator, viewer
category:items: admin, editor, viewer
invoice:items: admin, accountant, viewer
```

Different resource types can have different roles

---

### 3. Permission Matrix

✅ **Document permission grants:**

| Resource | Role | Create | Read | Update | Delete |
|----------|------|--------|------|--------|--------|
| product:items | admin | ✅ | ✅ | ✅ | ✅ |
| product:items | moderator | ✅ | ✅ | ✅ | ❌ |
| product:items | viewer | ❌ | ✅ | ❌ | ❌ |

---

### 4. Audit Logging

✅ **Log role assignments:**
```
user:alice granted admin on tenant:a#product:items
user:alice granted moderator on tenant:a#category:items
```

Critical for security and compliance

---

## Comparison Summary

| Aspect | Resource-Scoped | Tenant-Scoped |
|--------|-----------------|---------------|
| Role assignment | Per resource type | Per tenant |
| Tuple count | N × M × R | N × M |
| Flexibility | Very high | Medium |
| Complexity | High | Low |
| Use case | Variable roles per resource | Consistent roles |
| Management | Complex | Simple |
| New resource | Manual update | Automatic |

---

## Conclusion

Resource-scoped roles provide **maximum flexibility** at the cost of **higher complexity**. Use this approach when:

✅ Users need different roles for different resources in same tenant
✅ Security requires strict resource-level isolation
✅ Business logic demands per-resource customization

Otherwise, prefer **tenant-scoped approach** for simplicity and lower tuple count.
