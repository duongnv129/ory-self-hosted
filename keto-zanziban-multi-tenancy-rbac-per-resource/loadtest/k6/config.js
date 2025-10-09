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
      p50: 10,  // 10ms
      p95: 25,  // 25ms
      p99: 50   // 50ms
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
  loadStages: {
    // Baseline Testing: 1K users per README.md
    baseline: [
      { duration: '30s', target: 50 },    // Gentle warmup
      { duration: '2m', target: 100 },    // Reach baseline 100 users
      { duration: '3m', target: 100 }     // Sustain baseline load
    ],

    // Warmup (alias for baseline)
    warmup: [
      { duration: '30s', target: 50 },    // Gentle warmup
      { duration: '2m', target: 100 },    // Reach baseline 100 users
      { duration: '3m', target: 100 }     // Sustain baseline load
    ],

    // Real-world Load: 10K users per README.md
    realworld: [
      { duration: '1m', target: 100 },    // Start baseline
      { duration: '2m', target: 500 },    // Ramp to mid-scale
      { duration: '2m', target: 1000 },   // Reach real-world scale
      { duration: '5m', target: 1000 },   // Sustain real-world load
      { duration: '2m', target: 0 }       // Cool down
    ],

    // Stress Testing: 10K VUs per README.md (scale/stress profile)
    stress: [
      { duration: '2m', target: 1000 },   // Start from real-world
      { duration: '3m', target: 5000 },   // Ramp up significantly
      { duration: '5m', target: 10000 },  // Reach scale target
      { duration: '10m', target: 10000 }, // Sustain scale load
      { duration: '3m', target: 0 }       // Cool down
    ],

    // Breaking Point: Up to 100K users per README.md
    breakingpoint: [
      { duration: '2m', target: 10000 },  // Start from scale
      { duration: '5m', target: 25000 },  // Push boundaries
      { duration: '5m', target: 50000 },  // Extreme load
      { duration: '10m', target: 100000 }, // Breaking point
      { duration: '5m', target: 0 }       // Cool down
    ],

    // For test validation (small parameters)
    validation: [
      { duration: '30s', target: 2 },     // Quick validation
      { duration: '1m', target: 5 },      // Small sustained load
      { duration: '30s', target: 0 }      // Quick cooldown
    ]
  },

  // Profile-to-stage mapping for easy selection
  profiles: {
    baseline: 'baseline',
    stress: 'stress',
    breakingpoint: 'breakingpoint',
    validation: 'validation'
  },

  // Thresholds for pass/fail criteria - Aligned with README.md SLA targets
  thresholds: {
    // Authorization check performance - README.md targets: P50 < 10ms, P95 < 25ms
    'http_req_duration{endpoint:auth_check}': [
      'p(50) < 10',   // P50 < 10ms per README.md
      'p(95) < 25',   // P95 < 25ms per README.md
      'p(99) < 50'    // P99 < 50ms (extended target)
    ],

    // Bulk authorization performance
    'http_req_duration{endpoint:bulk_auth}': [
      'p(95) < 100'   // Tighter target for bulk operations
    ],

    // General HTTP performance - README.md targets
    'http_req_failed': ['rate < 0.05'], // <5% error rate per README.md
    'http_req_duration': ['p(95) < 25'], // P95 < 25ms per README.md

    // Tuple operations - README.md aligned
    'http_req_duration{operation:tuple_create}': ['p(95) < 15'], // Tighter target
    'http_req_duration{operation:tuple_delete}': ['p(95) < 15'], // Tighter target

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
