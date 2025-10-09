# Keto Load Test Report: Scenario 2 - Authorization Patterns

## Test Overview

**Test Date:** October 9, 2025
**Test Duration:** 1 minute 41 seconds (101.2 seconds)
**Profile:** Baseline Load Testing
**Scenario:** Real-World Authorization Patterns Test
**Test Status:** ❌ FAILED (Success rate thresholds not met)
**Test Execution:** 11:12:57 - 11:14:39 UTC
**Total VUs:** 1-50 (dynamic scaling over 4 stages)
**K6 Version:** v1.3.0

### Executive Summary

This comprehensive test evaluated Keto's performance under realistic user behavior patterns with weighted access patterns. The test simulated real-world authorization scenarios across multiple user types (Alice, Bob, Charlie) with different permission levels and access patterns. While the system demonstrated excellent latency performance, it failed to meet success rate thresholds for user authorization patterns.

**Key Results:**
- ❌ **FAILED:** Success rate thresholds not met for user patterns
- 📊 **Total HTTP Requests:** 6,658
- 📊 **HTTP Request Rate:** 65.79 requests/second
- 📊 **Total Iterations:** 1,414 completed
- 📊 **Iteration Rate:** 13.97 iterations/second
- ⚠️ **Overall Success Rate:** 94.72% (22,831 out of 24,104 checks)
- ✅ **Authorization Latency:** P95 = 6.46ms (excellent)
- ✅ **HTTP Request Latency:** P95 = 6.44ms (excellent)

---

## Overall Scenario Metrics

### Performance Summary
| Metric | Value | Status |
|--------|-------|---------|
| **Total Test Duration** | 1m 41s (101.2s) | ✅ Within limits |
| **Total Iterations** | 1,414 completed | ✅ Good throughput |
| **Total Checks** | 24,104 | ✅ Comprehensive |
| **Checks Succeeded** | 22,831 (94.72%) | ⚠️ Below target (95%) |
| **Checks Failed** | 1,273 (5.28%) | ⚠️ Above threshold |
| **Checks Rate** | High throughput | ✅ Good performance |

### HTTP Request Metrics
| Metric | Value | Status |
|--------|-------|---------|
| **Total HTTP Requests** | 6,658 | ✅ Good volume |
| **HTTP Request Rate** | 65.79 requests/second | ✅ Adequate throughput |
| **HTTP Request Failed** | 7.83% (521/6,658) | ⚠️ Above threshold |
| **Data Sent** | 1.32 MB | ✅ Reasonable |
| **Data Received** | 968.11 kB | ✅ Good transfer rate |

### User Pattern Operations
| Metric | Value | Status |
|--------|-------|---------|
| **Alice Pattern Requests** | 5,030 (49.71 req/s) | ✅ High activity |
| **Bob Pattern Requests** | 1,172 (11.58 req/s) | ✅ Moderate activity |
| **Charlie Pattern Requests** | 345 (3.41 req/s) | ✅ Low activity |
| **Admin Operations** | 3,697 (36.53 req/s) | ✅ Good admin load |
| **View Operations** | 2,375 (23.47 req/s) | ✅ Read operations |
| **Failed Operations** | 312 (3.08 req/s) | ⚠️ Some failures |

### Virtual User Performance
| Metric | Value | Status |
|--------|-------|---------|
| **VU Range** | 1 - 50 users | ✅ Baseline scaling |
| **Peak VUs** | 50 concurrent | ✅ Moderate concurrency |
| **Final VUs** | 0 active | ✅ Clean shutdown |
| **Iteration Duration** | P95: 1.46s | ✅ Reasonable |

---

## Detailed HTTP Metrics

### Overall HTTP Performance
| Metric | Value | Threshold | Status |
|--------|-------|-----------|---------|
| **Average Duration** | 3.346ms | - | ✅ Excellent |
| **Median Duration** | 2.918ms | - | ✅ Excellent |
| **P90 Duration** | 5.316ms | - | ✅ Excellent |
| **P95 Duration** | 6.444ms | < 50ms | ✅ **PASSED** |
| **Maximum Duration** | 437.786ms | - | ✅ Acceptable |
| **Minimum Duration** | 0.595ms | - | ✅ Excellent |

