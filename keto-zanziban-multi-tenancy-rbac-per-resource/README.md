# Multi-Tenancy RBAC - Resource-Scoped Roles

## Overview

This approach models **resource-scoped roles** where users are assigned different roles per resource type within tenants. Unlike tenant-scoped roles (where a user has one role for all resources), this allows fine-grained control at the resource level.

## Hierarchy Model

```
user:alice → tenant:a → product:items → as admin(product:items) (create, delete permission)
user:alice → tenant:a → category:items → as admin(category:items) (create, update permission)
user:alice → tenant:b → product:items → as customer(product:items) (view permission)
user:bob → tenant:a → product:items → as moderator(product:items) (create permission)
user:charlie → tenant:b → product:items → as customer(product:items) (view permission)
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
    │   ├── create permission ✅
    │   └── delete permission ✅
    │
    ├── tenant:a#category:items (role: admin)
    │   ├── create permission ✅
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
- **product:items**: admin (can create, delete)
- **category:items**: admin (can create, update)

**Tenant B:**
- **product:items**: customer (can view only)

### Bob - Single-Tenant User

**Tenant A:**
- **product:items**: moderator (can create)

### Charlie - Single-Tenant User

**Tenant B:**
- **product:items**: customer (can view only)

---

## Permission Matrix

### Tenant A

| User | Resource | Role | View | Create | Update | Delete |
|------|----------|------|------|--------|--------|--------|
| **Alice** | product:items | admin | - | ✅ | - | ✅ |
| **Alice** | category:items | admin | - | ✅ | ✅ | - |
| **Bob** | product:items | moderator | - | ✅ | - | ❌ |

### Tenant B

| User | Resource | Role | View | Create | Update | Delete |
|------|----------|------|------|--------|--------|--------|
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
- **ARCHITECTURE.md** - Detailed tuple structure and authorization flows
- **ALICE_HIERARCHY.md** - Visual diagrams of Alice's authorization graph
- **COMPARISON.md** - Side-by-side comparison with tenant-scoped approach
- **test-resource-scoped.sh** - Automated test suite
- **IMPLEMENTATION.md** - Step-by-step implementation guide

---

## Quick Start

### 1. Review Architecture
```bash
cat ARCHITECTURE.md
```

### 2. Understand Alice's Hierarchy
```bash
cat ALICE_HIERARCHY.md
```

### 3. Run Tests
```bash
./test-resource-scoped.sh
```

### 4. Compare Approaches
```bash
cat COMPARISON.md
```

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

### Alice creates category in Tenant A
```bash
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=default" \
  --data-urlencode "object=tenant:a#category:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:alice"
# Result: {"allowed": true} - via admin role (separate assignment)
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

1. **Review Architecture**: Read `ARCHITECTURE.md` for detailed tuple structure
2. **Study Visual Diagrams**: Check `ALICE_HIERARCHY.md` for authorization graphs
3. **Run Tests**: Execute `./test-resource-scoped.sh` to verify implementation
4. **Compare Approaches**: Read `COMPARISON.md` to choose the right approach
5. **Implement**: Follow `IMPLEMENTATION.md` for step-by-step setup

---

## Related Documentation

- **Tenant-Scoped Approach**: `/keto-zanzibar-multi-tenancy-rbac/`
- **Simple RBAC**: `/keto-zanziban-simple-rbac/`
- **Ory Keto Docs**: https://www.ory.sh/keto/docs/
