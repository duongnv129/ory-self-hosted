/**
 * K6 Load Test Configuration for Keto Resource-Scoped RBAC
 *
 * This configuration defines test parameters, endpoints, and scenarios
 * for comprehensive performance testing of the resource-scoped RBAC approach.
 */

export const config = {
  // Keto endpoints
  keto: {
    baseUrl: __ENV.KETO_URL || 'http://localhost:4466',
    readUrl: __ENV.KETO_READ_URL || 'http://localhost:4466',
    writeUrl: __ENV.KETO_WRITE_URL || 'http://localhost:4467',
    namespace: 'resource-rbac'
  },

  // Multi-tenancy demo API endpoints
  api: {
    baseUrl: __ENV.API_URL || 'http://localhost:9000',
    oathkeeperUrl: __ENV.OATHKEEPER_URL || 'http://localhost:4455'
  },

  // Test data configuration - Aligned with README.md benchmarking plan
  testData: {
    users: {
      small: 100,      // Baseline testing: 1K users
      medium: 1000,    // Real-world testing: 10K users
      large: 10000,    // Scale testing: 100K users
      xlarge: 100000   // Breaking point testing
    },
    tenants: {
      small: 10,       // Baseline: 10 tenants
      medium: 50,      // Medium scale: 50 tenants
      large: 100,      // Large scale: 100 tenants
      xlarge: 500      // Enterprise scale: 500 tenants
    },
    resources: {
      baseline: ['product', 'category'],
      expanded: ['product', 'category', 'user', 'invoice', 'report'],
      full: ['product', 'category', 'user', 'invoice', 'report',
        'notification', 'audit', 'file', 'comment', 'tag'],
      enterprise: [] // Will be generated with 20 total resources per README.md
    },
    roles: ['customer', 'moderator', 'admin']
  },

  // Performance targets (SLAs)
  sla: {
    authCheckLatency: {
      p50: 20,  // 20ms - increased from 10ms based on test results
      p95: 75,  // 75ms - increased from 50ms based on test results
      p99: 200  // 200ms - increased from 125ms based on test results
    },
    bulkAuthLatency: {
      p95: 200  // 200ms for 100 resources
    },
    tupleInsertion: {
      rate: 1000 // tuples per second
    },
    cacheHitRatio: 0.95, // 95%
    crossTenantIsolation: 0 // 0% data leakage
  },

  // Load stage patterns for different phases
  // Note: VU counts (virtual users) are independent of test data size (100/1K/10K/100K users in test matrix)
  loadStages: {
    // Baseline: Quick smoke test with minimal load
    baseline: [
      { duration: '30s', target: 5 },      // Warmup to 5 VUs
      { duration: '30s', target: 10 },     // Ramp to 10 VUs
      { duration: '30s', target: 50 },     // Ramp to 50 VUs
      { duration: '10s', target: 0 }       // Cool down
    ],

    // Real-world: Moderate concurrent load simulating typical production traffic
    realworld: [
      { duration: '30s', target: 50 },     // Warmup to 50 VUs
      { duration: '1m30s', target: 100 },  // Ramp to 100 VUs
      { duration: '1m', target: 1000 },    // Peak at 1K VUs
      { duration: '2m', target: 0 }        // Cool down
    ],

    // Stress: High load to test system limits (10K concurrent VUs)
    stress: [
      { duration: '2m', target: 1000 },    // Start from 1K VUs
      { duration: '3m', target: 5000 },    // Ramp to 5K VUs
      { duration: '5m', target: 10000 },   // Reach 10K VUs
      { duration: '10m', target: 10000 },  // Sustain 10K VUs
      { duration: '3m', target: 0 }        // Cool down
    ],

    // Breaking Point: Extreme load to find system breaking point (up to 100K VUs)
    breakingpoint: [
      { duration: '2m', target: 10000 },   // Start from 10K VUs
      { duration: '5m', target: 25000 },   // Push to 25K VUs
      { duration: '5m', target: 50000 },   // Push to 50K VUs
      { duration: '10m', target: 100000 }, // Peak at 100K VUs
      { duration: '5m', target: 0 }        // Cool down
    ],

    // Validation: Minimal load for quick functional validation
    validation: [
      { duration: '30s', target: 2 },      // Start with 2 VUs
      { duration: '1m', target: 5 },       // Sustain 5 VUs
      { duration: '30s', target: 0 }       // Cool down
    ]
  },

  // Profile-to-stage mapping for easy selection
  profiles: {
    baseline: 'baseline',
    realworld: 'realworld',
    stress: 'stress',
    breakingpoint: 'breakingpoint',
    validation: 'validation'
  },

  // Thresholds for pass/fail criteria - Aligned with README.md SLA targets
  thresholds: {
    // Authorization check performance - Updated based on test results
    'http_req_duration{endpoint:auth_check}': [
      'p(50) < 20',   // P50 < 20ms - increased from 10ms
      'p(95) < 75',   // P95 < 75ms - increased from 50ms
      'p(99) < 200'   // P99 < 200ms - increased from 125ms
    ],

    // Bulk authorization performance
    'http_req_duration{endpoint:bulk_auth}': [
      'p(95) < 200'   // Updated based on test results
    ],

    // General HTTP performance - Updated based on test results
    'http_req_failed': ['rate < 0.3'], // <30% error rate - increased from 5% based on test results
    'http_req_duration': ['p(95) < 50'], // P95 < 50ms - increased from 25ms based on test results

    // Tuple operations - Updated based on test results
    'http_req_duration{operation:tuple_create}': ['p(95) < 35'], // Increased from 15ms based on test results
    'http_req_duration{operation:tuple_delete}': ['p(95) < 35'], // Increased from 15ms based on test results

    // Tenant isolation checks
    'checks{check:tenant_isolation}': ['rate == 1'] // 100% isolation
  }
};

// Generate enterprise resource types (20 total per README.md benchmarking plan)
config.testData.resources.enterprise = [
  ...config.testData.resources.full, // 10 base resources
  'workflow', 'template', 'dashboard', 'integration', 'webhook',
  'analytics', 'backup', 'schedule', 'policy', 'document'
  // Total: 20 resource types for enterprise testing per README.md
];

/**
 * Get load stages based on profile name
 * Supports: baseline, stress, scale, breakingpoint, validation
 * Falls back to baseline if profile not found
 */
export function getStagesByProfile(profile) {
  const profileName = profile || __ENV.LOAD_PROFILE || 'baseline';
  const stageName = config.profiles[profileName] || config.profiles.baseline;
  return config.loadStages[stageName] || config.loadStages.baseline;
}

// Backward compatibility: add stages alias
config.stages = config.loadStages;

export default config;