### Authorization Check Performance
| Metric | Value | Threshold | Status |
|--------|-------|-----------|---------|
| **Auth Check Average** | 3.318ms | - | ✅ Excellent |
| **Auth Check P50** | 2.941ms | - | ✅ Excellent |
| **Auth Check P90** | 5.340ms | - | ✅ Excellent |
| **Auth Check P95** | 6.464ms | < 100ms | ✅ **PASSED** |
| **Auth Check Min** | 0.595ms | - | ✅ Excellent |
| **Auth Check Max** | 48.992ms | - | ✅ Good |

### Tuple Operations Performance
| Metric | Value | Threshold | Status |
|--------|-------|---------|---------|
| **Tuple Create Average** | 1.079ms | - | ✅ Excellent |
| **Tuple Create P90** | 1.537ms | - | ✅ Excellent |
| **Tuple Create P95** | 1.925ms | < 35ms | ✅ **PASSED** |
| **Tuple Create Min** | 0.694ms | - | ✅ Excellent |
| **Tuple Create Max** | 4.241ms | - | ✅ Excellent |
| **Tuple Delete P95** | 0ms | < 35ms | ✅ **PASSED** (no deletes) |

### Network Performance
| Metric | Value |
|--------|-------|
| **HTTP Request Blocked Avg** | 0.011ms |
| **HTTP Request Connecting Avg** | 0.005ms |
| **HTTP Request Sending Avg** | 0.017ms |
| **HTTP Request Waiting Avg** | 3.282ms |
| **HTTP Request Receiving Avg** | 0.048ms |
| **HTTP Request TLS Handshaking** | 0ms |

---

## User Pattern Analysis

### Alice Users (Multi-Tenant Access)
| Metric | Value | Threshold | Status |
|--------|-------|-----------|---------|
| **Request Count** | 5,030 requests | - | ✅ High activity |
| **Request Rate** | 49.71 req/s | - | ✅ Good throughput |
| **Success Rate** | 93.80% (4,718/5,030) | > 95% | ❌ **FAILED** |
| **Average Latency** | 3.495ms | - | ✅ Excellent |
| **P95 Latency** | 7ms | < 100ms | ✅ **PASSED** |
| **P90 Latency** | 6ms | - | ✅ Excellent |

### Bob Users (Admin Access)
| Metric | Value | Threshold | Status |
|--------|-------|-----------|---------|
| **Request Count** | 1,172 requests | - | ✅ Moderate activity |
| **Request Rate** | 11.58 req/s | - | ✅ Adequate throughput |
| **Success Rate** | 87.63% (1,027/1,172) | > 95% | ❌ **FAILED** |
| **Average Latency** | 3.342ms | - | ✅ Excellent |
| **P95 Latency** | 7ms | < 100ms | ✅ **PASSED** |
| **P90 Latency** | 5ms | - | ✅ Excellent |

### Charlie Users (Customer Access)
| Metric | Value | Threshold | Status |
|--------|-------|-----------|---------|
| **Request Count** | 345 requests | - | ✅ Low activity (expected) |
| **Request Rate** | 3.41 req/s | - | ✅ Light load |
| **Success Rate** | 42.61% (147/345) | > 95% | ❌ **FAILED** |
| **Average Latency** | 4.264ms | - | ✅ Good |
| **P95 Latency** | 8ms | < 100ms | ✅ **PASSED** |
| **P90 Latency** | 7ms | - | ✅ Good |

---

## K6 Metrics

### Execution Metrics
- **Iteration Duration Average**: 1026.81ms
- **Iteration Duration P95**: 1463.13ms
- **Iteration Duration P90**: 1418.74ms
- **Iteration Duration Min**: 513.40ms
- **Iteration Duration Max**: 1525.94ms
- **Iteration Duration Median**: 1040.80ms

