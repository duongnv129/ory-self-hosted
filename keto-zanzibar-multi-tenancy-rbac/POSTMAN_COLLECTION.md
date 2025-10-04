# Postman Collection Guide

## Overview

The Postman collection provides a comprehensive test suite for the tenant-centric multi-tenancy RBAC implementation using ORY Keto.

### Files Included

- **Multi-Tenant-RBAC.postman_collection.json** - Main collection with 60 requests
- **Keto-Multi-Tenant-RBAC.postman_environment.json** - Pre-configured environment variables
- **POSTMAN_COLLECTION.md** - This documentation file

## Collection Structure

```
Multi-Tenant RBAC Collection
├── Setup (20 requests)
│   ├── Cleanup All Relations
│   ├── Tenant A Setup (11 requests)
│   └── Tenant B Setup (9 requests)
│
├── Alice - Tenant A (Admin) (6 tests)
│   ├── TC-A-A-01: View Products ✅
│   ├── TC-A-A-02: Create Products ✅
│   ├── TC-A-A-03: Delete Products ✅
│   ├── TC-A-A-04: View Categories ✅
│   ├── TC-A-A-05: Update Categories ✅
│   └── TC-A-A-06: Create Categories ✅
│
├── Alice - Tenant B (Customer) (6 tests)
│   ├── TC-A-B-01: View Products ✅
│   ├── TC-A-B-02: Create Products ❌
│   ├── TC-A-B-03: Delete Products ❌
│   ├── TC-A-B-04: View Categories ✅
│   ├── TC-A-B-05: Update Categories ❌
│   └── TC-A-B-06: Create Categories ❌
│
├── Bob - Tenant A (Moderator) (6 tests)
│   ├── TC-B-A-01: View Products ✅
│   ├── TC-B-A-02: Create Products ✅
│   ├── TC-B-A-03: Delete Products ❌
│   ├── TC-B-A-04: View Categories ✅
│   ├── TC-B-A-05: Update Categories ✅
│   └── TC-B-A-06: Create Categories ❌
│
├── Bob - Tenant B (Isolation) (6 tests)
│   ├── TC-B-B-01: View Products ❌
│   ├── TC-B-B-02: Create Products ❌
│   ├── TC-B-B-03: Delete Products ❌
│   ├── TC-B-B-04: View Categories ❌
│   ├── TC-B-B-05: Update Categories ❌
│   └── TC-B-B-06: Create Categories ❌
│
├── Charlie - Tenant B (Customer) (6 tests)
│   ├── TC-C-B-01: View Products ✅
│   ├── TC-C-B-02: Create Products ❌
│   ├── TC-C-B-03: Delete Products ❌
│   ├── TC-C-B-04: View Categories ✅
│   ├── TC-C-B-05: Update Categories ❌
│   └── TC-C-B-06: Create Categories ❌
│
├── Charlie - Tenant A (Isolation) (6 tests)
│   ├── TC-C-A-01: View Products ❌
│   ├── TC-C-A-02: Create Products ❌
│   ├── TC-C-A-03: Delete Products ❌
│   ├── TC-C-A-04: View Categories ❌
│   ├── TC-C-A-05: Update Categories ❌
│   └── TC-C-A-06: Create Categories ❌
│
├── Role Membership (3 tests)
│   ├── TC-RM-01: Alice is Admin in Tenant A ✅
│   ├── TC-RM-02: Alice is Customer in Tenant B ✅
│   └── TC-RM-03: Bob is Moderator in Tenant A ✅
│
└── Cleanup (1 request)
    └── Delete All Relations
```

**Total:** 60 requests (20 setup + 39 tests + 1 cleanup)

---

## Quick Start

### 1. Import Collection

**Option A: Import from File**
```bash
# In Postman, click Import
# Select both files:
#   - Multi-Tenant-RBAC.postman_collection.json (collection)
#   - Keto-Multi-Tenant-RBAC.postman_environment.json (environment)
```

