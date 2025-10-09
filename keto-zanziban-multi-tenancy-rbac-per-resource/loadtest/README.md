# Keto Resource-Scoped RBAC Performance Benchmarking Plan

## Overview

The resource-scoped RBAC approach presents unique performance characteristics due to **tuple explosion** (N × M × R tuples for users × tenants × resources) and fine-grained authorization checks. This benchmarking plan establishes performance baselines, identifies bottlenecks, and provides optimization strategies.

## Critical Performance Factors

### 1. Tuple Storage Scalability
- **Challenge**: Exponential growth with users/tenants/resources
- **Impact**: Database storage, query performance, memory usage
- **Metric**: Tuples per second insertion/deletion rates

### 2. Authorization Query Latency
- **Challenge**: Complex relationship traversal across resource boundaries
- **Impact**: API response times, user experience
- **Metric**: P50/P95/P99 authorization check latency

### 3. Multi-Tenant Isolation Performance
- **Challenge**: Tenant-scoped queries with resource filtering
- **Impact**: Cross-tenant data leakage prevention overhead
- **Metric**: Query execution time variance across tenant sizes

---

## Benchmark Test Scenarios

### Scenario 1: Tuple Explosion Impact
**Objective**: Measure performance degradation as tuple count increases

**Test Matrix**:
```
Users: 100, 1K, 10K, 100K
Tenants: 10, 50, 100, 500
Resources: 5, 10, 20, 50
Role Types: 3 (customer, moderator, admin)
```

**Measurements**:
- Tuple insertion rate (tuples/second)
- Authorization check latency (ms)
- Memory consumption (MB)
- Database query execution time (ms)

**Expected Results**:
- Linear growth: Insertion rate should scale linearly with tuple count
- Logarithmic latency: Query time should grow logarithmically, not linearly
- Memory efficiency: <1KB per tuple in active cache

### Scenario 2: Real-World Authorization Patterns
**Objective**: Test realistic authorization request patterns

**Load Profile**:
```
Alice Pattern (Multi-tenant user):
- 60% product:items checks (high frequency)
- 30% category:items checks (medium frequency)
- 10% cross-tenant checks (low frequency)

Bob Pattern (Single-tenant admin):
- 80% admin operations (create/delete)
- 20% view operations

Charlie Pattern (Customer):
- 95% view operations
- 5% failed permission checks
```

**Load Distribution**:
- 70% Alice-type users (complex multi-resource)
- 20% Bob-type users (admin power users)
- 10% Charlie-type users (read-only)

**Target SLAs**:
- Authorization check: <50ms P95
- Bulk permission check: <200ms for 100 resources
- Cross-tenant isolation: 0% data leakage under load

### Scenario 3: Resource Type Scaling
**Objective**: Measure impact of adding new resource types

**Test Progression**:
1. Baseline: 2 resource types (product, category)
2. Add: user, invoice, report (5 total)
3. Add: notification, audit, file, comment, tag (10 total)
4. Add: 10 more business-specific resources (20 total)

**Measurements per Addition**:
- Tuple creation overhead for existing users
- Query performance impact
- Cache invalidation costs
- Database index effectiveness

### Scenario 4: Hierarchical Permission Inheritance
**Objective**: Test role hierarchy performance impact

**Hierarchy Depth Tests**:
```
Shallow (2 levels): customer → admin
Medium (3 levels): customer → moderator → admin
Deep (5 levels): guest → customer → moderator → supervisor → admin
```

**Permission Check Patterns**:
- Direct permission: User has explicit role
- Inherited permission: User inherits via hierarchy
- Multiple inheritance: Role inherits from multiple parents
- Negative inheritance: Explicit denial overrides inheritance

---

## Performance Testing Implementation

### Load Testing Tools

**Primary**: Artillery.js for HTTP load testing
```javascript
// Example Artillery scenario
scenarios:
  - name: "Resource-scoped authorization load"
    weight: 100
    beforeRequest: "setTenantContext"
    flow:
      - get:
          url: "/products/list"
          headers:
            x-tenant-id: "{{ tenantId }}"
      - think: 1
      - post:
          url: "/products/create"
          json:
            name: "Test Product {{ $randomString() }}"
```