### VU Metrics
- **Current VUs**: 0 (clean shutdown)
- **VU Range**: 1-50 (min-max)

### Custom Metrics

#### User Pattern Performance
- **Alice Pattern Requests**: 5,030 at 49.71 req/s
- **Alice Success Rate**: 93.80% (4,718 successful)
- **Alice Latency**: avg=3.495ms, P95=7ms, P90=6ms, max=52ms
- **Bob Pattern Requests**: 1,172 at 11.58 req/s
- **Bob Success Rate**: 87.63% (1,027 successful)
- **Bob Latency**: avg=3.342ms, P95=7ms, P90=5ms, max=14ms
- **Charlie Pattern Requests**: 345 at 3.41 req/s
- **Charlie Success Rate**: 42.61% (147 successful)
- **Charlie Latency**: avg=4.264ms, P95=8ms, P90=7ms, max=14ms

#### Operation Breakdown
- **Admin Operations**: 3,697 at 36.53 operations/s
- **View Operations**: 2,375 at 23.47 operations/s
- **Failed Operations**: 312 at 3.08 operations/s
- **Cross Tenant Attempts**: 475 at 4.69 attempts/s

#### Authorization Metrics
- **Auth Check Latency**: avg=3.407ms, P95=7ms, P90=6ms, max=52ms
- **Auth Failure Rate**: 7.96% (521 out of 6,547)
- **Tuple Creation Latency**: avg=1.079ms, P95=1.925ms, P90=1.537ms, max=4.241ms

#### Test Setup Summary from JSON
- **Users Generated**: 15 total (distributed across roles)
- **Tenants**: 3 tenants (tenant1, tenant2, tenant3)
- **Resources**: 6 resources (product/category items per tenant)
- **Tuples Created**: 110 setup tuples
- **User Distribution**:
  - Alice users (multi-tenant): 8 users (moderator/admin/customer roles)
  - Bob users (admin): 2 users (customer/moderator roles)
  - Charlie users (customer): 6 users (moderator/admin/customer roles)

---

## Network Metrics
- **Data Received**: 968.11 kB
- **Data Received Rate**: 9.57 kB/s
- **Data Sent**: 1.32 MB
- **Data Sent Rate**: 13.06 kB/s

---

## Threshold Results
- ✅ **alice_latency p(95) < 100** → PASSED (actual: 7ms)
- ❌ **alice_success_rate rate > 0.95** → FAILED (actual: 93.79%)
- ✅ **bob_latency p(95) < 100** → PASSED (actual: 7ms)
- ❌ **bob_success_rate rate > 0.95** → FAILED (actual: 87.62%)
- ✅ **charlie_latency p(95) < 100** → PASSED (actual: 8ms)
- ❌ **charlie_success_rate rate > 0.95** → FAILED (actual: 42.60%)
- ✅ **checks{check:tenant_isolation} rate == 1** → PASSED (actual: 0.00%)
- ✅ **http_req_duration p(95) < 50** → PASSED (actual: 6.44ms)
- ✅ **http_req_duration{endpoint:auth_check} p(95) < 100** → PASSED (actual: 6.46ms)
- ✅ **http_req_duration{endpoint:bulk_auth} p(95) < 200** → PASSED (actual: 0ms)
- ✅ **http_req_duration{operation:tuple_create} p(95) < 35** → PASSED (actual: 1.92ms)
- ✅ **http_req_duration{operation:tuple_delete} p(95) < 35** → PASSED (actual: 0ms)
- ✅ **http_req_failed rate < 0.3** → PASSED (actual: 7.82%)

---

