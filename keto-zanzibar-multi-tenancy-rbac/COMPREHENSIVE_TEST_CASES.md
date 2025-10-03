# Comprehensive Test Cases - Tenant-Centric Multi-Tenant RBAC

## Overview

This document describes **all permission checks** for all 3 users across both tenants and both resource types.

**Total Test Cases:** 36 permission checks + 3 role membership checks = **39 tests**

---

## Test Matrix Summary

### Alice (Multi-Tenant User)

| Tenant | Resource | Role | View | Create | Update | Delete | Tests |
|--------|----------|------|------|--------|--------|--------|-------|
| **A** | product:items | admin | ✅ | ✅ | - | ✅ | 3 |
| **A** | category:items | admin | ✅ | ✅ | ✅ | - | 3 |
| **B** | product:items | customer | ✅ | ❌ | - | ❌ | 3 |
| **B** | category:items | customer | ✅ | ❌ | ❌ | - | 3 |

**Alice Total:** 12 tests

---

### Bob (Single-Tenant User - Moderator in Tenant A)

| Tenant | Resource | Role | View | Create | Update | Delete | Tests |
|--------|----------|------|------|--------|--------|--------|-------|
| **A** | product:items | moderator | ✅ | ✅ | - | ❌ | 3 |
| **A** | category:items | moderator | ✅ | ❌ | ✅ | - | 3 |
| **B** | product:items | none | ❌ | ❌ | - | ❌ | 3 |
| **B** | category:items | none | ❌ | ❌ | ❌ | - | 3 |

**Bob Total:** 12 tests

---

### Charlie (Single-Tenant User - Customer in Tenant B)

| Tenant | Resource | Role | View | Create | Update | Delete | Tests |
|--------|----------|------|------|--------|--------|--------|-------|
| **B** | product:items | customer | ✅ | ❌ | - | ❌ | 3 |
| **B** | category:items | customer | ✅ | ❌ | ❌ | - | 3 |
| **A** | product:items | none | ❌ | ❌ | - | ❌ | 3 |
| **A** | category:items | none | ❌ | ❌ | ❌ | - | 3 |

**Charlie Total:** 12 tests

---

## Detailed Test Cases

### Alice - Tenant A (Admin Role)

**TC-A-A-01:** Alice can view products in Tenant A
- **Object:** `tenant:a#product:items`
- **Relation:** `view`
- **Subject:** `user:alice`
- **Expected:** ✅ `{"allowed": true}`
- **Reason:** Admin inherits customer → view permission

**TC-A-A-02:** Alice can create products in Tenant A
- **Object:** `tenant:a#product:items`
- **Relation:** `create`
- **Subject:** `user:alice`
- **Expected:** ✅ `{"allowed": true}`
- **Reason:** Admin inherits moderator → create permission

**TC-A-A-03:** Alice can delete products in Tenant A
- **Object:** `tenant:a#product:items`
- **Relation:** `delete`
- **Subject:** `user:alice`
- **Expected:** ✅ `{"allowed": true}`
- **Reason:** Direct admin permission

**TC-A-A-04:** Alice can view categories in Tenant A
- **Object:** `tenant:a#category:items`
- **Relation:** `view`
- **Subject:** `user:alice`
- **Expected:** ✅ `{"allowed": true}`
- **Reason:** Admin inherits customer → view permission

**TC-A-A-05:** Alice can update categories in Tenant A
- **Object:** `tenant:a#category:items`
- **Relation:** `update`
- **Subject:** `user:alice`
- **Expected:** ✅ `{"allowed": true}`
- **Reason:** Admin inherits moderator → update permission

**TC-A-A-06:** Alice can create categories in Tenant A
- **Object:** `tenant:a#category:items`
- **Relation:** `create`
- **Subject:** `user:alice`
- **Expected:** ✅ `{"allowed": true}`
- **Reason:** Direct admin permission

---

### Alice - Tenant B (Customer Role)

