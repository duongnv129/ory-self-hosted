# Alice's Authorization Hierarchy

## Overview

Alice is a **multi-tenant user** with different roles in different tenants:
- **Tenant A**: Admin (highest privileges)
- **Tenant B**: Customer (view-only privileges)

---

## Direct Role Assignments

```json
{
  "namespace": "tenant-rbac",
  "object": "tenant:a",
  "relation": "admin",
  "subject_id": "user:alice"
}

{
  "namespace": "tenant-rbac",
  "object": "tenant:b",
  "relation": "customer",
  "subject_id": "user:alice"
}
```

---

## Tenant A Hierarchy (Alice as Admin)

### Relationship Chain

```
user:alice
    ↓ (direct assignment)
tenant:a#admin
    ↓ (inherits via subject_set)
tenant:a#moderator
    ↓ (inherits via subject_set)
tenant:a#customer
    ↓ (grants permissions)
tenant:a#product:items (view, create, delete)
tenant:a#category:items (view, update, create)
```

### Inherited Permissions

Because Alice is `admin` in Tenant A, she inherits:

1. **Admin permissions** (direct):
   - `tenant:a#product:items → delete`
   - `tenant:a#category:items → create`

2. **Moderator permissions** (via admin → moderator):
   - `tenant:a#product:items → create`
   - `tenant:a#category:items → update`

3. **Customer permissions** (via moderator → customer):
   - `tenant:a#product:items → view`
   - `tenant:a#category:items → view`

### Permission Matrix (Tenant A)

| Resource | View | Create | Update | Delete |
|----------|------|--------|--------|--------|
| **Products** | ✅ (via customer) | ✅ (via moderator) | - | ✅ (via admin) |
| **Categories** | ✅ (via customer) | ✅ (via admin) | ✅ (via moderator) | - |

**Result**: Alice has **FULL CONTROL** over all resources in Tenant A

---

## Tenant B Hierarchy (Alice as Customer)

### Relationship Chain

```
user:alice
    ↓ (direct assignment)
tenant:b#customer
    ↓ (grants permissions)
tenant:b#product:items (view only)
tenant:b#category:items (view only)
```

### Permissions

Because Alice is `customer` in Tenant B, she has:

1. **Customer permissions** (direct):
   - `tenant:b#product:items → view`
   - `tenant:b#category:items → view`

2. **NO admin permissions**:
   - ❌ Cannot create products (admin-only in Tenant B)
   - ❌ Cannot delete products (admin-only in Tenant B)
   - ❌ Cannot update categories (admin-only in Tenant B)
   - ❌ Cannot create categories (admin-only in Tenant B)

### Permission Matrix (Tenant B)

| Resource | View | Create | Update | Delete |
|----------|------|--------|--------|--------|
| **Products** | ✅ (via customer) | ❌ | - | ❌ |
| **Categories** | ✅ (via customer) | ❌ | ❌ | - |

**Result**: Alice has **READ-ONLY** access in Tenant B

---

## Authorization Flow Examples

### Example 1: Alice creates product in Tenant A

**Request:**
```bash
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "object=tenant:a#product:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:alice"
```

**Keto Resolution Path:**
1. Check: `user:alice` → `tenant:a#admin` ✅ (direct assignment)
2. Check: `tenant:a#admin` → `tenant:a#moderator` ✅ (role hierarchy)
3. Check: `tenant:a#moderator` → `tenant:a#product:items#create` ✅ (permission grant)

**Result:** `{"allowed": true}`

---

### Example 2: Alice creates product in Tenant B

**Request:**
```bash
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "object=tenant:b#product:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:alice"
```

**Keto Resolution Path:**
1. Check: `user:alice` → `tenant:b#customer` ✅ (direct assignment)
2. Check: `tenant:b#customer` → `tenant:b#product:items#create` ❌ (no permission grant)

**Result:** `{"allowed": false}`

---

### Example 3: Alice views product in Tenant B

**Request:**
```bash
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "object=tenant:b#product:items" \
  --data-urlencode "relation=view" \
  --data-urlencode "subject_id=user:alice"
```