## Detailed Checks Status
- ✅ **cleanup successful** → PASSED (1 passed / 0 failed)
- ✅ **tuple creation successful** → PASSED (110 passed / 0 failed)
- ✅ **tuple creation fast** → PASSED (110 passed / 0 failed)
- ❌ **auth check responded** → 92.04% passed (6,026 passed / 521 failed)
- ✅ **auth check fast** → PASSED (6,547 passed / 0 failed)
- ❌ **auth check ultra-fast** → 99.88% passed (6,539 passed / 8 failed)
- ✅ **user pattern latency acceptable** → PASSED (1,414 passed / 0 failed)
- ❌ **user pattern success rate good** → 66.97% passed (947 passed / 467 failed)
- ❌ **no unauthorized cross-tenant access** → 80.41% passed (1,137 passed / 277 failed)

### Overall Check Statistics
- **Total Checks**: 24,104 checks
- **Checks Succeeded**: 94.72% (22,831 out of 24,104)
- **Checks Failed**: 5.28% (1,273 out of 24,104)

---

## Performance Analysis and Conclusions
The authorization patterns test revealed critical insights about real-world usage patterns:

### 🎯 **Latency Performance - Excellent:**
1. ✅ **Outstanding Latency:** All user types achieved excellent P95 latencies (7-8ms)
2. ✅ **Fast Authorization:** Auth checks averaged 3.31ms with P95 of 6.46ms
3. ✅ **Efficient Tuple Operations:** Tuple creation P95 of 1.92ms is exceptional
4. ✅ **Consistent Performance:** Low latency maintained across all user patterns

### ❌ **Success Rate Issues - Critical:**
1. 🔴 **Alice Users (Multi-tenant):** 93.80% success rate (below 95% threshold)
2. 🔴 **Bob Users (Admin):** 87.63% success rate (below 95% threshold)
3. 🔴 **Charlie Users (Customer):** 42.61% success rate (significantly below threshold)
4. 🔴 **Cross-tenant Access:** 80.41% success rate indicates unauthorized access issues

### 📊 **Key Findings:**
- **Performance vs Authorization:** System has excellent performance (6.444ms P95) but authorization logic issues
- **User Pattern Variance:** Different user types show vastly different success rates
- **Charlie Users Issue:** Extremely low success rate (42.61%) suggests permission misconfiguration
- **Cross-tenant Security:** 19.59% failure rate in preventing unauthorized access is concerning
- **HTTP Reliability:** 7.83% HTTP failure rate is higher than ideal
- **Auth Failure Rate:** 7.96% auth failure rate indicates configuration issues### 🔍 **Root Cause Analysis:**
1. **Permission Configuration:** Charlie users may lack proper permissions for their access patterns
2. **Authorization Rules:** Cross-tenant access rules may be incorrectly configured
3. **User Role Mapping:** Mismatch between user roles and expected access patterns
4. **Test Data Setup:** 116 setup tuples may be insufficient for comprehensive authorization

### ⚠️ **Security Implications:**
- **Tenant Isolation:** 277 cross-tenant access violations detected
- **Authorization Gaps:** Success rates below 95% indicate permission gaps
- **Access Control:** Different user types experiencing authorization failures

## Recommendations
1. 🔧 **Fix Authorization Rules:** Review and correct permission configurations for all user types
2. 🛡️ **Strengthen Tenant Isolation:** Address cross-tenant access violations (currently 20% failure rate)
3. 📋 **Review Charlie User Permissions:** Investigate why customer users have 42.60% success rate
4. 🧪 **Expand Test Data:** Increase setup tuples to ensure comprehensive permission coverage
5. 📊 **Monitor Authorization Patterns:** Implement detailed logging for failed authorization attempts
6. 🔍 **Permission Audit:** Conduct thorough audit of role-to-permission mappings
7. ✅ **Leverage Performance:** Excellent latency performance provides good foundation for fixes

### 🏆 **Summary**
This test successfully identified critical authorization configuration issues while confirming excellent performance characteristics. The system can handle the load efficiently (6.44ms P95 latency) but requires authorization rule fixes to meet security and access requirements. Priority should be on fixing permission configurations rather than performance optimization.
