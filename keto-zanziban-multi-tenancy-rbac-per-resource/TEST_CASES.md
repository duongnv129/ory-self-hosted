# Test Cases - Resource-Scoped Multi-Tenant RBAC

## Overview

This document describes the test cases for the **resource-scoped multi-tenancy RBAC** approach where users have separate role assignments per resource type.

**Test Script Location:** `/keto-zanziban-multi-tenancy-rbac-per-resource/test-resource-scoped.sh`

---

## Test Architecture

### Users and Roles

| User | Tenant A | Tenant B |
|------|----------|----------|
| **Alice** | admin (product:items)<br>admin (category:items) | customer (product:items) |
| **Bob** | moderator (product:items) | - |
| **Charlie** | - | customer (product:items) |

**Key Point:** Each resource type requires **separate role assignment**

---

## Test Case Categories

### 1. Role Assignment Tests

**TC-1.1: Alice Product Admin Assignment**
- **Object:** `tenant:a#product:items`
- **Relation:** `admin`
- **Subject:** `user:alice`
- **Expected:** Role assigned successfully

**TC-1.2: Alice Category Admin Assignment**
- **Object:** `tenant:a#category:items`
- **Relation:** `admin`
- **Subject:** `user:alice`
- **Expected:** Separate role assignment (not inherited from products)

**TC-1.3: Alice Customer Assignment (Tenant B)**
- **Object:** `tenant:b#product:items`
- **Relation:** `customer`
- **Subject:** `user:alice`
- **Expected:** Different role in different tenant

---

### 2. Permission Grant Tests

**TC-2.1: Alice Creates Product in Tenant A**
- **Check:** `tenant:a#product:items` → `create` → `user:alice`
- **Expected:** `{"allowed": true}`
- **Reason:** Admin role on products (via moderator inheritance)

**TC-2.2: Alice Deletes Product in Tenant A**
- **Check:** `tenant:a#product:items` → `delete` → `user:alice`
- **Expected:** `{"allowed": true}`
- **Reason:** Direct admin permission on products

**TC-2.3: Alice Creates Category in Tenant A**
- **Check:** `tenant:a#category:items` → `create` → `user:alice`
- **Expected:** `{"allowed": true}`
- **Reason:** Separate admin role on categories

**TC-2.4: Alice Updates Category in Tenant A**
- **Check:** `tenant:a#category:items` → `update` → `user:alice`
- **Expected:** `{"allowed": true}`
- **Reason:** Admin permission on categories

---

### 3. Tenant Isolation Tests

**TC-3.1: Alice Views Product in Tenant B**
- **Check:** `tenant:b#product:items` → `view` → `user:alice`
- **Expected:** `{"allowed": true}`
- **Reason:** Customer role in Tenant B

**TC-3.2: Alice Creates Product in Tenant B**
- **Check:** `tenant:b#product:items` → `create` → `user:alice`
- **Expected:** `{"allowed": false}`
- **Reason:** Customer role has no create permission

**TC-3.3: Alice Deletes Product in Tenant B**
- **Check:** `tenant:b#product:items` → `delete` → `user:alice`
- **Expected:** `{"allowed": false}`
- **Reason:** Customer role has no delete permission

---

### 4. Resource Isolation Tests

**TC-4.1: Bob Creates Product in Tenant A**
- **Check:** `tenant:a#product:items` → `create` → `user:bob`
- **Expected:** `{"allowed": true}`
- **Reason:** Moderator role on products

**TC-4.2: Bob Deletes Product in Tenant A**
- **Check:** `tenant:a#product:items` → `delete` → `user:bob`
- **Expected:** `{"allowed": false}`
- **Reason:** Moderator lacks delete permission (admin-only)

**TC-4.3: Bob Creates Category in Tenant A**
- **Check:** `tenant:a#category:items` → `create` → `user:bob`
- **Expected:** `{"allowed": false}`
- **Reason:** Bob has NO role on categories (only on products)

**TC-4.4: Bob Updates Category in Tenant A**
- **Check:** `tenant:a#category:items` → `update` → `user:bob`
- **Expected:** `{"allowed": false}`
- **Reason:** Bob's moderator role on products does NOT grant access to categories

