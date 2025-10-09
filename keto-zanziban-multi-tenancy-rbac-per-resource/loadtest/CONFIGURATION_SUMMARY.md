# Load Test Configuration Summary

## Fixed Issues

### 1. Configuration Property Naming
**Issue**: Scenarios referenced `config.stages.baseline` but config had `config.loadStages`
**Fix**: 
- Added `config.stages` as alias to `config.loadStages` for backward compatibility
- Updated all scenarios to use `config.loadStages.scale || config.loadStages.warmup`
- Added `getStagesByProfile()` helper function

### 2. Tuple Threshold Too Restrictive
**Issue**: All test combinations skipped due to 1000-tuple threshold
**Fix**: Increased to 100,000 tuples (configurable via `TUPLE_THRESHOLD` env var)

### 3. Load Profile Mapping
**Issue**: `stress` profile didn't map to correct load stages
**Fix**: Added profile mapping in config.js:
```javascript
profiles: {
  baseline: 'baseline',
  stress: 'scale',
  scale: 'scale',
  breakingpoint: 'breakingpoint',
  validation: 'validation'
}
```

## Current Configuration

### Load Profiles (k6/config.js)

| Profile | Stages | Total Duration | VUs | Use Case |
|---------|--------|---------------|-----|----------|
| **baseline/warmup** | 30s→50, 2m→100, 3m@100 | ~5.5 min | Max 100 | Quick validation |
| **realworld** | 1m→100, 2m→500, 2m→1000, 5m@1000 | ~12 min | Max 1K | Realistic testing |
| **stress/scale** | 2m→1K, 3m→5K, 5m→10K, 10m@10K | ~23 min | Max 10K | **Stress testing** |
| **breakingpoint** | 2m→10K, 5m→25K, 5m→50K, 10m→100K | ~27 min | Max 100K | Breaking point |
| **validation** | 30s→2, 1m→5 | ~2 min | Max 5 | Quick config check |

### Environment Variables

```bash
# Required
KETO_READ_URL=http://localhost:4466    # Keto read API
KETO_WRITE_URL=http://localhost:4467   # Keto write API

# Test Configuration
LOAD_PROFILE=stress                     # Profile to use
TUPLE_THRESHOLD=100000                  # Max tuples (default: 100K)

# Scenario 1 Parameters
USERS_SMALL=100                         # Small user count
USERS_MEDIUM=1000                       # Medium user count
USERS_LARGE=10000                       # Large user count
TENANTS_SMALL=10                        # Small tenant count
TENANTS_MEDIUM=50                       # Medium tenant count
TENANTS_LARGE=100                       # Large tenant count
ITERATIONS=20                           # Test iterations
```

### Test Scenarios

#### Scenario 1: Tuple Explosion Impact
- **File**: `k6/scenarios/scenario1-tuple-explosion.js`
- **Test Matrix**: Users (100, 1K, 10K) × Tenants (10, 50, 100) × Resources (2, 3, 5)
- **Metrics**: Total tuples, auth latency by tuple count, setup time
- **Threshold**: TUPLE_THRESHOLD env var (default: 100K)

#### Scenario 2: Authorization Patterns
- **File**: `k6/scenarios/scenario2-auth-patterns.js`
- **User Distribution**: Alice (70%), Bob (20%), Charlie (10%)
- **Patterns**: Multi-tenant, admin ops, view-only
- **Metrics**: User-specific latency, success rates, cross-tenant isolation

#### Scenario 3: Resource Scaling
- **File**: `k6/scenarios/scenario3-resource-scaling.js`
- **Progression**: 2 → 3 → 4 → 5 resource types
- **Focus**: Performance degradation with resource growth
- **Metrics**: Tuples per resource, latency by resource count

#### Scenario 4: Hierarchical Inheritance
- **File**: `k6/scenarios/scenario4-hierarchy-inheritance.js`
- **Hierarchies**: Shallow (2), Medium (3), Deep (5) levels
- **Patterns**: Direct, inherited, multiple, negative inheritance
- **Metrics**: Latency by hierarchy depth, traversal metrics

