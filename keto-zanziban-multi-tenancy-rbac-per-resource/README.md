# Keto Multi-Tenant Resource-Scoped RBAC

## Overview

This approach models **resource-scoped roles** where users are assigned different roles per resource type within tenants. Unlike tenant-scoped roles (where a user has one role for all resources), this allows fine-grained control at the resource level.

## Hierarchy Model

```
user:alice → tenant:a → product:items → as admin(product:items)
user:alice → tenant:a → category:items → as moderator(category:items)
user:alice → tenant:b → product:items → as customer(product:items)

user:bob → tenant:b → product:items → as admin(product:items)
user:bob → tenant:b → category:items → as admin(category:items)

user:charlie → tenant:b → product:items → as customer(product:items)
```

### Role Hierarchy

#### **Tenant A** (3-tier hierarchy per resource)

**Products:**
```
admin (highest privileges)
  ├─ Inherits all moderator permissions
  └─ Additional: delete products

moderator (middle privileges)
  ├─ Inherits all customer permissions
  └─ Additional: create products

customer (base privileges)
  └─ View products only
```

**Categories:**
```
admin (highest privileges)
  └─ Additional: create categories

moderator (middle privileges)
  ├─ Inherits all customer permissions
  └─ Additional: update categories

customer (base privileges)
  └─ View categories only
```

#### **Tenant B** (2-tier hierarchy per resource)

**Products:**
```
admin (highest privileges)
  ├─ Inherits all customer permissions
  └─ Additional: create/delete products

customer (base privileges)
  └─ View products only
```

**Categories:**
```
admin (highest privileges)
  ├─ Inherits all customer permissions
  └─ Additional: create/update categories

customer (base privileges)
  └─ View categories only
```

## Key Characteristics

### Resource-Scoped Roles
- Users have **separate role assignments** for each resource type
- Alice can be **admin for products** but **moderator for categories** in the same tenant
- Maximum flexibility but higher complexity

### Tenant Isolation
- Complete isolation between tenants
- Alice's admin role on `tenant:a#product:items` has **no effect** on `tenant:b#product:items`

### Fine-Grained Control
- Different permissions per resource type
- Example: Alice can delete products but only update categories

---

## Architecture

### Relationship Structure

```
user:alice
    ├── tenant:a#product:items (role: admin)
    │   ├── view permission ✅
    │   ├── create permission ✅
    │   └── delete permission ✅
    │
    ├── tenant:a#category:items (role: moderator)
    │   ├── view permission ✅
    │   └── update permission ✅
    │
    └── tenant:b#product:items (role: customer)
        └── view permission ✅
```

### Tuple Pattern