---

### 5. Cross-Tenant Denial Tests

**TC-5.1: Bob Views Product in Tenant B**
- **Check:** `tenant:b#product:items` → `view` → `user:bob`
- **Expected:** `{"allowed": false}`
- **Reason:** Bob has no role in Tenant B

**TC-5.2: Bob Creates Product in Tenant B**
- **Check:** `tenant:b#product:items` → `create` → `user:bob`
- **Expected:** `{"allowed": false}`
- **Reason:** No cross-tenant access

**TC-5.3: Charlie Views Product in Tenant A**
- **Check:** `tenant:a#product:items` → `view` → `user:charlie`
- **Expected:** `{"allowed": false}`
- **Reason:** Charlie has no role in Tenant A

**TC-5.4: Charlie Creates Product in Tenant A**
- **Check:** `tenant:a#product:items` → `create` → `user:charlie`
- **Expected:** `{"allowed": false}`
- **Reason:** No cross-tenant access

---

### 6. Role Hierarchy Tests

**TC-6.1: Admin Inherits Moderator (Products)**
- **Check:** `tenant:a#product:items` → `admin` → `moderator` (subject_set)
- **Expected:** Admin role inherits moderator permissions
- **Result:** Alice (admin) can create products (moderator permission)

**TC-6.2: Separate Hierarchy Per Resource**
- **Check:** Product hierarchy ≠ Category hierarchy
- **Expected:** Each resource type has independent role hierarchy
- **Result:** Admin on products does NOT inherit moderator on categories

---

### 7. Multi-Tenant User Tests

**TC-7.1: Alice Role in Tenant A (Products)**
- **Check:** `tenant:a#product:items` → `admin` → `user:alice`
- **Expected:** `{"allowed": true}`
- **Result:** Alice is admin for products in Tenant A

**TC-7.2: Alice Role in Tenant A (Categories)**
- **Check:** `tenant:a#category:items` → `admin` → `user:alice`
- **Expected:** `{"allowed": true}`
- **Result:** Alice is admin for categories in Tenant A (separate assignment)

**TC-7.3: Alice Role in Tenant B (Products)**
- **Check:** `tenant:b#product:items` → `customer` → `user:alice`
- **Expected:** `{"allowed": true}`
- **Result:** Alice is customer in Tenant B

**TC-7.4: Multi-Role Verification**
- **Expected:** Alice has 3 separate role assignments
- **Result:** Different roles per resource type and tenant

---

### 8. Charlie Customer Tests

**TC-8.1: Charlie Views Product in Tenant B**
- **Check:** `tenant:b#product:items` → `view` → `user:charlie`
- **Expected:** `{"allowed": true}`
- **Reason:** Customer role on products in Tenant B

**TC-8.2: Charlie Creates Product in Tenant B**
- **Check:** `tenant:b#product:items` → `create` → `user:charlie`
- **Expected:** `{"allowed": false}`
- **Reason:** Customer role has no create permission

---

## Test Results Matrix

### Alice (Multi-Tenant, Multi-Resource User)

| Tenant | Resource | Role | Create | Delete | Update | View |
|--------|----------|------|--------|--------|--------|------|
| A | product:items | admin | ✅ | ✅ | - | - |
| A | category:items | admin | ✅ | - | ✅ | - |
| B | product:items | customer | ❌ | ❌ | - | ✅ |

**Total Permissions:** 5 actions across 3 resource assignments

---

### Bob (Single-Tenant, Single-Resource User)

| Tenant | Resource | Role | Create | Delete | Update | View |
|--------|----------|------|--------|--------|--------|------|
| A | product:items | moderator | ✅ | ❌ | - | - |
| A | category:items | - | ❌ | - | ❌ | - |
| B | product:items | - | ❌ | ❌ | - | ❌ |

**Total Permissions:** 1 action (create products in Tenant A only)

---

### Charlie (Single-Tenant, Single-Resource User)

| Tenant | Resource | Role | Create | Delete | Update | View |
|--------|----------|------|--------|--------|--------|------|
| A | product:items | - | ❌ | ❌ | - | ❌ |
| B | product:items | customer | ❌ | ❌ | - | ✅ |