**TC-A-B-01:** Alice can view products in Tenant B
- **Object:** `tenant:b#product:items`
- **Relation:** `view`
- **Subject:** `user:alice`
- **Expected:** ✅ `{"allowed": true}`
- **Reason:** Direct customer permission

**TC-A-B-02:** Alice CANNOT create products in Tenant B
- **Object:** `tenant:b#product:items`
- **Relation:** `create`
- **Subject:** `user:alice`
- **Expected:** ❌ `{"allowed": false}`
- **Reason:** Customer role lacks create permission (admin-only in Tenant B)

**TC-A-B-03:** Alice CANNOT delete products in Tenant B
- **Object:** `tenant:b#product:items`
- **Relation:** `delete`
- **Subject:** `user:alice`
- **Expected:** ❌ `{"allowed": false}`
- **Reason:** Customer role lacks delete permission (admin-only in Tenant B)

**TC-A-B-04:** Alice can view categories in Tenant B
- **Object:** `tenant:b#category:items`
- **Relation:** `view`
- **Subject:** `user:alice`
- **Expected:** ✅ `{"allowed": true}`
- **Reason:** Direct customer permission

**TC-A-B-05:** Alice CANNOT update categories in Tenant B
- **Object:** `tenant:b#category:items`
- **Relation:** `update`
- **Subject:** `user:alice`
- **Expected:** ❌ `{"allowed": false}`
- **Reason:** Customer role lacks update permission (admin-only in Tenant B)

**TC-A-B-06:** Alice CANNOT create categories in Tenant B
- **Object:** `tenant:b#category:items`
- **Relation:** `create`
- **Subject:** `user:alice`
- **Expected:** ❌ `{"allowed": false}`
- **Reason:** Customer role lacks create permission (admin-only in Tenant B)

---

### Bob - Tenant A (Moderator Role)

**TC-B-A-01:** Bob can view products in Tenant A
- **Object:** `tenant:a#product:items`
- **Relation:** `view`
- **Subject:** `user:bob`
- **Expected:** ✅ `{"allowed": true}`
- **Reason:** Moderator inherits customer → view permission

**TC-B-A-02:** Bob can create products in Tenant A
- **Object:** `tenant:a#product:items`
- **Relation:** `create`
- **Subject:** `user:bob`
- **Expected:** ✅ `{"allowed": true}`
- **Reason:** Direct moderator permission

**TC-B-A-03:** Bob CANNOT delete products in Tenant A
- **Object:** `tenant:a#product:items`
- **Relation:** `delete`
- **Subject:** `user:bob`
- **Expected:** ❌ `{"allowed": false}`
- **Reason:** Delete is admin-only permission

**TC-B-A-04:** Bob can view categories in Tenant A
- **Object:** `tenant:a#category:items`
- **Relation:** `view`
- **Subject:** `user:bob`
- **Expected:** ✅ `{"allowed": true}`
- **Reason:** Moderator inherits customer → view permission

**TC-B-A-05:** Bob can update categories in Tenant A
- **Object:** `tenant:a#category:items`
- **Relation:** `update`
- **Subject:** `user:bob`
- **Expected:** ✅ `{"allowed": true}`
- **Reason:** Direct moderator permission

**TC-B-A-06:** Bob CANNOT create categories in Tenant A
- **Object:** `tenant:a#category:items`
- **Relation:** `create`
- **Subject:** `user:bob`
- **Expected:** ❌ `{"allowed": false}`
- **Reason:** Create is admin-only permission

---

### Bob - Tenant B (No Role - Tenant Isolation)

**TC-B-B-01:** Bob CANNOT view products in Tenant B
- **Object:** `tenant:b#product:items`
- **Relation:** `view`
- **Subject:** `user:bob`
- **Expected:** ❌ `{"allowed": false}`
- **Reason:** Bob has no role in Tenant B

**TC-B-B-02:** Bob CANNOT create products in Tenant B
- **Object:** `tenant:b#product:items`
- **Relation:** `create`
- **Subject:** `user:bob`
- **Expected:** ❌ `{"allowed": false}`
- **Reason:** No cross-tenant access

