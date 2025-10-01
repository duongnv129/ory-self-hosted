# Comprehensive Oathkeeper Authentication and Authorization Tests

This repository contains scripts to test the complete flow of authentication and authorization using ORY stack components (Kratos, Keto, Oathkeeper) in a multi-tenancy setup with RBAC permissions.

## Scripts

### 1. `comprehensive-oathkeeper-test.sh`
A bash script that replicates all test cases from the Postman collection `Comprehensive_Oathkeeper_Test.postman_collection.json`.

**Features:**
- Health checks for all services (Keto, Kratos, Oathkeeper)
- Setup of RBAC roles and permissions (Admin, Moderator, Customer)
- Creation of test users (Alice, Bob, Charlie) with appropriate roles
- Authorization tests for each user role
- Debug queries to verify role expansion and permissions

### 2. `clean-kratos-identities.sh`
A cleanup script that removes test identities to prevent conflicts when running tests multiple times.

## Prerequisites

Make sure the following services are running:
- Kratos on ports 4433 (public) and 4434 (admin)
- Keto on ports 4466 (read) and 4467 (write)
- Oathkeeper on port 4455
- Multi-tenancy demo app

## Usage

### Running the Tests

1. **First, clean up any existing test identities:**
   ```bash
   bash clean-kratos-identities.sh
   ```

2. **Then run the comprehensive test:**
   ```bash
   bash comprehensive-oathkeeper-test.sh
   ```

### Expected Results

The test suite includes:
- 4 health checks
- 9 RBAC relation setups
- 6 user operations (3 creations + 3 sessions)
- 18 authorization tests (6 for Alice, 6 for Bob, 6 for Charlie)
- 3 debug queries

Expected success pattern:
- Alice (Admin): 6/6 authorization tests pass
- Bob (Moderator): 4/6 authorization tests pass (2 fail as expected)
- Charlie (Customer): 2/6 authorization tests pass (4 fail as expected)

Total: 12/18 authorization tests should pass (67% success rate)

## Troubleshooting

If tests fail due to identity conflicts, run the cleanup script first:
```bash
bash clean-kratos-identities.sh
bash comprehensive-oathkeeper-test.sh
```

If services are not accessible, ensure all required services are running and check the configuration values in the script (BASE_URL, ports, etc.).