**Secondary**: k6 for Keto direct testing
```javascript
// Direct Keto authorization checks
import http from 'k6/http';

export default function() {
  const params = {
    namespace: 'resource-rbac',
    object: `tenant:${tenantId}#product:items`,
    relation: 'create',
    subject_id: `user:${userId}`
  };

  const response = http.get('http://localhost:4466/relation-tuples/check', {params});
  check(response, {
    'authorization check < 50ms': (r) => r.timings.duration < 50,
    'response is allowed': (r) => JSON.parse(r.body).allowed === true
  });
}
```

### Monitoring and Observability

**Database Performance**:
```sql
-- PostgreSQL monitoring queries
SELECT
  query,
  mean_exec_time,
  calls,
  total_exec_time
FROM pg_stat_statements
WHERE query LIKE '%relation_tuples%'
ORDER BY mean_exec_time DESC;
```

**Keto Metrics** (via Prometheus):
```yaml
# Key metrics to monitor
- keto_http_request_duration_seconds
- keto_sql_query_duration_seconds
- keto_relation_tuple_check_duration_seconds
- keto_cache_hit_ratio
```

**Custom Application Metrics**:
```typescript
// Performance tracking in application
interface AuthorizationMetrics {
  checkLatency: number;        // Time for single auth check
  bulkCheckLatency: number;    // Time for batch checks
  cacheHitRate: number;        // Percentage of cached responses
  tupleCount: number;          // Total tuples in system
  tenantIsolationTime: number; // Additional overhead for isolation
}
```

---

## Performance Optimization Strategies

### 1. Tuple Storage Optimization

**Index Strategy**:
```sql
-- Optimized indexes for resource-scoped queries
CREATE INDEX CONCURRENTLY idx_relation_tuples_resource_scoped
ON keto_relation_tuples (namespace, object, relation, subject_id)
WHERE namespace = 'resource-rbac';

-- Partial indexes for common patterns
CREATE INDEX CONCURRENTLY idx_relation_tuples_tenant_product
ON keto_relation_tuples (object, relation, subject_id)
WHERE namespace = 'resource-rbac' AND object LIKE 'tenant:%#product:items';
```

**Tuple Partitioning**:
```sql
-- Partition by tenant for better isolation
CREATE TABLE keto_relation_tuples_partitioned (
  LIKE keto_relation_tuples INCLUDING ALL
) PARTITION BY HASH (substring(object from 'tenant:([^#]+)'));

-- Create partitions for tenant sharding
CREATE TABLE keto_relation_tuples_p0 PARTITION OF keto_relation_tuples_partitioned
FOR VALUES WITH (modulus 10, remainder 0);
```

### 2. Caching Strategy

**Multi-Level Caching**:
```typescript
// Application-level caching
interface ResourcePermissionCache {
  // Level 1: Direct permission cache
  userResourcePermissions: Map<string, Set<string>>; // user:resource -> permissions

  // Level 2: Role inheritance cache
  roleHierarchyCache: Map<string, string[]>; // role -> inherited roles

  // Level 3: Tenant context cache
  tenantResourceCache: Map<string, ResourceInfo>; // tenant:resource -> metadata
}

// Cache invalidation strategy
class PermissionCacheManager {
  invalidateUserPermissions(userId: string, tenantId: string, resourceType: string) {
    // Targeted invalidation to minimize cache churn
    const cacheKey = `${userId}:${tenantId}:${resourceType}`;
    this.cache.delete(cacheKey);
  }
}
```

**Redis Caching Pattern**:
```typescript
// Distributed caching for multi-instance deployments
interface RedisCachePattern {
  // Short TTL for active permissions (5 minutes)
  activePermissions: {
    key: "perm:{userId}:{tenantId}:{resource}",
    ttl: 300,
    value: "create,read,update" // CSV of permissions
  };

