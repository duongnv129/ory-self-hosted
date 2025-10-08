# Keto Multi-Tenant Resource-Scoped RBAC - Alice's Authorization Hierarchy

## Visual Hierarchy Diagram

### Complete Alice Authorization Graph

```
                                user:alice
                                    |
                    ┌───────────────┼───────────────┐
                    │                               │
            TENANT A (multi-resource)       TENANT B (single-resource)
                    │                               │
        ┌───────────┴───────────┐                  │
        │                       │                  │
   product:items          category:items      product:items
   (admin role)           (moderator role)    (customer role)
        │                       │                  │
   ┌────┼────┐              ┌───┼───┐              │
   │    │    │              │   │   │              │
admin→mod→cust           mod→cust │            customer
   │    │    │              │   │  │               │
   ▼    ▼    ▼              ▼   ▼  ▼               ▼
delete create view       update view ❌            view
                                    (no create)

Role Hierarchy & Permissions:
┌─ PRODUCTS (admin → moderator → customer):
│  ├─ delete ← admin (direct)
│  ├─ create ← moderator (inherited ↑)
│  └─ view ← customer (inherited ↑)
│
├─ CATEGORIES (moderator → customer):
│  ├─ update ← moderator (direct)
│  ├─ view ← customer (inherited ↑)
│  └─ create ← ❌ DENIED (admin-only, Alice is moderator)
│
└─ TENANT B PRODUCTS (customer):
   └─ view ← customer (direct)
```

---

## Detailed Role Breakdown

### Alice in Tenant A - Product Admin

**Direct Assignment:**
```json
{
  "namespace": "resource-rbac",
  "object": "tenant:a#product:items",
  "relation": "admin",
  "subject_id": "user:alice"
}
```

**Inherited Permissions:**
```
user:alice
    ↓ (direct assignment)
tenant:a#product:items#admin
    ↓ (inherits from moderator)
tenant:a#product:items#moderator
    ↓ (inherits from customer)
tenant:a#product:items#customer
    ↓ (permission grants)
    ├── view ✅ (customer)
    ├── create ✅ (moderator)
    └── delete ✅ (admin-only)
```

**Permission Matrix:**

| Action | Allowed | Reason |
|--------|---------|--------|
| **view** | ✅ | Inherited from customer (via moderator) |
| **create** | ✅ | Inherited from moderator |
| **delete** | ✅ | Direct admin permission |

---

### Alice in Tenant A - Category Moderator

**Direct Assignment:**
```json
{
  "namespace": "resource-rbac",
  "object": "tenant:a#category:items",
  "relation": "moderator",
  "subject_id": "user:alice"
}
```

**Inherited Permissions:**
```
user:alice
    ↓ (direct assignment)
tenant:a#category:items#moderator
    ↓ (inherits from customer)
tenant:a#category:items#customer
    ↓ (permission grants)
    ├── view ✅ (via customer inheritance)
    └── update ✅ (direct moderator permission)
```

**Permission Matrix:**

| Action | Allowed | Reason |
|--------|---------|--------|
| **view** | ✅ | Inherited from customer |
| **update** | ✅ | Direct moderator permission |
| **create** | ❌ | Admin-only (Alice is moderator, not admin) |

---

### Alice in Tenant B - Product Customer

**Direct Assignment:**
```json
{
  "namespace": "resource-rbac",
  "object": "tenant:b#product:items",
  "relation": "customer",
  "subject_id": "user:alice"
}
```

**Permissions:**
```
user:alice
    ↓ (direct assignment)
tenant:b#product:items#customer
    ↓ (permission grant)
    └── view ✅
```

**Permission Matrix:**

| Action | Allowed | Reason |
|--------|---------|--------|
| **view** | ✅ | Direct customer permission |
| **create** | ❌ | No permission grant |
| **delete** | ❌ | No permission grant |

---

## Complete Relationship Graph

```
┌─────────────────────────────────────────────────────────────────────┐
│                          user:alice                                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
    ┌─────────────────────┐   ┌─────────────────────┐
    │   TENANT A ROLES    │   │   TENANT B ROLES    │
    └─────────────────────┘   └─────────────────────┘
                │                         │
        ┌───────┴───────┐                 │
        ▼               ▼                 ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│tenant:a#     │ │tenant:a#     │ │tenant:b#     │
│product:items │ │category:items│ │product:items │
│              │ │              │ │              │
│role: admin   │ │role:moderator│ │role: customer│
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
   ┌───┴───┴───┐    ┌───┴───┐        ┌───┴───┐
   ▼   ▼       ▼    ▼       ▼        ▼       │
 view create delete view  update    view     │
  ↑    ↑       │    ↑       │                ▼
 cust  mod   admin cust    mod          (no create)
                                        (no delete)
```