### SLA Thresholds (k6/config.js)

```javascript
thresholds: {
  // Authorization performance
  'http_req_duration{endpoint:auth_check}': [
    'p(50) < 10',   // P50 < 10ms
    'p(95) < 25',   // P95 < 25ms  
    'p(99) < 50'    // P99 < 50ms
  ],
  
  // Error rates
  'http_req_failed': ['rate < 0.05'],  // <5% errors
  
  // Tuple operations
  'http_req_duration{operation:tuple_create}': ['p(95) < 15'],
  'http_req_duration{operation:tuple_delete}': ['p(95) < 15'],
  
  // Tenant isolation
  'checks{check:tenant_isolation}': ['rate == 1']  // 100%
}
```

## Test Execution

### Quick Start
```bash
# 1. Verify prerequisites
k6 version
curl http://localhost:4466/health/ready

# 2. Install dependencies
npm install

# 3. Run single scenario with stress profile
make test-scenario1

# 4. Run all scenarios
make test-stress

# 5. Analyze results
make analyze
```

### Custom Execution
```bash
# Set custom parameters
export TUPLE_THRESHOLD=200000
export USERS_SMALL=50
export LOAD_PROFILE=scale

# Run with custom config
node run-tests.js --scenario scenario1 --profile stress --verbose
```

### CI/CD Integration
```bash
# Minimal output for CI
node run-tests.js --scenario all --profile baseline --ci

# Or via Makefile
make test-ci
```

## File Structure

```
loadtest/
├── README.md                    # Main documentation (updated)
├── CONFIGURATION_SUMMARY.md     # This file
├── Makefile                     # Test execution commands
├── package.json                 # Node dependencies
├── run-tests.js                 # Test orchestrator
├── analyze-results.js           # Result analyzer
├── run-all-scenarios.sh         # Batch test runner
├── k6/
│   ├── config.js               # Main config (fixed)
│   ├── scenarios/
│   │   ├── scenario1-tuple-explosion.js      (fixed)
│   │   ├── scenario2-auth-patterns.js        (fixed)
│   │   ├── scenario3-resource-scaling.js     (fixed)
│   │   └── scenario4-hierarchy-inheritance.js (fixed)
│   └── utils/
│       └── keto-utils.js       # Helper functions
├── results/                     # JSON test results
└── reports/                     # Analysis reports
```

## Key Improvements

1. ✅ Fixed config property inconsistency (`stages` vs `loadStages`)
2. ✅ Added profile mapping for stress/scale testing
3. ✅ Increased tuple threshold to 100K (configurable)
4. ✅ Added backward compatibility aliases
5. ✅ Updated all scenarios to use scale profile
6. ✅ Comprehensive README with troubleshooting
7. ✅ Environment variable documentation
8. ✅ CI/CD integration examples

## Validation Checklist

Before running tests:
- [ ] Keto services healthy (`curl localhost:4466/health/ready`)
- [ ] PostgreSQL accessible
- [ ] K6 installed (`k6 version`)
- [ ] Node dependencies installed (`npm install`)
- [ ] Environment variables set (optional)
- [ ] Sufficient system resources (10K VUs requires ~4GB RAM)

## Next Steps

1. **Run validation test**:
   ```bash
   node run-tests.js --scenario scenario1 --profile validation
   ```

2. **Run full stress test**:
   ```bash
   export TUPLE_THRESHOLD=100000
   make test-stress
   ```

3. **Analyze results**:
   ```bash
   make analyze
   cat reports/analysis-summary-*.json | jq
   ```

4. **Review metrics**:
   - Check authorization latency (should be <100ms P95)
   - Verify tenant isolation (100%)
   - Monitor error rates (<5%)
   - Review tuple creation performance

5. **Optimize based on findings**:
   - Adjust Keto configuration
   - Implement caching strategies
   - Optimize database indexes
   - Tune load profiles