  // Longer TTL for role definitions (1 hour)
  roleDefinitions: {
    key: "role:{tenantId}:{resource}:{roleName}",
    ttl: 3600,
    value: JSON.stringify(rolePermissions)
  };
}
```

### 3. Query Optimization

**Batch Authorization Checks**:
```typescript
// Optimize multiple permission checks
interface BatchAuthorizationRequest {
  userId: string;
  tenantId: string;
  checks: Array<{
    resource: string;
    action: string;
  }>;
}

// Single query for multiple permission checks
async function batchCheckPermissions(request: BatchAuthorizationRequest): Promise<Map<string, boolean>> {
  const query = `
    SELECT DISTINCT
      CONCAT(rt.object, '#', rt.relation) as permission_key,
      true as allowed
    FROM keto_relation_tuples rt
    WHERE rt.namespace = 'resource-rbac'
      AND rt.subject_id = $1
      AND rt.object LIKE $2
      AND (rt.object, rt.relation) IN (${buildInClause(request.checks)})
  `;

  // Single database round-trip for all checks
  return executeQuery(query, [request.userId, `tenant:${request.tenantId}#%`]);
}
```

### 4. Resource Type Management

**Lazy Resource Registration**:
```typescript
// Only create tuples when resources are actively used
class ResourceTypeManager {
  async ensureResourceType(tenantId: string, resourceType: string): Promise<void> {
    const exists = await this.checkResourceTypeExists(tenantId, resourceType);
    if (!exists) {
      // Create base permissions for new resource type
      await this.createDefaultResourcePermissions(tenantId, resourceType);
    }
  }

  // Bulk user onboarding for new resource types
  async addResourceTypeToAllUsers(tenantId: string, resourceType: string): Promise<void> {
    const users = await this.getTenantUsers(tenantId);
    const batchOperations = users.map(user => ({
      namespace: 'resource-rbac',
      object: `tenant:${tenantId}#${resourceType}:items`,
      relation: user.defaultRole || 'customer',
      subject_id: `user:${user.id}`
    }));

    await this.batchCreateTuples(batchOperations);
  }
}
```

---

## Performance Monitoring Dashboard

### Key Performance Indicators (KPIs)

**Authorization Performance**:
- Authorization check latency (P50/P95/P99)
- Bulk authorization latency (100 checks)
- Cache hit ratio (target: >90%)
- Failed authorization rate

**Scalability Metrics**:
- Tuples per tenant (growth rate)
- Query execution time vs tuple count
- Memory usage per active tenant
- Database connection pool utilization

**Business Impact Metrics**:
- User experience score (based on response times)
- Resource onboarding time (new resource type addition)
- Admin operation efficiency (bulk user management)
- System availability during peak load

### Alert Thresholds

**Critical Alerts** (P0 - Immediate Response):
```yaml
authorization_latency_p95: >500ms    # Authorization unusably slow
database_connection_exhaustion: >90% # System failure imminent
cache_hit_ratio: <70%               # Performance severely degraded
tuple_creation_errors: >5%          # Data integrity at risk
```

**Warning Alerts** (P1 - Investigate Soon):
```yaml
authorization_latency_p95: >100ms   # Performance degradation
memory_usage_growth: >20%/hour      # Potential memory leak
query_execution_time: >50ms         # Database optimization needed
tenant_isolation_failures: >0      # Security compliance issue
```

### Grafana Dashboard Panels

```json
{
  "dashboard": {
    "title": "Keto Resource-Scoped RBAC Performance",
    "panels": [
      {
        "title": "Authorization Latency Distribution",
        "type": "histogram",
        "targets": ["keto_relation_tuple_check_duration_seconds"]
      },
      {
        "title": "Tuple Growth Over Time",
        "type": "graph",
        "targets": ["count(keto_relation_tuples) by (namespace)"]
      },
      {
        "title": "Cache Performance",
        "type": "stat",
        "targets": ["keto_cache_hit_ratio", "keto_cache_size"]
      },
      {
        "title": "Database Query Performance",
        "type": "table",
        "targets": ["pg_stat_statements filtered by keto queries"]
      }
    ]
  }
}
```

---

## Performance Testing Schedule

### Phase 1: Baseline Establishment (Week 1)
- Day 1-2: Set up monitoring and tooling
- Day 3-4: Run baseline tests with minimal data
- Day 5: Document baseline performance characteristics

### Phase 2: Scalability Testing (Week 2)
- Day 1-2: Tuple explosion testing (up to 1M tuples)
- Day 3-4: Multi-tenant isolation under load
- Day 5: Resource type scaling impact assessment

### Phase 3: Optimization Implementation (Week 3)
- Day 1-2: Implement caching strategies
- Day 3-4: Database optimization and indexing
- Day 5: Application-level optimizations

### Phase 4: Load Testing & Validation (Week 4)
- Day 1-2: Production-like load testing
- Day 3-4: Stress testing and breaking point analysis
- Day 5: Performance tuning and final validation

### Phase 5: Documentation & Handoff (Week 5)
- Day 1-2: Performance runbook creation
- Day 3-4: Monitoring playbook documentation
- Day 5: Team training and knowledge transfer

---

## Expected Performance Targets

### Baseline Performance (1K users, 10 tenants, 5 resources)
```yaml
Authorization Check Latency:
  p50: <10ms
  p95: <25ms
  p99: <50ms

