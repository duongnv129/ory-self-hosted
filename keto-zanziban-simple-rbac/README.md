# Keto Zanzibar Simple RBAC Test Suite

## Overview

This is a comprehensive test collection for Zanzibar single-query authorization model using ORY Keto. The test suite demonstrates a simple Role-Based Access Control (RBAC) system with three hierarchical roles and two resource types within a single namespace.

## Test Architecture

### Namespace Structure

- **Single Namespace**: `default`
- **Hierarchical RBAC Model**: Customer ← Moderator ← Admin (inheritance via subject sets)
- **Resources**: `product:items` and `category:items`

### Role Hierarchy

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

### User Assignments

- **Alice**: Admin role (`user:alice` → `role:admin`)
- **Bob**: Moderator role (`user:bob` → `role:moderator`)
- **Charlie**: Customer role (`user:charlie` → `role:customer`)

### Permission Matrix

| Role                   | Product View | Product Create | Product Delete | Category View | Category Create | Category Update |
| ---------------------- | ------------ | -------------- | -------------- | ------------- | --------------- | --------------- |
| **Alice (Admin)**      | ✅           | ✅             | ✅             | ✅            | ✅              | ✅              |
| **Bob (Moderator)**    | ✅           | ✅             | ❌             | ✅            | ❌              | ✅              |
| **Charlie (Customer)** | ✅           | ❌             | ❌             | ✅            | ❌              | ❌              |

**Legend:**

- ✅ Returns `{"allowed": true}` with HTTP 200
- ❌ Returns `{"allowed": false}` with HTTP 200

## Postman Collection Test Scenarios

### Setup Relations (Required First)

The collection includes comprehensive setup that must be run first:

#### 1. Role Hierarchy Setup

Creates inheritance relationships where higher roles inherit lower role permissions:

```json
// Moderator inherits Customer permissions
{
  "namespace": "default",
  "object": "role:customer",
  "relation": "member",
  "subject_set": {
    "namespace": "default",
    "object": "role:moderator",
    "relation": "member"
  }
}

// Admin inherits Moderator permissions
{
  "namespace": "default",
  "object": "role:moderator",
  "relation": "member",
  "subject_set": {
    "namespace": "default",
    "object": "role:admin",
    "relation": "member"
  }
}
```

#### 2. Resource Permissions Setup

Links roles to specific resource actions:

**Product Permissions:**

- Customer role → `view` permission
- Moderator role → `create` permission
- Admin role → `delete` permission

**Category Permissions:**

- Customer role → `view` permission
- Moderator role → `update` permission
- Admin role → `create` permission

#### 3. User Role Assignments

Direct user-to-role memberships:

```json
// Alice as Admin
{"namespace": "default", "object": "role:admin", "relation": "member", "subject_id": "user:alice"}

// Bob as Moderator
{"namespace": "default", "object": "role:moderator", "relation": "member", "subject_id": "user:bob"}

// Charlie as Customer
{"namespace": "default", "object": "role:customer", "relation": "member", "subject_id": "user:charlie"}
```

### Authorization Test Cases

#### Alice (Admin) - All Permissions Pass

The collection tests that Alice, as admin, can perform all operations due to role inheritance:

1. ✅ **Product Create**: `GET /relation-tuples/check?object=product:items&relation=create&subject_id=user:alice`
2. ✅ **Product Delete**: `GET /relation-tuples/check?object=product:items&relation=delete&subject_id=user:alice`
3. ✅ **Product View**: `GET /relation-tuples/check?object=product:items&relation=view&subject_id=user:alice`
4. ✅ **Category Create**: `GET /relation-tuples/check?object=category:items&relation=create&subject_id=user:alice`
5. ✅ **Category Update**: `GET /relation-tuples/check?object=category:items&relation=update&subject_id=user:alice`
6. ✅ **Category View**: `GET /relation-tuples/check?object=category:items&relation=view&subject_id=user:alice`

**Expected Response for all Alice tests:**

```json
{
  "allowed": true
}
```

#### Bob (Moderator) - Mixed Permissions

Tests moderator permissions with inheritance and role limitations:

**✅ ALLOWED Operations:**

1. **Product Create**: `GET /relation-tuples/check?object=product:items&relation=create&subject_id=user:bob`
2. **Product View**: `GET /relation-tuples/check?object=product:items&relation=view&subject_id=user:bob`
3. **Category Update**: `GET /relation-tuples/check?object=category:items&relation=update&subject_id=user:bob`
4. **Category View**: `GET /relation-tuples/check?object=category:items&relation=view&subject_id=user:bob`

**❌ DENIED Operations:** 5. **Product Delete**: `GET /relation-tuples/check?object=product:items&relation=delete&subject_id=user:bob` 6. **Category Create**: `GET /relation-tuples/check?object=category:items&relation=create&subject_id=user:bob`

**Expected Responses:**

- Allowed operations: `{"allowed": true}` with HTTP 200
- Denied operations: `{"allowed": false}` with HTTP 200

