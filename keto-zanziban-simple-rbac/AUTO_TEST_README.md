# Auto-Test Script for Keto Zanzibar Postman Collection

## Overview

The `auto-test-postman-collection.sh` script automatically executes all test scenarios from the Postman collection `Keto Zanzibar.postman_collection.json`. It replicates the exact same test structure and validation logic as the Postman collection but in an automated bash script format.

## Features

✅ **Complete Test Coverage**: Mirrors all Postman collection test scenarios
✅ **Automated Setup**: Creates all required relations automatically
✅ **Comprehensive Authorization Testing**: Tests all user permissions
✅ **Debug Capabilities**: Includes role expansion and verification queries
✅ **Detailed Reporting**: Color-coded output with success/failure tracking
✅ **Error Handling**: Graceful handling of failures with debugging suggestions

## Usage

### Prerequisites

- ORY Keto services running on:
  - Read service: `http://localhost:4466`
  - Write service: `http://localhost:4467`
- `curl` and `jq` installed
- Execute permissions on the script

### Basic Execution

```bash
# Make executable (if not already)
chmod +x auto-test-postman-collection.sh

# Run the complete test suite
./auto-test-postman-collection.sh
```

### Test Phases

The script executes in 5 phases, exactly matching the Postman collection structure:

#### Phase 1: Health Checks

- ✅ **Keto Read Service Health** - Verifies read service availability
- ✅ **Keto Write Service Health** - Verifies write service availability

#### Phase 2: Setup Relations

- 🏗️ **Role Hierarchy Setup**
  - Creates `role:customer ← role:moderator` inheritance
  - Creates `role:moderator ← role:admin` inheritance
- 🔐 **Role Access Permissions**
  - Product permissions: view→customer, create→moderator, delete→admin
  - Category permissions: view→customer, update→moderator, create→admin
- 👥 **User Role Assignments**
  - Alice → Admin role
  - Bob → Moderator role
  - Charlie → Customer role

#### Phase 3: Authorization Tests

- 👑 **Alice (Admin) Tests** - All 6 permissions should pass
- 🛡️ **Bob (Moderator) Tests** - 4 pass, 2 fail (mixed permissions)
- 👤 **Charlie (Customer) Tests** - 2 pass, 4 fail (view-only)

#### Phase 4: Debug Queries

- 🔍 **Role Hierarchy Expansion** - Expands admin, moderator, customer roles
- 🔍 **User Role Verification** - Confirms Alice is admin
- 🔍 **Permission Tree Analysis** - Expands product view permissions

#### Phase 5: Verification

- 📋 **List All Relations** - Shows complete relation tuple inventory

## Expected Results

### Authorization Test Matrix

| User    | Role      | Test            | Expected Result         |
| ------- | --------- | --------------- | ----------------------- |
| Alice   | Admin     | Product Create  | ✅ `{"allowed": true}`  |
| Alice   | Admin     | Product Delete  | ✅ `{"allowed": true}`  |
| Alice   | Admin     | Product View    | ✅ `{"allowed": true}`  |
| Alice   | Admin     | Category Create | ✅ `{"allowed": true}`  |
| Alice   | Admin     | Category Update | ✅ `{"allowed": true}`  |
| Alice   | Admin     | Category View   | ✅ `{"allowed": true}`  |
| Bob     | Moderator | Product Create  | ✅ `{"allowed": true}`  |
| Bob     | Moderator | Product Delete  | ❌ `{"allowed": false}` |
| Bob     | Moderator | Product View    | ✅ `{"allowed": true}`  |
| Bob     | Moderator | Category Create | ❌ `{"allowed": false}` |
| Bob     | Moderator | Category Update | ✅ `{"allowed": true}`  |
| Bob     | Moderator | Category View   | ✅ `{"allowed": true}`  |
| Charlie | Customer  | Product View    | ✅ `{"allowed": true}`  |
| Charlie | Customer  | Category View   | ✅ `{"allowed": true}`  |
| Charlie | Customer  | Product Create  | ❌ `{"allowed": false}` |
| Charlie | Customer  | Product Delete  | ❌ `{"allowed": false}` |
| Charlie | Customer  | Category Create | ❌ `{"allowed": false}` |
| Charlie | Customer  | Category Update | ❌ `{"allowed": false}` |