Database Performance:
  tuple_insertion_rate: >1000/second
  query_execution_time: <5ms average

Cache Performance:
  hit_ratio: >95%
  memory_usage: <100MB for active data
```

### Scale Performance (100K users, 500 tenants, 20 resources)
```yaml
Authorization Check Latency:
  p50: <20ms
  p95: <50ms
  p99: <100ms

Database Performance:
  tuple_insertion_rate: >500/second
  query_execution_time: <15ms average

Cache Performance:
  hit_ratio: >90%
  memory_usage: <2GB for active data
```

### Breaking Point Targets
```yaml
Maximum Sustainable Load:
  concurrent_users: 10,000
  requests_per_second: 50,000
  tuple_count: 10,000,000

Degradation Thresholds:
  authorization_latency_p95: 200ms (graceful degradation)
  database_cpu_usage: 80% (scale trigger)
  memory_usage: 80% of available (alert threshold)
```

---

## Deliverables

1. **Performance Test Suite**: Automated tests for all scenarios
2. **Monitoring Dashboard**: Real-time performance visibility
3. **Optimization Playbook**: Step-by-step performance tuning guide
4. **Capacity Planning Model**: Predictive scaling recommendations
5. **Incident Response Runbook**: Performance troubleshooting procedures

This comprehensive benchmarking plan ensures the resource-scoped RBAC approach can scale effectively while maintaining the fine-grained authorization capabilities that make it valuable for complex multi-tenant scenarios.

---

## Quick Start

### 1. Prerequisites

**Required**:
- K6 load testing tool (`brew install k6` or [download](https://k6.io/docs/get-started/installation/))
- Node.js 16+ (`node --version`)
- Keto running on `localhost:4466` (read) and `localhost:4467` (write)
- PostgreSQL accessible at `localhost:5432`

**Optional**:
- Prometheus/Grafana for real-time monitoring
- jq for JSON result parsing

**Verify setup**:
```bash
# Check K6
k6 version

# Check Keto health
curl http://localhost:4466/health/ready
curl http://localhost:4467/health/ready

# Install Node dependencies
npm install
```

### 2. Run Load Tests

**Using Makefile** (recommended):
```bash
# List available scenarios
make list-scenarios

# Run individual scenarios with stress profile
make test-scenario1    # Tuple Explosion Impact (~23 min)
make test-scenario2    # Authorization Patterns (~23 min)
make test-scenario3    # Resource Type Scaling (~23 min)
make test-scenario4    # Hierarchy Inheritance (~23 min)

# Run all scenarios
make test-all          # All with baseline profile
make test-stress       # All with stress/scale profile (10K VUs)