**Option B: Import from URL**
```
# Copy the raw GitHub URL and paste into Postman import
```

### 2. Configure Environment

**Option A: Import Pre-configured Environment (Recommended)**

Import the included environment file:
```
Keto-Multi-Tenant-RBAC.postman_environment.json
```

This includes:
- ✅ `keto_read_url`: `http://localhost:4466`
- ✅ `keto_write_url`: `http://localhost:4467`
- ✅ `namespace`: `default`

**Option B: Use Collection Variables**

The collection has built-in variables as fallback:

| Variable | Value | Description |
|----------|-------|-------------|
| `keto_read_url` | `http://localhost:4466` | Keto Read API endpoint |
| `keto_write_url` | `http://localhost:4467` | Keto Write API endpoint |
| `namespace` | `default` | Keto namespace |

**Setting Variables:**
1. Click on the collection name
2. Go to "Variables" tab
3. Values are pre-configured, adjust if needed
4. Click "Save"

**Option C: Create Custom Environment**

For different setups (staging, production):
1. Click "Environments" in left sidebar
2. Click "+" to create new environment
3. Add variables with custom values
4. Select environment from dropdown

### 3. Run Setup

Before running tests, execute the **Setup** folder:

```
Setup Folder → Run
```

This creates:
- User role assignments
- Role hierarchies
- Resource permissions

### 4. Run Tests

**Option A: Run Entire Collection**
```
Collection → Run
```

**Option B: Run Individual Folders**
```
Alice - Tenant A → Run
Alice - Tenant B → Run
Bob - Tenant A → Run
... etc
```

**Option C: Run Individual Requests**
```
Click any test → Send
```

### 5. View Results

**Test Results Panel:**
- Green ✅: Test passed
- Red ❌: Test failed
- View detailed test output in "Test Results" tab

**Expected Results:**
```
✅ All 39 tests passed
❌ 0 tests failed
```

---

## Test Case Mapping

### Test Case Reference

Each request is mapped to a test case from COMPREHENSIVE_TEST_CASES.md:

| Test ID | Description | Expected |
|---------|-------------|----------|
| **TC-A-A-01** | Alice views products in Tenant A | ✅ Allowed |
| **TC-A-A-02** | Alice creates products in Tenant A | ✅ Allowed |
| **TC-A-A-03** | Alice deletes products in Tenant A | ✅ Allowed |
| **TC-A-A-04** | Alice views categories in Tenant A | ✅ Allowed |
| **TC-A-A-05** | Alice updates categories in Tenant A | ✅ Allowed |
| **TC-A-A-06** | Alice creates categories in Tenant A | ✅ Allowed |
| **TC-A-B-01** | Alice views products in Tenant B | ✅ Allowed |
| **TC-A-B-02** | Alice creates products in Tenant B | ❌ Denied |
| **TC-A-B-03** | Alice deletes products in Tenant B | ❌ Denied |
| **TC-A-B-04** | Alice views categories in Tenant B | ✅ Allowed |
| **TC-A-B-05** | Alice updates categories in Tenant B | ❌ Denied |
| **TC-A-B-06** | Alice creates categories in Tenant B | ❌ Denied |

*(See COMPREHENSIVE_TEST_CASES.md for complete mapping)*

---

## Setup Requests Explained

### Cleanup
```http
DELETE {{keto_write_url}}/admin/relation-tuples?namespace={{namespace}}
```
Removes all existing relation tuples to ensure clean state.

### User Role Assignments

**Tenant A:**
```json
// Alice as Admin
{
  "namespace": "default",
  "object": "tenant:a",
  "relation": "admin",
  "subject_id": "user:alice"
}

// Bob as Moderator
{
  "namespace": "default",
  "object": "tenant:a",
  "relation": "moderator",
  "subject_id": "user:bob"
}
```