**TC-B-B-03:** Bob CANNOT delete products in Tenant B
- **Object:** `tenant:b#product:items`
- **Relation:** `delete`
- **Subject:** `user:bob`
- **Expected:** ❌ `{"allowed": false}`
- **Reason:** No cross-tenant access

**TC-B-B-04:** Bob CANNOT view categories in Tenant B
- **Object:** `tenant:b#category:items`
- **Relation:** `view`
- **Subject:** `user:bob`
- **Expected:** ❌ `{"allowed": false}`
- **Reason:** Bob has no role in Tenant B

**TC-B-B-05:** Bob CANNOT update categories in Tenant B
- **Object:** `tenant:b#category:items`
- **Relation:** `update`
- **Subject:** `user:bob`
- **Expected:** ❌ `{"allowed": false}`
- **Reason:** No cross-tenant access

**TC-B-B-06:** Bob CANNOT create categories in Tenant B
- **Object:** `tenant:b#category:items`
- **Relation:** `create`
- **Subject:** `user:bob`
- **Expected:** ❌ `{"allowed": false}`
- **Reason:** No cross-tenant access

---

### Charlie - Tenant B (Customer Role)

**TC-C-B-01:** Charlie can view products in Tenant B
- **Object:** `tenant:b#product:items`
- **Relation:** `view`
- **Subject:** `user:charlie`
- **Expected:** ✅ `{"allowed": true}`
- **Reason:** Direct customer permission

**TC-C-B-02:** Charlie CANNOT create products in Tenant B
- **Object:** `tenant:b#product:items`
- **Relation:** `create`
- **Subject:** `user:charlie`
- **Expected:** ❌ `{"allowed": false}`
- **Reason:** Customer role lacks create permission (admin-only in Tenant B)

**TC-C-B-03:** Charlie CANNOT delete products in Tenant B
- **Object:** `tenant:b#product:items`
- **Relation:** `delete`
- **Subject:** `user:charlie`
- **Expected:** ❌ `{"allowed": false}`
- **Reason:** Customer role lacks delete permission (admin-only in Tenant B)

**TC-C-B-04:** Charlie can view categories in Tenant B
- **Object:** `tenant:b#category:items`
- **Relation:** `view`
- **Subject:** `user:charlie`
- **Expected:** ✅ `{"allowed": true}`
- **Reason:** Direct customer permission

**TC-C-B-05:** Charlie CANNOT update categories in Tenant B
- **Object:** `tenant:b#category:items`
- **Relation:** `update`
- **Subject:** `user:charlie`
- **Expected:** ❌ `{"allowed": false}`
- **Reason:** Customer role lacks update permission (admin-only in Tenant B)

**TC-C-B-06:** Charlie CANNOT create categories in Tenant B
- **Object:** `tenant:b#category:items`
- **Relation:** `create`
- **Subject:** `user:charlie`
- **Expected:** ❌ `{"allowed": false}`
- **Reason:** Customer role lacks create permission (admin-only in Tenant B)

---

### Charlie - Tenant A (No Role - Tenant Isolation)

**TC-C-A-01:** Charlie CANNOT view products in Tenant A
- **Object:** `tenant:a#product:items`
- **Relation:** `view`
- **Subject:** `user:charlie`
- **Expected:** ❌ `{"allowed": false}`
- **Reason:** Charlie has no role in Tenant A

**TC-C-A-02:** Charlie CANNOT create products in Tenant A
- **Object:** `tenant:a#product:items`
- **Relation:** `create`
- **Subject:** `user:charlie`
- **Expected:** ❌ `{"allowed": false}`
- **Reason:** No cross-tenant access

**TC-C-A-03:** Charlie CANNOT delete products in Tenant A
- **Object:** `tenant:a#product:items`
- **Relation:** `delete`
- **Subject:** `user:charlie`
- **Expected:** ❌ `{"allowed": false}`
- **Reason:** No cross-tenant access