# Analyze results
make analyze           # Generate analysis reports
make analyze-sla       # Focus on SLA compliance
```

**Using Node.js runner**:
```bash
# Single scenario with stress profile
node run-tests.js --scenario scenario1 --profile stress --verbose

# Multiple scenarios
node run-tests.js --scenario scenario1,scenario2 --profile stress

# All scenarios
node run-tests.js --scenario all --profile stress

# CI mode (minimal output)
node run-tests.js --scenario all --profile baseline --ci
```

**Using K6 directly**:
```bash
# Set environment variables
export TUPLE_THRESHOLD=100000
export LOAD_PROFILE=stress

# Run specific scenario
k6 run --out json=results/scenario1.json \
  k6/scenarios/scenario1-tuple-explosion.js

# With custom parameters
k6 run -e TUPLE_THRESHOLD=50000 \
  -e USERS_SMALL=50 \
  k6/scenarios/scenario1-tuple-explosion.js
```

### 3. Environment Configuration

**Key Environment Variables**:
```bash
# Load profile (default: baseline)
export LOAD_PROFILE=stress          # baseline|stress|scale|breakingpoint|validation

# Tuple threshold (default: 100000)
export TUPLE_THRESHOLD=100000       # Max tuples per test combination

# Scenario 1 parameters
export USERS_SMALL=100
export USERS_MEDIUM=1000
export USERS_LARGE=10000
export TENANTS_SMALL=10
export TENANTS_MEDIUM=50
export TENANTS_LARGE=100

# Keto endpoints (defaults shown)
export KETO_READ_URL=http://localhost:4466
export KETO_WRITE_URL=http://localhost:4467
```

### 4. Load Profiles

| Profile | VUs | Duration | Use Case |
|---------|-----|----------|----------|
| **baseline** | 50 → 100 | ~5.5 min | Quick validation |
| **realworld** | 100 → 1K | ~12 min | Realistic load |
| **stress/scale** | 1K → 10K | ~23 min | **Stress testing (recommended)** |
| **breakingpoint** | 10K → 100K | ~27 min | Breaking point analysis |
| **validation** | 2 → 5 | ~2 min | Config validation |

### 5. Analyze Results

**View results**:
```bash
# List result files
ls -lh results/

# View latest result
cat results/scenario1-*.json | jq '.metrics'

# Generate analysis report
node analyze-results.js --input results --output reports --verbose

# View analysis summary
cat reports/analysis-summary-*.json | jq
```

**Key metrics to check**:
- Authorization latency (P50, P95, P99)
- HTTP request failure rate
- Tuple creation rate
- Cache hit ratio (if monitored)
- Tenant isolation (should be 100%)

### 6. Troubleshooting

**"No valid test combinations generated"**:
```bash
# Increase tuple threshold
export TUPLE_THRESHOLD=200000
make test-scenario1
```

**"Setup timeout exceeded"**:
```bash
# Reduce scale or use baseline profile
node run-tests.js --scenario scenario1 --profile baseline
```

**High error rate**:
```bash
# Check Keto logs
docker logs keto -f

# Reduce load
export LOAD_PROFILE=baseline
```

**Config issues**:
```bash
# Verify configuration loads correctly
k6 run --duration 10s --vus 1 k6/scenarios/scenario1-tuple-explosion.js
```

---

## Test Scenarios Summary

### Scenario 1: Tuple Explosion Impact
- **File**: `k6/scenarios/scenario1-tuple-explosion.js`
- **Duration**: ~23 min (stress profile)
- **Focus**: Performance vs tuple count growth
- **Metrics**: `total_tuples_created`, `auth_latency_by_tuple_count`, `test_setup_time`

### Scenario 2: Real-World Authorization Patterns
- **File**: `k6/scenarios/scenario2-auth-patterns.js`
- **Duration**: ~23 min (stress profile)
- **Focus**: Realistic user behavior (Alice 70%, Bob 20%, Charlie 10%)
- **Metrics**: User-specific latency, success rates, cross-tenant isolation

### Scenario 3: Resource Type Scaling
- **File**: `k6/scenarios/scenario3-resource-scaling.js`
- **Duration**: ~23 min (stress profile)
- **Focus**: Impact of adding resource types (2 → 3 → 4 → 5)
- **Metrics**: `tuples_per_resource`, `query_latency_by_resource_count`, `performance_degradation`

### Scenario 4: Hierarchical Inheritance
- **File**: `k6/scenarios/scenario4-hierarchy-inheritance.js`
- **Duration**: ~23 min (stress profile)
- **Focus**: Role hierarchy depth (shallow/medium/deep)
- **Metrics**: Hierarchy-specific latency, traversal depth, inheritance correctness

---

## Performance Targets (SLAs)

### Authorization Performance
```yaml
Baseline (1K users, 10 tenants, 5 resources):
  p50: <10ms
  p95: <25ms
  p99: <50ms