**Tenant B:**
```json
// Alice as Customer
{
  "namespace": "default",
  "object": "tenant:b",
  "relation": "customer",
  "subject_id": "user:alice"
}

// Charlie as Customer
{
  "namespace": "default",
  "object": "tenant:b",
  "relation": "customer",
  "subject_id": "user:charlie"
}
```

### Role Hierarchies

**Tenant A (3-tier):**
```json
// Admin inherits Moderator
{
  "object": "tenant:a",
  "relation": "moderator",
  "subject_set": {
    "object": "tenant:a",
    "relation": "admin"
  }
}

// Moderator inherits Customer
{
  "object": "tenant:a",
  "relation": "customer",
  "subject_set": {
    "object": "tenant:a",
    "relation": "moderator"
  }
}
```

**Tenant B (2-tier):**
```json
// Admin inherits Customer
{
  "object": "tenant:b",
  "relation": "customer",
  "subject_set": {
    "object": "tenant:b",
    "relation": "admin"
  }
}
```

### Resource Permissions

**Product Permissions (Tenant A):**
```json
// Customers can view
{"object": "tenant:a#product:items", "relation": "view", "subject_set": "tenant:a#customer"}

// Moderators can create
{"object": "tenant:a#product:items", "relation": "create", "subject_set": "tenant:a#moderator"}

// Admins can delete
{"object": "tenant:a#product:items", "relation": "delete", "subject_set": "tenant:a#admin"}
```

**Category Permissions (Tenant A):**
```json
// Customers can view
{"object": "tenant:a#category:items", "relation": "view", "subject_set": "tenant:a#customer"}

// Moderators can update
{"object": "tenant:a#category:items", "relation": "update", "subject_set": "tenant:a#moderator"}

// Admins can create
{"object": "tenant:a#category:items", "relation": "create", "subject_set": "tenant:a#admin"}
```

---

## Test Assertions

Each test includes automatic assertions:

```javascript
// Status code check
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

// Permission check (allowed)
pm.test('Alice can view products in Tenant A', function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.allowed).to.eql(true);
});

// Permission check (denied)
pm.test('Alice CANNOT create products in Tenant B', function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.allowed).to.eql(false);
});
```

---

## Advanced Usage

### Collection Runner

**Run with Collection Runner:**
1. Click "Run" button on collection
2. Select folders to run
3. Configure iterations (default: 1)
4. Click "Run Multi-Tenant RBAC"
5. View summary report

**Export Results:**
- Click "Export Results" after run
- Save as JSON or CSV
- Use for CI/CD reporting

### Newman (CLI)

Run collection from command line:

```bash
# Install Newman
npm install -g newman

# Option A: Run with environment file (recommended)
newman run Multi-Tenant-RBAC.postman_collection.json \
  --environment Keto-Multi-Tenant-RBAC.postman_environment.json

# Option B: Run with inline environment variables
newman run Multi-Tenant-RBAC.postman_collection.json \
  --env-var "keto_read_url=http://localhost:4466" \
  --env-var "keto_write_url=http://localhost:4467" \
  --env-var "namespace=default"

# Run with reporters
newman run Multi-Tenant-RBAC.postman_collection.json \
  --environment Keto-Multi-Tenant-RBAC.postman_environment.json \
  --reporters cli,json,html \
  --reporter-html-export report.html

# Run specific folder
newman run Multi-Tenant-RBAC.postman_collection.json \
  --environment Keto-Multi-Tenant-RBAC.postman_environment.json \
  --folder "Alice - Tenant A (Admin)"
```

### CI/CD Integration

**GitHub Actions Example:**
```yaml
name: Keto RBAC Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Start Keto
        run: docker-compose up -d keto

      - name: Wait for Keto
        run: sleep 10

      - name: Install Newman
        run: npm install -g newman

      - name: Run Tests with Environment File
        run: |
          cd keto-zanzibar-multi-tenancy-rbac
          newman run Multi-Tenant-RBAC.postman_collection.json \
            --environment Keto-Multi-Tenant-RBAC.postman_environment.json \
            --reporters cli,json,junit \
            --reporter-junit-export results.xml

      - name: Publish Test Results
        uses: EnricoMi/publish-unit-test-result-action@v2
        if: always()
        with:
          files: keto-zanzibar-multi-tenancy-rbac/results.xml
```