**TC-C-A-04:** Charlie CANNOT view categories in Tenant A
- **Object:** `tenant:a#category:items`
- **Relation:** `view`
- **Subject:** `user:charlie`
- **Expected:** ❌ `{"allowed": false}`
- **Reason:** Charlie has no role in Tenant A

**TC-C-A-05:** Charlie CANNOT update categories in Tenant A
- **Object:** `tenant:a#category:items`
- **Relation:** `update`
- **Subject:** `user:charlie`
- **Expected:** ❌ `{"allowed": false}`
- **Reason:** No cross-tenant access

**TC-C-A-06:** Charlie CANNOT create categories in Tenant A
- **Object:** `tenant:a#category:items`
- **Relation:** `create`
- **Subject:** `user:charlie`
- **Expected:** ❌ `{"allowed": false}`
- **Reason:** No cross-tenant access

---

## Role Membership Tests

**TC-RM-01:** Alice is admin in Tenant A
- **Object:** `tenant:a`
- **Relation:** `admin`
- **Subject:** `user:alice`
- **Expected:** ✅ `{"allowed": true}`

**TC-RM-02:** Alice is customer in Tenant B
- **Object:** `tenant:b`
- **Relation:** `customer`
- **Subject:** `user:alice`
- **Expected:** ✅ `{"allowed": true}`

**TC-RM-03:** Bob is moderator in Tenant A
- **Object:** `tenant:a`
- **Relation:** `moderator`
- **Subject:** `user:bob`
- **Expected:** ✅ `{"allowed": true}`

---

## Test Execution Summary

### Total Test Count
- **Permission Checks:** 36 tests
  - Alice: 12 tests (6 in Tenant A, 6 in Tenant B)
  - Bob: 12 tests (6 in Tenant A, 6 in Tenant B)
  - Charlie: 12 tests (6 in Tenant B, 6 in Tenant A)
- **Role Membership:** 3 tests
- **Total:** 39 tests

### Expected Results
- **All tests should PASS**: 39/39 ✅
- **No permission leakage**: Complete tenant isolation
- **Role hierarchy working**: Admin inherits moderator inherits customer
- **Multi-tenant users**: Alice has different roles in different tenants

---

## Permission Summary by Role

### Admin Role (Tenant A)
**Permissions:** All operations on all resources
- Products: view ✅, create ✅, delete ✅
- Categories: view ✅, update ✅, create ✅

### Moderator Role (Tenant A)
**Permissions:** Create products, update categories, view all
- Products: view ✅, create ✅, delete ❌
- Categories: view ✅, update ✅, create ❌

### Customer Role (Tenant B)
**Permissions:** View-only all resources
- Products: view ✅, create ❌, delete ❌
- Categories: view ✅, update ❌, create ❌

### No Role (Cross-Tenant)
**Permissions:** None
- Products: view ❌, create ❌, delete ❌
- Categories: view ❌, update ❌, create ❌

---

## Test Coverage

### Functional Coverage
✅ All resource types (products, categories)
✅ All action types (view, create, update, delete)
✅ All roles (admin, moderator, customer)
✅ All users (alice, bob, charlie)
✅ All tenants (tenant:a, tenant:b)
✅ Tenant isolation (cross-tenant denial)
✅ Role hierarchy (inheritance)
✅ Multi-tenant users (alice)

### Security Coverage
✅ No cross-tenant permission leakage
✅ No unauthorized resource access
✅ Role-based access control working
✅ Tenant isolation enforced
✅ Permission grants explicit only

---

## Running the Tests

```bash
cd /Users/duong.nguyen1/worksplace/ory-self-hosted/keto-zanzibar-multi-tenancy-rbac
./test-multi-tenant-rbac.sh
```

### Expected Output
```
========================================
Test Summary
========================================
Passed: 39
Failed: 0
Total:  39

🎉 All tests passed!
```

---

## Test Script Location

**File:** `test-multi-tenant-rbac.sh`
**Approach:** Tenant-Centric (user → tenant → role → all resources)
**Coverage:** 100% of all permission combinations