#### Charlie (Customer) - View Only Permissions

Charlie has customer role with strict view-only limitations:

**✅ ALLOWED Operations:**

1. **Product View**: `GET /relation-tuples/check?object=product:items&relation=view&subject_id=user:charlie`
2. **Category View**: `GET /relation-tuples/check?object=category:items&relation=view&subject_id=user:charlie`

**❌ DENIED Operations:** 3. **Product Create**: `GET /relation-tuples/check?object=product:items&relation=create&subject_id=user:charlie` 4. **Product Delete**: `GET /relation-tuples/check?object=product:items&relation=delete&subject_id=user:charlie` 5. **Category Create**: `GET /relation-tuples/check?object=category:items&relation=create&subject_id=user:charlie` 6. **Category Update**: `GET /relation-tuples/check?object=category:items&relation=update&subject_id=user:charlie`

**Expected Responses:**

- View operations: `{"allowed": true}` with HTTP 200
- All other operations: `{"allowed": false}` with HTTP 200

### Debug Queries

The collection includes debug functionality to inspect the authorization system:

#### 1. Role Hierarchy Expansion

```
GET /relation-tuples/expand?namespace=default&object=role:admin&relation=member&max-depth=10
GET /relation-tuples/expand?namespace=default&object=role:moderator&relation=member&max-depth=10
GET /relation-tuples/expand?namespace=default&object=role:customer&relation=member&max-depth=10
```

#### 2. User Role Verification

```
GET /relation-tuples/check?namespace=default&object=role:admin&relation=member&subject_id=user:alice
```

#### 3. Permission Tree Analysis

```
GET /relation-tuples/expand?namespace=default&object=product:items&relation=view&max-depth=3
```

### Health Checks

```
GET /health/ready  # Both read (4466) and write (4467) services
```

### Relation Management

```
DELETE /admin/relation-tuples?namespace=default  # Clean namespace
GET /relation-tuples?namespace=default          # List all relations
```

## API Endpoints Tested

### Keto Read Service (localhost:4466)

- **Health**: `/health/ready`
- **Authorization Check**: `/relation-tuples/check`
- **Relationship Expansion**: `/relation-tuples/expand`
- **List Relations**: `/relation-tuples`

### Keto Write Service (localhost:4467)

- **Health**: `/health/ready`
- **Create/Update Relations**: `PUT /admin/relation-tuples`
- **Delete Relations**: `DELETE /admin/relation-tuples`

## Request/Response Examples

### Authorization Check Request

```bash
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=default" \
  --data-urlencode "object=product:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:alice"
```

### Success Response

```json
{
  "allowed": true
}
```

### Denial Response

```json
{
  "allowed": false
}
```

### Relation Creation Request

```bash
curl -X PUT "http://localhost:4467/admin/relation-tuples" \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "default",
    "object": "role:admin",
    "relation": "member",
    "subject_id": "user:alice"
  }'
```

## Test Execution Order

1. **Setup Relations** folder - Run all requests in sequence:

   - Role hierarchy creation
   - Resource access permissions
   - User role assignments
   - Health checks
   - Namespace cleanup

2. **Authorization Tests** folders - Test user permissions:

   - Alice admin tests
   - Bob moderator tests
   - Charlie customer tests (view-only permissions)

3. **Debug Queries** - Inspect system state:

   - Role expansions
   - Permission trees
   - User role verification

4. **Verification** - List all relations to confirm setup

## Environment Variables

The collection uses these variables:

- `keto_read_url`: `http://localhost:4466`
- `keto_write_url`: `http://localhost:4467`
- `namespace`: `default`

## Validation Criteria

### Setup Phase

- All relation creation requests return HTTP 200/201
- Health checks return `{"status": "ok"}`
- Namespace cleanup succeeds

### Authorization Phase

- Admin tests: All return `{"allowed": true}`
- Moderator tests: Mixed results based on permission matrix
- Customer tests: Only view operations allowed

### Debug Phase

- Expansion queries return tree structures
- Role verification confirms user assignments
- Relation listing shows all created tuples

## Key Features Demonstrated

1. **Hierarchical RBAC**: Role inheritance via subject sets (Admin → Moderator → Customer)
2. **Complete Test Coverage**: Both positive authorization and denial scenarios tested
3. **Single Query Authorization**: Direct permission checks without multiple roundtrips
4. **Proper Error Handling**: Denied permissions return `{"allowed": false}`, not HTTP errors
5. **Namespace Isolation**: All relations within single `default` namespace
6. **Subject Set Relationships**: Indirect permissions through role membership
7. **Resource-Action Granularity**: Fine-grained permissions per resource and action
8. **Debug and Expansion**: Role hierarchy inspection via expand API

This test suite provides a focused validation of ORY Keto's Zanzibar-style authorization with hierarchical RBAC in a single namespace, demonstrating the core setup and query patterns for role-based access control without cross-tenant complexity.