**GitLab CI Example:**
```yaml
keto-rbac-test:
  stage: test
  image: postman/newman:alpine
  services:
    - postgres:13
  before_script:
    - docker-compose up -d keto
    - sleep 10
  script:
    - cd keto-zanzibar-multi-tenancy-rbac
    - newman run Multi-Tenant-RBAC.postman_collection.json
        --environment Keto-Multi-Tenant-RBAC.postman_environment.json
        --reporters cli,junit
        --reporter-junit-export results.xml
  artifacts:
    reports:
      junit: keto-zanzibar-multi-tenancy-rbac/results.xml
```

---

## Troubleshooting

### Connection Errors

**Problem:** `Error: connect ECONNREFUSED`

**Solution:**
```bash
# Check if Keto is running
curl http://localhost:4466/health/ready

# Start Keto if not running
cd keto && docker-compose up -d
```

### Test Failures

**Problem:** Tests failing with `{"allowed": false}` when expecting `true`

**Solution:**
1. Re-run Setup folder
2. Wait 1-2 seconds for relations to propagate
3. Check Keto logs: `docker-compose logs keto`

### Invalid Namespace

**Problem:** `404 Not Found` errors

**Solution:**
- Verify namespace variable is set to `default`
- Check Keto configuration for namespace setup

---

## Best Practices

### 1. Always Run Setup First
```
Setup → All Tests → Cleanup
```

### 2. Wait Between Operations
```javascript
// Add delay if needed
setTimeout(() => {
  // Run next request
}, 1000);
```

### 3. Check Keto Health
```bash
# Before running tests
curl http://localhost:4466/health/ready
curl http://localhost:4467/health/ready
```

### 4. Use Collection Runner for Bulk Testing
- Consistent execution order
- Detailed reporting
- Easy to reproduce issues

### 5. Export and Share Results
- Save test results for documentation
- Share with team members
- Track test history

---

## Comparison with Shell Script

| Feature | Postman Collection | Shell Script |
|---------|-------------------|--------------|
| **Platform** | Cross-platform GUI | Unix/Linux shell |
| **Setup** | Import and run | Requires bash, curl, jq |
| **Visualization** | Visual test results | Terminal output |
| **Assertions** | Built-in test framework | Manual parsing |
| **Reporting** | HTML/JSON reports | Text output |
| **CI/CD** | Newman CLI | Direct execution |
| **Debugging** | Request/response inspector | curl verbose mode |
| **Sharing** | Export/import JSON | Share script file |

**When to Use Postman:**
- ✅ Manual testing and exploration
- ✅ Team collaboration
- ✅ Visual test results
- ✅ Documentation and sharing
- ✅ Cross-platform compatibility

**When to Use Shell Script:**
- ✅ Automated CI/CD pipelines
- ✅ Server environments without GUI
- ✅ Quick command-line testing
- ✅ Integration with other scripts

---

## Related Files

- **Multi-Tenant-RBAC.postman_collection.json** - This collection
- **COMPREHENSIVE_TEST_CASES.md** - Detailed test case documentation
- **test-multi-tenant-rbac.sh** - Shell script equivalent
- **approach-tenant-centric.md** - Architecture documentation
- **README.md** - Project overview

---

## Support

For issues or questions:
1. Check test-multi-tenant-rbac.sh for equivalent bash commands
2. Review COMPREHENSIVE_TEST_CASES.md for expected results
3. Verify Keto setup in approach-tenant-centric.md
4. Check Keto logs for authorization errors

---

## License

Part of the ORY Keto self-hosted demonstration project.
