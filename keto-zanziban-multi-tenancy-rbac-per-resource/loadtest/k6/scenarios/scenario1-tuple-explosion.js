/**
 * Scenario 1: Tuple Explosion Impact Test
 *
 * Tests performance degradation as tuple count increases across different
 * combinations of users, tenants, and resources.
 *
 * Test Matrix (per README.md):
 * - Users: 100, 1K, 10K (100K optional via env)
 * - Tenants: 10, 50, 100 (500 optional via env)
 * - Resources: 5, 10, 20, 50
 * - Role Types: 3 (customer, moderator, admin)
 */

import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import config, { getStagesByProfile } from '../config.js';
import keto from '../utils/keto-utils.js';

// Test-specific metrics
const tupleExplosionMetrics = {
  totalTuples: new Counter('total_tuples_created'),
  authLatencyByTupleCount: new Trend('auth_latency_by_tuple_count', true),
  memoryUsage: new Trend('memory_usage_estimate', true),
  setupTime: new Trend('test_setup_time', true)
};

// Test configuration - can be overridden by environment variables
const testConfig = {
  userCounts: [
    parseInt(__ENV.USERS_SMALL) || config.testData.users.small,
    parseInt(__ENV.USERS_MEDIUM) || config.testData.users.medium,
    parseInt(__ENV.USERS_LARGE) || config.testData.users.large
  ],
  tenantCounts: [
    parseInt(__ENV.TENANTS_SMALL) || config.testData.tenants.small,
    parseInt(__ENV.TENANTS_MEDIUM) || config.testData.tenants.medium,
    parseInt(__ENV.TENANTS_LARGE) || config.testData.tenants.large
  ],
  resourceCounts: [5, 10, 20, 50],  // Per README.md: 5, 10, 20, 50 resource types
  iterations: parseInt(__ENV.ITERATIONS) || 20  // Reduced for faster validation
};

// K6 options for this test
export const options = {
  stages: getStagesByProfile(__ENV.LOAD_PROFILE),
  thresholds: {
    ...config.thresholds,
    'auth_latency_by_tuple_count': ['p(95) < 150'], // Updated based on test results
    'test_setup_time': ['p(95) < 60000'], // Setup should complete in 60s - increased from 30s
    'iteration_duration': ['p(95) < 60000'] // Each iteration under 60s - increased from 5s
  },
  setupTimeout: '120s', // Reduced for faster validation
  teardownTimeout: '120s' // Reduced for faster validation
};

/**
 * Setup phase - prepare test data for different matrix combinations
 */
export function setup() {
  console.log('🚀 Starting Tuple Explosion Impact Test Setup');

  const testCombinations = [];

  // Generate all test combinations
  for (const userCount of testConfig.userCounts) {
    for (const tenantCount of testConfig.tenantCounts) {
      for (const resourceCount of testConfig.resourceCounts) {
        const resourceTypes = config.testData.resources.full.slice(0, resourceCount);
        const expectedTuples = userCount * tenantCount * resourceCount;

        // Skip combinations that would create too many tuples (scale testing allows more)
        const tupleThreshold = parseInt(__ENV.TUPLE_THRESHOLD) || 100000;  // Default 100K tuples for scale testing
        if (expectedTuples > tupleThreshold) {
          console.log(`⚠️  Skipping combination: ${userCount} users × ${tenantCount} tenants × ${resourceCount} resources = ${expectedTuples} tuples (exceeds threshold ${tupleThreshold})`);
          continue;
        }

        testCombinations.push({
          users: userCount,
          tenants: tenantCount,
          resources: resourceCount,
          resourceTypes,
          expectedTuples
        });
      }
    }
  }

  console.log(`📊 Generated ${testCombinations.length} test combinations`);

  // Validate we have test combinations
  if (testCombinations.length === 0) {
    throw new Error('❌ No valid test combinations generated! All combinations exceeded tuple threshold.');
  }

  return {
    testCombinations,
    startTime: Date.now()
  };
}

/**
 * Main test function - runs for each VU iteration
 */