Scale (10K users, 100 tenants, 20 resources):
  p50: <20ms
  p95: <50ms
  p99: <100ms
```

### Database Performance
```yaml
Tuple insertion rate: >1000/second (baseline)
Query execution time: <5ms average (baseline), <15ms (scale)
```

### System Metrics
```yaml
HTTP request failed rate: <5%
Tenant isolation: 100% (rate == 1)
Cache hit ratio: >90% (if caching enabled)
```

---

## Configuration Files

### `k6/config.js`
Main configuration with:
- Load stage profiles (baseline, stress, scale, etc.)
- Test data sizes (users, tenants, resources)
- SLA targets and thresholds
- Keto endpoint configuration

### `k6/utils/keto-utils.js`
Utility functions for:
- Test data generation
- Tuple creation/deletion
- Authorization checks
- Random selection helpers

### `Makefile`
Convenient commands for test execution and analysis

### `run-tests.js`
Node.js test orchestrator with:
- Scenario selection
- Profile management
- Result aggregation
- JSON report generation

### `analyze-results.js`
Result analysis tool for:
- Metric aggregation
- SLA compliance checking
- Performance trend analysis
- Report generation

---

## Related Files

- **Parent Documentation**: `../README.md` - Resource-scoped RBAC overview
- **Architecture**: `../Keto-Resource-Scoped-RBAC-Architecture.md`
- **Test Cases**: `../Keto-Resource-Scoped-RBAC-Test-Cases.md`
- **Setup Script**: `../Keto-Resource-Scoped-RBAC-Test.sh`

---

## CI/CD Integration

**GitLab CI example**:
```yaml
performance-test:
  stage: test
  script:
    - npm install
    - make test-ci
    - make analyze
  artifacts:
    paths:
      - results/
      - reports/
    expire_in: 1 week
```

**GitHub Actions example**:
```yaml
- name: Run K6 Load Tests
  run: |
    npm install
    make test-stress
    make analyze

- name: Upload Results
  uses: actions/upload-artifact@v3
  with:
    name: loadtest-results
    path: |
      results/
      reports/
```

---

## Advanced Usage

### Custom Test Matrix

Edit `k6/scenarios/scenario1-tuple-explosion.js`:
```javascript
const testConfig = {
  userCounts: [50, 500, 5000],      // Custom user counts
  tenantCounts: [5, 25, 50],        // Custom tenant counts
  resourceCounts: [2, 4, 8],        // Custom resource counts
  iterations: 50                     // More iterations
};
```

### Custom Load Profile

Add to `k6/config.js`:
```javascript
loadStages: {
  custom: [
    { duration: '1m', target: 500 },
    { duration: '5m', target: 2000 },
    { duration: '2m', target: 0 }
  ]
}
```

Then use:
```bash
export LOAD_PROFILE=custom
make test-scenario1
```

### Monitoring Integration

Forward K6 metrics to InfluxDB:
```bash
k6 run --out influxdb=http://localhost:8086/k6 \
  k6/scenarios/scenario1-tuple-explosion.js
```

Or use K6 Cloud:
```bash
k6 run --out cloud k6/scenarios/scenario1-tuple-explosion.js
```
