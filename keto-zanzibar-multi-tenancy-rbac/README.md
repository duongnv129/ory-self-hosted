# Keto Zanzibar Multi-Tenancy RBAC

> Tenant-centric authorization approach using ORY Keto for multi-tenant RBAC with hierarchical role inheritance and complete tenant isolation.

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Permission Matrix](#permission-matrix)
- [Testing](#testing)
- [Documentation](#documentation)

---

## Overview

This implementation demonstrates a **tenant-centric multi-tenancy RBAC model** using ORY Keto's Zanzibar-based authorization. The approach uses a single namespace with complete tenant isolation, role-based access control, and support for multi-tenant users.

**Approach Pattern:** `user → tenant (role) → resource (action)`

### Key Characteristics

- ✅ **Single namespace** (`tenant-rbac`) for all tenants
- ✅ **Hierarchical role inheritance** via subject sets
- ✅ **Complete tenant isolation** - no cross-tenant access
- ✅ **Multi-tenant user support** - same user, different roles per tenant
- ✅ **Single-query authorization** - Keto resolves full chain in one API call
- ✅ **Flexible role hierarchies** - each tenant can define its own structure

---

## Key Features

### 🏢 Multi-Tenant Isolation

Each tenant operates independently with its own role assignments and permissions:

| Feature | Tenant A | Tenant B |
|---------|----------|----------|
| **Namespace** | `tenant-rbac` | `tenant-rbac` |
| **Tenant ID** | `tenant:a` | `tenant:b` |
| **Role Hierarchy** | admin → moderator → customer | admin → customer |
| **Isolation** | ✅ Complete | ✅ Complete |

### 👥 Multi-Tenant Users

**Alice** demonstrates multi-tenant user capabilities:
- **Tenant A**: Admin (full privileges)
- **Tenant B**: Customer (read-only)

### 📦 Resource Types

- **Products** (`product:items`) - view, create, delete
- **Categories** (`category:items`) - view, update, create

---

## Quick Start

### Run Tests

```bash
cd keto-zanzibar-multi-tenancy-rbac
./test-multi-tenant-rbac.sh
```

**Expected Output:**
```
✅ All tests passed!
Passed: 39
Failed: 0
Total:  39
```

### Check User Permission

```bash
# Check if Alice can create products in Tenant A
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=tenant-rbac" \
  --data-urlencode "object=tenant:a#product:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:alice"
# Returns: {"allowed": true}
```

### Verify User Role

```bash
# Check Alice's role in Tenant A
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=tenant-rbac" \
  --data-urlencode "object=tenant:a" \
  --data-urlencode "relation=admin" \
  --data-urlencode "subject_id=user:alice"
# Returns: {"allowed": true}
```

---

## Architecture

### Namespace Structure

```
Namespace: tenant-rbac
├── Tenant A (tenant:a)
│   ├── Users: Alice (admin), Bob (moderator)
│   ├── Roles: admin → moderator → customer
│   └── Resources: product:items, category:items
│
└── Tenant B (tenant:b)
    ├── Users: Alice (customer), Charlie (customer)
    ├── Roles: admin → customer
    └── Resources: product:items, category:items
```

### Role Hierarchy

#### **Tenant A** (3-tier hierarchy)

```
admin (highest privileges)
  ├─ Inherits all moderator permissions
  └─ Additional: delete products, create categories

moderator (middle privileges)
  ├─ Inherits all customer permissions
  └─ Additional: create products, update categories

customer (base privileges)
  └─ View products and categories only
```

#### **Tenant B** (2-tier hierarchy)

```
admin (highest privileges)
  ├─ Inherits all customer permissions
  └─ Additional: create/delete products, create/update categories

customer (base privileges)
  └─ View products and categories only
```

### User Assignments

#### Tenant A

| User | Role | Relation Tuple |
|------|------|----------------|
| **Alice** | Admin | `user:alice` → `tenant:a#admin` |
| **Bob** | Moderator | `user:bob` → `tenant:a#moderator` |

#### Tenant B

| User | Role | Relation Tuple |
|------|------|----------------|
| **Alice** | Customer | `user:alice` → `tenant:b#customer` |
| **Charlie** | Customer | `user:charlie` → `tenant:b#customer` |

> **Note:** Alice has **different roles** in different tenants, demonstrating multi-tenant user membership.

---

## Permission Matrix

### Tenant A Permissions

| User | Role | Product<br>View | Product<br>Create | Product<br>Delete | Category<br>View | Category<br>Update | Category<br>Create |
|------|------|:---:|:---:|:---:|:---:|:---:|:---:|
| **Alice** | Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Bob** | Moderator | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| **Charlie** | - | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Tenant B Permissions

| User | Role | Product<br>View | Product<br>Create | Product<br>Delete | Category<br>View | Category<br>Update | Category<br>Create |
|------|------|:---:|:---:|:---:|:---:|:---:|:---:|
| **Alice** | Customer | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Bob** | - | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Charlie** | Customer | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |

> **Key Insight:** Alice has **admin privileges** in Tenant A but **only read access** in Tenant B.

---

## Testing

### Test Suite

The test suite (`test-multi-tenant-rbac.sh`) verifies:

- ✅ **36 permission checks** across all users, tenants, and resources
- ✅ **3 role membership verifications**
- ✅ **Tenant isolation** - users cannot access other tenants
- ✅ **Role hierarchy** - permission inheritance works correctly
- ✅ **Multi-tenant users** - same user with different roles

### Test Coverage

| Test Category | Count | Description |
|--------------|-------|-------------|
| Alice in Tenant A | 6 | Admin permissions (all granted) |
| Alice in Tenant B | 6 | Customer permissions (view-only) |
| Bob in Tenant A | 6 | Moderator permissions (partial) |
| Bob in Tenant B | 6 | Tenant isolation (all denied) |
| Charlie in Tenant B | 6 | Customer permissions (view-only) |
| Charlie in Tenant A | 6 | Tenant isolation (all denied) |
| Role Membership | 3 | Verify user role assignments |
| **Total** | **39** | **Complete coverage** |

### Running Tests

**Option A: Shell Script (Recommended for automation)**

```bash
# Run full test suite
./test-multi-tenant-rbac.sh

# Expected output:
# ========================================
# Test Summary
# ========================================
# Passed: 39
# Failed: 0
# Total:  39
#
# 🎉 All tests passed!
```

**Option B: Postman Collection (Recommended for manual testing)**

```bash
# Import collection into Postman
Multi-Tenant-RBAC.postman_collection.json

# Or run with Newman CLI
newman run Multi-Tenant-RBAC.postman_collection.json
```

See **[POSTMAN_COLLECTION.md](POSTMAN_COLLECTION.md)** for detailed Postman usage guide.

---

## Documentation

### Available Documentation

| Document | Description |
|----------|-------------|
| **[README.md](README.md)** | This file - overview and quick start |
| **[approach-tenant-centric.md](approach-tenant-centric.md)** | Detailed architecture and tuple structure |
| **[ALICE_HIERARCHY.md](ALICE_HIERARCHY.md)** | Visual diagrams of Alice's authorization paths |
| **[COMPREHENSIVE_TEST_CASES.md](COMPREHENSIVE_TEST_CASES.md)** | Complete test case documentation (39 tests) |
| **[POSTMAN_COLLECTION.md](POSTMAN_COLLECTION.md)** | Postman collection usage guide |
| **[Multi-Tenant-RBAC.postman_collection.json](Multi-Tenant-RBAC.postman_collection.json)** | Postman collection (60 requests) |
| **[Keto-Multi-Tenant-RBAC.postman_environment.json](Keto-Multi-Tenant-RBAC.postman_environment.json)** | Postman environment variables |
| **[test-multi-tenant-rbac.sh](test-multi-tenant-rbac.sh)** | Automated test script (39 tests) |
| **[TEST_RESULTS.md](TEST_RESULTS.md)** | Test execution results and verification |
| **[problem.md](problem.md)** | Problem analysis and solution approaches |

### Key Concepts

**Tenant-Centric Approach:**
```
user:alice → tenant:a (as admin) → tenant:a#product:items (create permission)
```

**Multi-Tenant User:**
```
user:alice → tenant:a (admin)    → Full privileges in Tenant A
user:alice → tenant:b (customer) → Read-only in Tenant B
```

**Tenant Isolation:**
```
user:bob → tenant:a (moderator) → Can access Tenant A
user:bob → tenant:b (no role)   → Cannot access Tenant B
```

### Implementation Details

For complete implementation details including:
- Full tuple setup
- Authorization test scenarios
- Debug queries
- Application integration examples
- JavaScript/Node.js helper functions
- Express.js middleware

See **[approach-tenant-centric.md](approach-tenant-centric.md)**

---

## Advantages of This Approach

1. **Natural Hierarchy** - `user → tenant → role → resource` matches intuitive mental model
2. **Multi-Tenant Users** - Same user can have different roles in different tenants
3. **Tenant Isolation** - Complete separation between tenants
4. **Flexible Roles** - Each tenant defines its own role hierarchy
5. **Single Query** - Keto resolves full relationship chain in one check
6. **Clear Debugging** - Easy to inspect user's role in each tenant
7. **Scalable** - Add new tenants or users without modifying existing tuples

---

## License

Part of the ORY Keto self-hosted demonstration project.