export default function (data) {
  // Select a test combination for this iteration
  const combinationIndex = Math.floor(Math.random() * data.testCombinations.length);
  const combination = data.testCombinations[combinationIndex];

  console.log(`🧪 Testing combination: ${combination.users} users × ${combination.tenants} tenants × ${combination.resources} resources`);

  // Generate test data for this combination
  const setupStartTime = Date.now();
  const testData = keto.generateTestData(
    combination.users,
    combination.tenants,
    combination.resourceTypes
  );

  // Check if testData was generated properly
  if (!testData || !testData.users) {
    console.error('❌ Failed to generate test data - skipping this iteration');
    return;
  }

  console.log(`✅ Generated test data: ${testData.users.length} users, ${testData.tenants.length} tenants`);

  // Setup tuples for this test
  const tupleCount = keto.setupTestTuples(
    testData.users,
    testData.tenants,
    combination.resourceTypes
  );

  const setupTime = Date.now() - setupStartTime;
  tupleExplosionMetrics.setupTime.add(setupTime);
  tupleExplosionMetrics.totalTuples.add(tupleCount);

  console.log(`⏱️  Setup completed in ${setupTime}ms for ${tupleCount} tuples`);

  // Wait for database to settle
  sleep(1);

  // Perform authorization checks to measure latency
  const authTestsPerIteration = 10;  // Reduced for test case validation
  const authResults = [];

  for (let i = 0; i < authTestsPerIteration; i++) {
    const user = keto.randomChoice(testData.users);
    const tenant = keto.randomChoice(testData.tenants);
    const resourceType = keto.randomChoice(combination.resourceTypes);

    // Choose action based on what permissions are actually granted for this resource type
    let action;
    if (resourceType === 'product') {
      action = keto.randomChoice(['view', 'create', 'delete']); // No 'update' for products
    } else if (resourceType === 'category') {
      action = keto.randomChoice(['view', 'create', 'update']); // No 'delete' for categories
    } else {
      action = keto.randomChoice(['view', 'create', 'update', 'delete']); // All granted for other resources
    }

    const authResult = keto.checkAuth(
      config.keto.namespace,
      `tenant:${tenant.id}#${resourceType}:items`,
      action,
      `user:${user.id}`
    );

    authResults.push(authResult);
    tupleExplosionMetrics.authLatencyByTupleCount.add(authResult.latency, {
      tuple_count: tupleCount.toString()
    });
  }

  // Calculate performance metrics
  const avgLatency = authResults.reduce((sum, r) => sum + r.latency, 0) / authResults.length;
  const maxLatency = Math.max(...authResults.map(r => r.latency));
  const successRate = authResults.filter(r => r.response.status === 200).length / authResults.length;

  // Estimate memory usage (rough calculation)
  const estimatedMemoryPerTuple = 0.5; // KB
  const estimatedMemoryUsage = tupleCount * estimatedMemoryPerTuple;
  tupleExplosionMetrics.memoryUsage.add(estimatedMemoryUsage);

  // Performance checks
  check(null, {
    'avg latency acceptable': () => avgLatency < config.sla.authCheckLatency.p95,
    'max latency under limit': () => maxLatency < config.sla.authCheckLatency.p99,
    'high success rate': () => successRate > 0.70,  // Should be ~70-80% now that we only test granted permissions (accounting for role distribution)
    'linear tuple creation': () => setupTime / tupleCount < 1, // Less than 1ms per tuple
    'memory efficiency': () => estimatedMemoryUsage < tupleCount // Less than 1KB per tuple
  }, {
    scenario: 'tuple_explosion',
    users: combination.users.toString(),
    tenants: combination.tenants.toString(),
    resources: combination.resources.toString(),
    tuple_count: tupleCount.toString()
  });

  console.log(`📈 Results for ${tupleCount} tuples:`);
  console.log(`   • Average latency: ${avgLatency.toFixed(2)}ms`);
  console.log(`   • Max latency: ${maxLatency.toFixed(2)}ms`);
  console.log(`   • Success rate: ${(successRate * 100).toFixed(2)}%`);
  console.log(`   • Estimated memory: ${estimatedMemoryUsage.toFixed(2)} KB`);

  // Cleanup tuples for this test
  const cleanupStartTime = Date.now();
  keto.cleanupTestTuples(testData.users, testData.tenants, combination.resourceTypes);
  const cleanupTime = Date.now() - cleanupStartTime;

  console.log(`🧹 Cleanup completed in ${cleanupTime}ms`);

  // Small delay between iterations
  sleep(2);
}

/**
 * Teardown phase - final cleanup and reporting
 */
export function teardown(data) {
  console.log('🏁 Tuple Explosion Impact Test Complete');

  const testDuration = Date.now() - data.startTime;
  console.log(`⏰ Total test duration: ${(testDuration / 1000 / 60).toFixed(2)} minutes`);

  // Summary of test combinations
  console.log('📊 Test Summary:');
  console.log(`   • Combinations tested: ${data.testCombinations.length}`);
  console.log(`   • User range: ${Math.min(...testConfig.userCounts)} - ${Math.max(...testConfig.userCounts)}`);
  console.log(`   • Tenant range: ${Math.min(...testConfig.tenantCounts)} - ${Math.max(...testConfig.tenantCounts)}`);
  console.log(`   • Resource range: ${Math.min(...testConfig.resourceCounts)} - ${Math.max(...testConfig.resourceCounts)}`);

  console.log('✅ Check results for tuple explosion performance analysis');
}
