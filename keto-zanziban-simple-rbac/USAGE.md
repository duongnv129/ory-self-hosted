# Postman Collection Usage Guide

## Quick Start

### Prerequisites

- ORY Keto services running:
  - Read service: `http://localhost:4466`
  - Write service: `http://localhost:4467`
- Postman installed with the collection imported

### Import Collection

1. Import `Keto Zanzibar.postman_collection.json` into Postman
2. Collection includes environment variables (no separate environment file needed)

## Test Execution Steps

### Step 1: Setup Relations (Required First)

Run the **"Setup Relations"** folder in the following order:

#### 1.1 Role Hierarchy

- **"Create moderator Role Hierarchies"** - Sets up `role:customer ← role:moderator` inheritance
- **"Create Admin Role Hierarchies"** - Sets up `role:moderator ← role:admin` inheritance

#### 1.2 Role Access Permissions

- **"Product - View to Customer Role"** - Grants view permission to customer role
- **"Product - Create to Moderator Role"** - Grants create permission to moderator role
- **"Product - Delete to Admin Role"** - Grants delete permission to admin role
- **"Category - View to Customer Role"** - Grants view permission to customer role
- **"Category - Update to Moderator Role"** - Grants update permission to moderator role
- **"Category - Create to Admin Role"** - Grants create permission to admin role

#### 1.3 User Role Assignments

- **"Create Employment - Charlie Customer"** - Assigns Charlie to customer role
- **"Create Employment - Bob Moderator"** - Assigns Bob to moderator role
- **"Create Employment - Alice Admin"** - Assigns Alice to admin role

#### 1.4 System Verification

- **"Health Check - Keto Read Service"** - Verifies read service is healthy
- **"Health Check - Keto Write Service"** - Verifies write service is healthy
- **"Clean Namespace"** - Optional cleanup of existing relations

### Step 2: Authorization Tests

Run authorization test folders to verify permissions:

#### 2.1 Alice (Admin) Tests

All should return `{"allowed": true}`:

- ✅ **"Alice CAN create Product"**
- ✅ **"Alice CAN delete Product"**
- ✅ **"Alice CAN view Product"**
- ✅ **"Alice CAN create Category"**
- ✅ **"Alice CAN update Category"**
- ✅ **"Alice CAN view Category"**

#### 2.2 Bob (Moderator) Tests - Complete Coverage

Mixed results based on moderator permissions with full test coverage:

**✅ ALLOWED Operations:**

- ✅ **"Bob CAN create Product"** - Should return `{"allowed": true}`
- ✅ **"Bob CAN view Product"** - Should return `{"allowed": true}`
- ✅ **"Bob CAN update Category"** - Should return `{"allowed": true}`
- ✅ **"Bob CAN view Category"** - Should return `{"allowed": true}`

**❌ DENIED Operations:**

- ❌ **"Bob CANNOT delete Product"** - Should return `{"allowed": false}` with HTTP 200
- ❌ **"Bob CANNOT create Category"** - Should return `{"allowed": false}` with HTTP 200

#### 2.3 Charlie (Customer) Tests - Complete Coverage

Charlie has customer role permissions - **view only access**:

**✅ ALLOWED Operations:**

- ✅ **"Charlie CAN view Product"** - Should return `{"allowed": true}`
- ✅ **"Charlie CAN view Category"** - Should return `{"allowed": true}`

**❌ DENIED Operations:**

- ❌ **"Charlie CANNOT create Product"** - Should return `{"allowed": false}`
- ❌ **"Charlie CANNOT delete Product"** - Should return `{"allowed": false}`
- ❌ **"Charlie CANNOT create Category"** - Should return `{"allowed": false}`
- ❌ **"Charlie CANNOT update Category"** - Should return `{"allowed": false}`

All denied operations return HTTP 200 with `{"allowed": false}` - not HTTP errors.

### Step 3: Debug Queries

Use debug queries to inspect the authorization system:

#### 3.1 Role Expansion

- **"Debug - Admin Role hierarchies"** - Expands admin role membership tree
- **"Debug - Moderator Role hierarchies"** - Expands moderator role membership tree
- **"Debug - Customer Role hierarchies"** - Expands customer role membership tree

#### 3.2 User Verification