**Total Permissions:** 1 action (view products in Tenant B only)

---

## Key Test Validations

### ✅ Resource-Scoped Roles
- Each resource type requires **separate role assignment**
- Bob is moderator on products but has **NO access** to categories
- Alice needs **2 separate admin assignments** (products + categories)

### ✅ Tenant Isolation
- Alice's admin role in Tenant A grants **zero access** to Tenant B
- Bob (Tenant A) cannot access Tenant B
- Charlie (Tenant B) cannot access Tenant A

### ✅ Role Hierarchy (Per Resource)
- Admin → Moderator inheritance works for **products only**
- Categories have **separate admin permissions** (no moderator role)
- Hierarchy is **resource-specific**, not global

### ✅ Multi-Tenant Users
- Alice has **3 separate role assignments**
- Same user, **different privileges** per resource and tenant
- No automatic role propagation

### ✅ No Cross-Resource Inheritance
- Admin on products ≠ admin on categories
- Each resource requires **explicit assignment**

---

## Tuple Count Analysis

### Role Assignment Tuples
```
1. user:alice → tenant:a#product:items#admin
2. user:alice → tenant:a#category:items#admin
3. user:alice → tenant:b#product:items#customer
4. user:bob → tenant:a#product:items#moderator
5. user:charlie → tenant:b#product:items#customer

Total: 5 tuples
```

### Comparison with Tenant-Scoped
**Tenant-Scoped would be:**
```
1. user:alice → tenant:a#admin (covers all resources)
2. user:alice → tenant:b#customer (covers all resources)
3. user:bob → tenant:a#moderator (covers all resources)
4. user:charlie → tenant:b#customer (covers all resources)

Total: 4 tuples
```

**Difference:** Resource-scoped uses more tuples for per-resource granularity

---

## Test Execution

### Run Tests
```bash
cd /Users/duong.nguyen1/worksplace/ory-self-hosted/keto-zanziban-multi-tenancy-rbac-per-resource
chmod +x test-resource-scoped.sh
./test-resource-scoped.sh
```

### Expected Output
```
========================================
Resource-Scoped Multi-Tenant RBAC Test
========================================

Step 1: Cleaning up existing relations...
✅ Cleanup complete

Step 2: Setting up Tenant A - Products...
✅ Tenant A products setup complete

...

========================================
Test Summary
========================================
Passed: 28
Failed: 0
Total:  28

🎉 All tests passed!
```

---

## Test Coverage

### Functional Coverage
- ✅ Role assignment (per resource)
- ✅ Permission grants
- ✅ Role hierarchy (per resource)
- ✅ Tenant isolation
- ✅ Resource isolation
- ✅ Multi-tenant users
- ✅ Cross-tenant denial

### Security Coverage
- ✅ No cross-tenant access
- ✅ No cross-resource inheritance
- ✅ Explicit permissions only
- ✅ Role scoping verification

### Edge Cases
- ✅ User with multiple roles in same tenant (different resources)
- ✅ User with different roles in different tenants
- ✅ User with no role in a tenant (denied)
- ✅ User with role on one resource but not another

---

## Success Criteria

All tests must pass with:
- ✅ 100% pass rate (28/28 tests)
- ✅ Complete tenant isolation verified
- ✅ Resource-level access control confirmed
- ✅ No unintended permission grants
- ✅ Multi-tenant user behavior validated

---

## Failure Scenarios

If tests fail, verify:
1. Keto is running on ports 4466 (read) and 4467 (write)
2. Namespace "default" is configured in Keto
3. Tuples are created with correct scope (tenant:a#resource:type)
4. Permission grants reference correct resource-scoped objects
5. Role hierarchy is defined per resource, not globally

---

## Next Steps

After successful test execution:
1. Review test output to understand authorization flows
2. Check `/keto-zanziban-multi-tenancy-rbac-per-resource/ARCHITECTURE.md` for tuple structure
3. See `/keto-zanziban-multi-tenancy-rbac-per-resource/ALICE_HIERARCHY.md` for visual diagrams
4. Implement resource-scoped authorization in your application