---

## Authorization Flow Examples

### Example 1: Alice Creates Product in Tenant A

**Request:**
```bash
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=resource-rbac" \
  --data-urlencode "object=tenant:a#product:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:alice"
```

**Keto Resolution:**
```
Step 1: Check user:alice → tenant:a#product:items#admin
        ✅ YES (direct assignment)

Step 2: Check tenant:a#product:items#admin → tenant:a#product:items#moderator
        ✅ YES (role hierarchy)

Step 3: Check tenant:a#product:items#moderator → tenant:a#product:items#create
        ✅ YES (permission grant)

Result: {"allowed": true}
```

**Visual Path:**
```
user:alice
    ↓
tenant:a#product:items#admin
    ↓ (inherits)
tenant:a#product:items#moderator
    ↓ (grants)
tenant:a#product:items#create ✅
```

---

### Example 2: Alice Updates Category in Tenant A

**Request:**
```bash
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=resource-rbac" \
  --data-urlencode "object=tenant:a#category:items" \
  --data-urlencode "relation=update" \
  --data-urlencode "subject_id=user:alice"
```

**Keto Resolution:**
```
Step 1: Check user:alice → tenant:a#category:items#moderator
        ✅ YES (separate direct assignment)

Step 2: Check tenant:a#category:items#moderator → tenant:a#category:items#update
        ✅ YES (permission grant)

Result: {"allowed": true}
```

**Visual Path:**
```
user:alice
    ↓
tenant:a#category:items#moderator
    ↓ (grants)
tenant:a#category:items#update ✅
```

**Note:** Alice is **moderator** on categories (different from admin on products)!

---

### Example 3: Alice Creates Product in Tenant B

**Request:**
```bash
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=resource-rbac" \
  --data-urlencode "object=tenant:b#product:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:alice"
```

**Keto Resolution:**
```
Step 1: Check user:alice → tenant:b#product:items#customer
        ✅ YES (direct assignment)

Step 2: Check tenant:b#product:items#customer → tenant:b#product:items#create
        ❌ NO (no such permission grant)

Result: {"allowed": false}
```

**Visual Path:**
```
user:alice
    ↓
tenant:b#product:items#customer
    ↓ (grants)
tenant:b#product:items#view ✅
    ↓ (does NOT grant)
tenant:b#product:items#create ❌
```

---

### Example 4: Alice Views Product in Tenant B

**Request:**
```bash
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=resource-rbac" \
  --data-urlencode "object=tenant:b#product:items" \
  --data-urlencode "relation=view" \
  --data-urlencode "subject_id=user:alice"
```

**Keto Resolution:**
```
Step 1: Check user:alice → tenant:b#product:items#customer
        ✅ YES (direct assignment)

Step 2: Check tenant:b#product:items#customer → tenant:b#product:items#view
        ✅ YES (permission grant)

Result: {"allowed": true}
```

**Visual Path:**
```
user:alice
    ↓
tenant:b#product:items#customer
    ↓ (grants)
tenant:b#product:items#view ✅
```

---

## Alice's Complete Tuple Inventory

### Role Assignments (3 tuples)

```json
// 1. Product admin in Tenant A
{
  "namespace": "resource-rbac",
  "object": "tenant:a#product:items",
  "relation": "admin",
  "subject_id": "user:alice"
}

// 2. Category moderator in Tenant A
{
  "namespace": "resource-rbac",
  "object": "tenant:a#category:items",
  "relation": "moderator",
  "subject_id": "user:alice"
}

// 3. Product customer in Tenant B
{
  "namespace": "resource-rbac",
  "object": "tenant:b#product:items",
  "relation": "customer",
  "subject_id": "user:alice"
}
```

**Total: 3 role assignment tuples**

---

## Permission Summary

### Tenant A Permissions

| Resource | Role | Actions Allowed |
|----------|------|-----------------|
| **product:items** | admin | view ✅, create ✅, delete ✅ |
| **category:items** | moderator | view ✅, update ✅ |

**Result:** Alice has **different privilege levels** across 2 resource types in Tenant A

---

### Tenant B Permissions

| Resource | Role | Actions Allowed |
|----------|------|-----------------|
| **product:items** | customer | view ✅ |

**Result:** Alice has **read-only** access to 1 resource type in Tenant B

---

## Multi-Tenant User Characteristics

### Same User, Different Privileges

Alice demonstrates the power of resource-scoped roles:

1. **Tenant A - Mixed Roles**
   - Admin on products (view, create, delete)
   - Moderator on categories (view, update)
   - Total: **5 actions** across 2 resources

2. **Tenant B - Customer**
   - View-only access to products
   - Total: **1 action** across 1 resource