**Keto Resolution Path:**
1. Check: `user:alice` → `tenant:b#customer` ✅ (direct assignment)
2. Check: `tenant:b#customer` → `tenant:b#product:items#view` ✅ (permission grant)

**Result:** `{"allowed": true}`

---

## Visual Hierarchy Diagram

### Complete Alice Authorization Graph

```
                    user:alice
                    /         \
                   /           \
                  /             \
        tenant:a#admin    tenant:b#customer
               |                    |
               |                    |
               ↓                    ↓
      tenant:a#moderator    tenant:b#product:items#view
               |             tenant:b#category:items#view
               |
               ↓
      tenant:a#customer
               |
               ↓
      ┌───────┴────────┐
      ↓                ↓
product:items     category:items
- view             - view
- create           - update
- delete           - create
```

---

## Key Insights

### 1. Multi-Tenant Membership
Alice demonstrates that **a single user can have different privilege levels across tenants**:
- Admin in her own organization (Tenant A)
- Guest/Customer in partner organization (Tenant B)

### 2. Complete Tenant Isolation
Alice's admin role in Tenant A provides **ZERO privileges** in Tenant B:
- Must have explicit role assignment in each tenant
- No permission inheritance across tenant boundaries
- Tenant boundaries are hard security barriers

### 3. Role Hierarchy Benefits
In Tenant A, Alice benefits from role hierarchy:
- Single `admin` assignment grants all moderator and customer permissions
- No need to assign multiple roles
- Simplified permission management

### 4. Flexible Per-Tenant Roles
Different tenants have different role structures:
- **Tenant A**: 3-tier (admin → moderator → customer)
- **Tenant B**: 2-tier (admin → customer, no moderator)

Alice's permissions adapt to each tenant's structure.

---

## Real-World Scenario

**Scenario:** Alice works at Company A and is also a client of Company B

1. **At Company A (Tenant A)**:
   - Alice is IT Admin
   - Full control: manage users, products, categories
   - Can create, update, delete all resources

2. **At Company B (Tenant B)**:
   - Alice is a paying customer
   - Read-only access: browse products, view categories
   - Cannot modify anything

This is exactly how the authorization hierarchy works!

---

## Permission Summary

### Tenant A (Alice as Admin)

| Action | Product | Category | Reason |
|--------|---------|----------|--------|
| **View** | ✅ | ✅ | Inherited from customer role |
| **Create** | ✅ | ✅ | Moderator + Admin permissions |
| **Update** | - | ✅ | Moderator permission |
| **Delete** | ✅ | - | Admin permission |

**Total Permissions:** 7 actions allowed

### Tenant B (Alice as Customer)

| Action | Product | Category | Reason |
|--------|---------|----------|--------|
| **View** | ✅ | ✅ | Customer permission |
| **Create** | ❌ | ❌ | Admin-only (Alice is customer) |
| **Update** | - | ❌ | Admin-only |
| **Delete** | ❌ | - | Admin-only |

**Total Permissions:** 2 actions allowed (view only)

---

## Testing Alice's Hierarchy

Run these commands to verify Alice's permissions:

```bash
# Tenant A - Should be allowed (admin)
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=tenant-rbac" \
  --data-urlencode "object=tenant:a#product:items" \
  --data-urlencode "relation=delete" \
  --data-urlencode "subject_id=user:alice"
# Expected: {"allowed": true}

# Tenant B - Should be denied (customer)
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=tenant-rbac" \
  --data-urlencode "object=tenant:b#product:items" \
  --data-urlencode "relation=delete" \
  --data-urlencode "subject_id=user:alice"
# Expected: {"allowed": false}

# Tenant B - Should be allowed (customer can view)
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=tenant-rbac" \
  --data-urlencode "object=tenant:b#product:items" \
  --data-urlencode "relation=view" \
  --data-urlencode "subject_id=user:alice"
# Expected: {"allowed": true}
```

---

## Conclusion

Alice's hierarchy demonstrates the power of the tenant-centric multi-tenancy approach:

✅ **Same user, different privileges** based on tenant context
✅ **Complete isolation** between tenants
✅ **Role hierarchy** simplifies permission management
✅ **Single-query authorization** for efficient checks

This pattern is production-ready for B2B SaaS applications where users participate in multiple organizations with different access levels.