- **"Debug - Is Alice Admin?"** - Verifies Alice's admin role membership
- **"Debug - Can Alice View Product"** - Expands Alice's product view permissions
- **"Debug - Expand Product View Relations"** - Shows complete product view permission tree

### Step 4: Verification

- **"Verification - List All Relations"** - Lists all created relation tuples in the namespace

## Expected Test Results

### Setup Phase Results

All setup requests should return:

- **HTTP Status**: 200 or 201
- **Response**: Success confirmation

### Authorization Phase Results

| User    | Role      | Test            | Expected Result      |
| ------- | --------- | --------------- | -------------------- |
| Alice   | Admin     | Product Create  | `{"allowed": true}`  |
| Alice   | Admin     | Product Delete  | `{"allowed": true}`  |
| Alice   | Admin     | Product View    | `{"allowed": true}`  |
| Alice   | Admin     | Category Create | `{"allowed": true}`  |
| Alice   | Admin     | Category Update | `{"allowed": true}`  |
| Alice   | Admin     | Category View   | `{"allowed": true}`  |
| Bob     | Moderator | Product Create  | `{"allowed": true}`  |
| Bob     | Moderator | Product Delete  | `{"allowed": false}` |
| Bob     | Moderator | Product View    | `{"allowed": true}`  |
| Charlie | Customer  | Product View    | `{"allowed": true}`  |
| Charlie | Customer  | Category View   | `{"allowed": true}`  |
| Charlie | Customer  | Product Create  | `{"allowed": false}` |
| Charlie | Customer  | Product Delete  | `{"allowed": false}` |
| Charlie | Customer  | Category Create | `{"allowed": false}` |
| Charlie | Customer  | Category Update | `{"allowed": false}` |

### Debug Phase Results

Debug queries should return:

- **Expansion queries**: Tree structures showing role relationships
- **Role verification**: Confirmation of user role assignments
- **Permission trees**: Complete permission inheritance chains

## Collection Variables

The collection uses these environment variables:

```
keto_read_url: http://localhost:4466
keto_write_url: http://localhost:4467
namespace: simple-rbac
```

## API Endpoints Tested

### Read Service (localhost:4466)

- `GET /health/ready` - Health check
- `GET /relation-tuples/check` - Authorization verification
- `GET /relation-tuples/expand` - Relationship expansion
- `GET /relation-tuples` - List all relations

### Write Service (localhost:4467)

- `GET /health/ready` - Health check
- `PUT /admin/relation-tuples` - Create/update relations
- `DELETE /admin/relation-tuples` - Delete relations

## Troubleshooting

### Common Issues

#### Tests Failing with "allowed": false

1. Ensure Setup Relations folder was run completely first
2. Check that role hierarchy is properly established
3. Verify user role assignments were created

#### Health Checks Failing

1. Verify Keto services are running:
   ```bash
   curl http://localhost:4466/health/ready
   curl http://localhost:4467/health/ready
   ```
2. Check Docker containers are up
3. Verify port availability

#### Cross-Tenant Tests Failing

The collection includes some test cases referencing tenant scenarios and eKYC products that are not set up in the relations. These tests are expected to fail with the current setup.

### Debugging Commands

```bash
# Check if relations were created
curl "http://localhost:4466/relation-tuples?namespace=simple-rbac" | jq

# Manual authorization test
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=simple-rbac" \
  --data-urlencode "object=product:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:alice"

# Check role expansion
curl -G "http://localhost:4466/relation-tuples/expand" \
  --data-urlencode "namespace=simple-rbac" \
  --data-urlencode "object=role:admin" \
  --data-urlencode "relation=member" \
  --data-urlencode "max-depth=3"
```

## Test Coverage

This Postman collection tests:

✅ **Role-based permissions**: User-role assignments
✅ **Hierarchical RBAC**: Role inheritance via subject sets
✅ **Resource permissions**: Product and category access control
✅ **Permission inheritance**: Higher roles inherit lower role permissions
✅ **Authorization queries**: Single-query permission checks
✅ **System health**: Service availability verification
✅ **Debug capabilities**: Relationship expansion and inspection

❌ **Not covered**: Multi-tenant scenarios, complex product hierarchies, cross-namespace authorization

This collection provides a solid foundation for testing ORY Keto's Zanzibar-style authorization with hierarchical RBAC in a single-namespace setup.