**Key Insight:** Same user ID, but **completely different privilege levels** based on tenant context

---

### Resource-Level Granularity

Within Tenant A, Alice has **different roles** for each resource:

```
product:items → admin (assigned explicitly)
category:items → moderator (assigned explicitly, separate from products)
```

**Important:** Being admin on products does **NOT** automatically make Alice admin (or even moderator) on categories. Each resource requires explicit assignment.

---

## Comparison: Tenant-Scoped vs Resource-Scoped

### Tenant-Scoped (Previous Approach)

**Alice's assignments:**
```
tenant:a → admin (applies to ALL resources)
tenant:b → customer (applies to ALL resources)
```

**Total tuples:** 2

**Flexibility:** Low (same role for all resources in tenant)

---

### Resource-Scoped (This Approach)

**Alice's assignments:**
```
tenant:a#product:items → admin
tenant:a#category:items → moderator
tenant:b#product:items → customer
```

**Total tuples:** 3

**Flexibility:** High (different roles per resource type)

---

## Edge Cases

### What if Alice needs access to new resource type?

**Scenario:** Tenant A adds `invoice:items`

**Tenant-Scoped:** ✅ Automatic
```
Alice already has admin role on tenant:a
→ Automatically gets admin on invoice:items
```

**Resource-Scoped:** ❌ Manual
```
Must create new tuple:
user:alice → tenant:a#invoice:items#admin

If forgotten, Alice has NO access to invoices!
```

---

### What if Alice needs different roles per resource?

**Scenario:** Alice should be admin for products, moderator for categories

**Tenant-Scoped:** ❌ Not possible
```
Alice has ONE role for entire tenant
Can't have different roles per resource
```

**Resource-Scoped:** ✅ Possible
```
user:alice → tenant:a#product:items#admin
user:alice → tenant:a#category:items#moderator
```

---

## Real-World Analogy

**Scenario:** Alice works at Company A and is a customer of Company B

### Company A (Tenant A)
- Alice is **Product Manager** → admin on product:items (full control)
- Alice is **Category Reviewer** → moderator on category:items (can review/update, not create)
- Mixed privilege levels across different resources

### Company B (Tenant B)
- Alice is **Paying Customer** → customer on product:items
- Browse products, place orders
- No admin access

This is exactly how the resource-scoped authorization works!

---

## Testing Alice's Permissions

### Test Script

```bash
# Tenant A - Product create (should succeed)
curl -s -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=resource-rbac" \
  --data-urlencode "object=tenant:a#product:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:alice"
# Expected: {"allowed": true}

# Tenant A - Category update (should succeed)
curl -s -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=resource-rbac" \
  --data-urlencode "object=tenant:a#category:items" \
  --data-urlencode "relation=update" \
  --data-urlencode "subject_id=user:alice"
# Expected: {"allowed": true}

# Tenant A - Category create (should fail - Alice is moderator, not admin)
curl -s -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=resource-rbac" \
  --data-urlencode "object=tenant:a#category:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:alice"
# Expected: {"allowed": false}

# Tenant B - Product view (should succeed)
curl -s -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=resource-rbac" \
  --data-urlencode "object=tenant:b#product:items" \
  --data-urlencode "relation=view" \
  --data-urlencode "subject_id=user:alice"
# Expected: {"allowed": true}

# Tenant B - Product create (should fail)
curl -s -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=resource-rbac" \
  --data-urlencode "object=tenant:b#product:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:alice"
# Expected: {"allowed": false}
```

---

## Summary Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      user:alice                             │
│                                                             │
│  Tenant A:                      Tenant B:                  │
│  ├─ product:items (admin)       └─ product:items (customer)│
│  │  ├─ view ✅                     ├─ view ✅             │
│  │  ├─ create ✅                   ├─ create ❌           │
│  │  └─ delete ✅                   └─ delete ❌           │
│  │                                                          │
│  └─ category:items (moderator)                             │
│     ├─ view ✅                                             │
│     ├─ update ✅                                           │
│     └─ create ❌                                           │
│                                                             │
│  Total Permissions: 6                                      │
│  Role Assignments: 3                                       │
│  Tuple Count: 3                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Conclusion

Alice's hierarchy demonstrates:

✅ **Multi-Tenant Membership** - Different roles in different tenants
✅ **Multi-Resource Granularity** - Different roles per resource type
✅ **Complete Isolation** - Admin in one tenant/resource ≠ access elsewhere
✅ **Explicit Assignments** - Every permission requires explicit grant
✅ **Fine-Grained Control** - Maximum flexibility, higher complexity

This approach is ideal when users need **varying permission levels** across different resource types within the same tenant.