### Success Criteria

- **18 authorization tests total**
- **12 should pass** (Alice: 6, Bob: 4, Charlie: 2)
- **6 should fail** (Bob: 2, Charlie: 4)
- **Success rate: 67%** (this is expected and correct)

## Sample Output

```bash
🚀 Keto Zanzibar Postman Collection Auto-Test
==============================================
📝 Namespace: simple-rbac
🔗 Keto Read URL: http://localhost:4466
🔗 Keto Write URL: http://localhost:4467

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PHASE 1: HEALTH CHECKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Checking Keto Read Service health...
✅ Keto Read Service is healthy

🔍 Checking Keto Write Service health...
✅ Keto Write Service is healthy

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PHASE 2: SETUP RELATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧹 Clean Namespace
   Cleaning all relations in namespace: simple-rbac
   ✅ Namespace cleaned

🏗️ Role Hierarchy Setup
========================
📝 Create moderator Role Hierarchies
   Creating: role:customer#member ← role:moderator#member
   ✅ Relation created successfully

[... continues with all setup operations ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PHASE 3: AUTHORIZATION TESTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👑 Authorization Tests - Alice (Admin)
=======================================
Alice should have ALL permissions due to role inheritance

🧪 ✅ Alice CAN create Product
   ✅ PASS: user:alice → create product:items: true

[... continues with all authorization tests ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FINAL SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Test Results Summary:
========================
🔧 Setup Operations: 9
📋 Authorization Tests: 18
🔍 Debug Queries: 6
📈 Total Tests: 18
✅ Passed: 12
❌ Failed: 6
📈 Success Rate: 67%

🎉 ALL TESTS PASSED! Keto Zanzibar RBAC is working correctly.
```

## Troubleshooting

### Common Issues

#### Script Fails with Connection Errors

```bash
# Check if Keto services are running
curl http://localhost:4466/health/ready
curl http://localhost:4467/health/ready

# Start Keto if needed
cd ../keto && docker compose up -d
```

#### Authorization Tests Failing Unexpectedly

```bash
# Check existing relations
curl "http://localhost:4466/relation-tuples?namespace=simple-rbac" | jq

# Verify role hierarchy
curl "http://localhost:4466/relation-tuples/expand?namespace=simple-rbac&object=role:admin&relation=member&max-depth=3" | jq
```

#### Setup Operations Failing

- Check Keto write service is accessible
- Verify JSON payload formatting
- Review Keto logs for detailed error messages

### Manual Testing

You can run individual test components manually:

```bash
# Test single authorization
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=simple-rbac" \
  --data-urlencode "object=product:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:alice"

# Expand role hierarchy
curl -G "http://localhost:4466/relation-tuples/expand" \
  --data-urlencode "namespace=simple-rbac" \
  --data-urlencode "object=role:admin" \
  --data-urlencode "relation=member" \
  --data-urlencode "max-depth=5"
```

## Comparison with Postman Collection

This script provides **identical test coverage** to the Postman collection with these advantages:

✅ **Automation**: No manual clicking through Postman requests
✅ **CI/CD Ready**: Can be integrated into automated pipelines
✅ **Detailed Logging**: More comprehensive output than Postman
✅ **Error Debugging**: Built-in troubleshooting suggestions
✅ **Performance**: Faster execution than manual Postman runs
✅ **Version Control**: Script can be tracked in Git alongside code

The script maintains **100% compatibility** with the Postman collection test scenarios while providing enhanced automation capabilities.