```json
// User role assignment per resource
{
  "namespace": "default",
  "object": "tenant:{tenant_id}#{resource_type}",
  "relation": "{role}",
  "subject_id": "user:{user_id}"
}

// Permission grant
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

---

## User Assignments

### Alice - Multi-Tenant, Multi-Resource User

**Tenant A:**
- **product:items**: admin (can view, create, delete)
- **category:items**: moderator (can view, update - NOT create)

**Tenant B:**
- **product:items**: customer (can view only)

### Bob - Single-Tenant User

**Tenant B:**
- **product:items**: admin (can view, create, delete)
- **category:items**: admin (can view, create, update)

### Charlie - Single-Tenant User

**Tenant B:**
- **product:items**: customer (can view only)

---

## Permission Matrix

### Tenant A

| User | Resource | Role | View | Create | Update | Delete |
|------|----------|------|------|--------|--------|--------|
| **Alice** | product:items | admin | ✅ | ✅ | - | ✅ |
| **Alice** | category:items | moderator | ✅ | ❌ | ✅ | - |

### Tenant B

| User | Resource | Role | View | Create | Update | Delete |
|------|----------|------|------|--------|--------|--------|
| **Bob** | product:items | admin | ✅ | ✅ | - | ✅ |
| **Bob** | category:items | admin | ✅ | ✅ | ✅ | - |
| **Alice** | product:items | customer | ✅ | ❌ | - | ❌ |
| **Charlie** | product:items | customer | ✅ | ❌ | - | ❌ |

---

## Advantages

✅ **Fine-Grained Control**: Different roles per resource type within same tenant
✅ **Resource Isolation**: Admin on products ≠ admin on categories
✅ **Flexible Policies**: Each resource type can have custom role definitions
✅ **Precise Permissions**: Alice can delete products but only update categories

---

## Disadvantages

❌ **Tuple Explosion**: N × M × R tuples (users × tenants × resources)
❌ **Management Complexity**: Must assign role for each resource type
❌ **New Resource Overhead**: Adding resource type requires updating all user assignments
❌ **Consistency Risk**: Easy to miss resource type when onboarding users

---

## When to Use This Approach

### ✅ Use Resource-Scoped Roles When:
- Users need **different permission levels** for different resource types
- Example: Alice is admin for products, moderator for categories, viewer for invoices
- Security requires **strict resource-level isolation**
- Business logic demands **per-resource role customization**

### ❌ Don't Use When:
- Users have **consistent roles** across all resources (use tenant-scoped instead)
- Managing **hundreds of resource types** (tuple explosion)
- Need **simple user onboarding** (one role assignment vs many)

---

## Comparison with Tenant-Scoped Approach

| Aspect | Resource-Scoped (This) | Tenant-Scoped |
|--------|------------------------|---------------|
| **Granularity** | Per resource type | Per tenant (all resources) |
| **Tuples per user** | N (N = resource types × tenants) | M (M = tenants) |
| **Role assignment** | Separate for each resource | Single per tenant |
| **New resource type** | Must update all users | Automatic inheritance |
| **Use case** | Variable roles per resource | Consistent roles |
| **Complexity** | High | Low |

---

## Files in This Documentation

- **README.md** - This overview
- **Keto-Resource-Scoped-RBAC-Architecture.md** - Detailed tuple structure and authorization flows
- **Keto-Resource-Scoped-RBAC-Alice-Hierarchy.md** - Visual diagrams of Alice's authorization graph
- **Keto-Resource-Scoped-RBAC-Test-Cases.md** - Comprehensive test cases and validation
- **Keto-Resource-Scoped-RBAC-Test.sh** - Automated test suite
- **Keto-Resource-Scoped-RBAC.postman_collection.json** - Postman collection for testing
- **Keto-Resource-Scoped-RBAC.postman_environment.json** - Postman environment variables

---

## Quick Start

### 1. Review Architecture
```bash
cat Keto-Resource-Scoped-RBAC-Architecture.md
```

### 2. Understand Alice's Hierarchy
```bash
cat Keto-Resource-Scoped-RBAC-Alice-Hierarchy.md
```

### 3. Run Tests
```bash
./Keto-Resource-Scoped-RBAC-Test.sh
```

### 4. Review Test Cases
```bash
cat Keto-Resource-Scoped-RBAC-Test-Cases.md
```

### 5. Test with Postman
- Import `Keto-Resource-Scoped-RBAC.postman_collection.json`
- Import `Keto-Resource-Scoped-RBAC.postman_environment.json`
- Run the Setup folder, then run the test folders

---

## Example Scenario

**Business Requirement:**
> Alice should be able to manage products (full admin) but only moderate categories (update, not create) in Tenant A.

### Resource-Scoped Solution (This Approach) ✅
```json
// Alice as admin for products
{"object": "tenant:a#product:items", "relation": "admin", "subject_id": "user:alice"}

// Alice as moderator for categories
{"object": "tenant:a#category:items", "relation": "moderator", "subject_id": "user:alice"}
```

### Tenant-Scoped Solution ❌
```
Not possible - Alice has one role for all resources
Would need to make her admin (too much access) or moderator (not enough for products)
```

**Conclusion:** Resource-scoped approach is **required** for this use case.

---

## Authorization Examples

### Alice creates product in Tenant A
```bash
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=default" \
  --data-urlencode "object=tenant:a#product:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:alice"
# Result: {"allowed": true} - via admin role
```

### Alice updates category in Tenant A
```bash
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=default" \
  --data-urlencode "object=tenant:a#category:items" \
  --data-urlencode "relation=update" \
  --data-urlencode "subject_id=user:alice"
# Result: {"allowed": true} - via moderator role (separate assignment)
```

### Alice creates category in Tenant A (DENIED)
```bash
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=default" \
  --data-urlencode "object=tenant:a#category:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:alice"
# Result: {"allowed": false} - Alice is moderator, not admin (create is admin-only)
```

### Alice creates product in Tenant B
```bash
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=default" \
  --data-urlencode "object=tenant:b#product:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:alice"
# Result: {"allowed": false} - customer role has no create permission
```

---

## Next Steps

1. **Review Architecture**: Read `Keto-Resource-Scoped-RBAC-Architecture.md` for detailed tuple structure
2. **Study Visual Diagrams**: Check `Keto-Resource-Scoped-RBAC-Alice-Hierarchy.md` for authorization graphs
3. **Review Test Cases**: Read `Keto-Resource-Scoped-RBAC-Test-Cases.md` for comprehensive testing scenarios
4. **Run Tests**: Execute `./Keto-Resource-Scoped-RBAC-Test.sh` to verify implementation
5. **Test with Postman**: Import the Postman collection and environment to run interactive tests

---

## Related Documentation

- **Tenant-Scoped Approach**: `/keto-zanzibar-multi-tenancy-rbac/`
- **Simple RBAC**: `/keto-zanziban-simple-rbac/`
- **Ory Keto Docs**: https://www.ory.sh/keto/docs/
