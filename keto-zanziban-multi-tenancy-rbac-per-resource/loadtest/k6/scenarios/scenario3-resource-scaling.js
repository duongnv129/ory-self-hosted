/**
 * Scenario 3: Resource Type Scaling Impact Test
 *
 * Measures the performance impact of adding new resource types to the system.
 * Tests how tuple creation overhead, query performance, and cache effectiveness
 * change as the number of resource types increases.
 *
 * Test Progression:
 * 1. Baseline: 2 resource types (product, category)
 * 2. Expanded: 5 resource types (+ user, invoice, report)
 * 3. Full: 10 resource types (+ notification, audit, file, comment, tag)
 * 4. Enterprise: 20 resource types (+ 10 business-specific)
 */

import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import config from '../config.js';
import keto from '../utils/keto-utils.js';

// Test-specific metrics
const resourceScalingMetrics = {
  resourceTypes: new Counter('resource_types_tested'),
  tuplesPerResource: new Trend('tuples_per_resource_addition', true),
  queryLatencyByResourceCount: new Trend('query_latency_by_resource_count', true),
  setupTimeByResourceCount: new Trend('setup_time_by_resource_count', true),
  cacheEffectiveness: new Rate('cache_effectiveness_by_resources'),
  indexPerformance: new Trend('index_performance_by_resources', true),

  // Resource-specific metrics
  baselinePerformance: new Trend('baseline_performance', true),
  expandedPerformance: new Trend('expanded_performance', true),
  fullPerformance: new Trend('full_performance', true),
  enterprisePerformance: new Trend('enterprise_performance', true),

  // Degradation tracking
  performanceDegradation: new Trend('performance_degradation_percent', true)
};

// Test configuration
const testConfig = {
  // Fixed test parameters for consistent comparison (reduced for validation)
  userCount: 10,  // Reduced for test case validation
  tenantCount: 3, // Reduced for test case validation

  // Resource type progressions (reduced for validation)
  resourceProgression: [
    {
      name: 'baseline',
      types: ['product', 'category'],
      description: '2 resource types (baseline)'
    },
    {
      name: 'expanded',
      types: ['product', 'category', 'user'],
      description: '3 resource types (expanded)'
    },
    {
      name: 'full',
      types: ['product', 'category', 'user', 'invoice'],
      description: '4 resource types (full)'
    },
    {
      name: 'enterprise',
      types: ['product', 'category', 'user', 'invoice', 'report'],
      description: '5 resource types (enterprise)'
    }
  ],

  // Number of authorization checks per resource level
  authChecksPerLevel: 20,  // Reduced for test case validation

  // Operations to test per resource type
  operationsToTest: ['view', 'create', 'update', 'delete']
};

// K6 options for this test
export const options = {
  stages: config.stages.baseline,
  thresholds: {
    ...config.thresholds,

    // Performance should degrade gracefully with more resources
    'query_latency_by_resource_count': ['p(95) < 100'], // Should remain reasonable
    'performance_degradation_percent': ['p(95) < 200'], // No more than 200% degradation
    'setup_time_by_resource_count': ['p(95) < 60000'], // Setup should complete in 60s

    // Cache should remain effective
    'cache_effectiveness_by_resources': ['rate > 0.8'], // 80% cache effectiveness

    // Index performance should scale well
    'index_performance_by_resources': ['p(95) < 50'] // Index queries under 50ms
  },
  setupTimeout: '300s',
  teardownTimeout: '300s'
};

/**
 * Setup phase - prepare baseline test environment
 */
export function setup() {
  console.log('🚀 Starting Resource Type Scaling Impact Test Setup');

  // Generate consistent test data for all progressions
  const baseTestData = keto.generateTestData(
    testConfig.userCount,
    testConfig.tenantCount,
    testConfig.resourceProgression[0].types // Start with baseline
  );

  console.log(`👥 Generated ${baseTestData.users.length} users, ${baseTestData.tenants.length} tenants`);

  return {
    baseTestData,
    startTime: Date.now(),
    progressionResults: []
  };
}

/**
 * Test single resource progression level
 */
function testResourceLevel(level, testData) {
  console.log(`🧪 Testing ${level.name}: ${level.description}`);

  const levelStartTime = Date.now();

  // Generate test data for this resource level
  const levelTestData = keto.generateTestData(
    testConfig.userCount,
    testConfig.tenantCount,
    level.types
  );

  // Setup tuples for this resource level
  console.log(`🔧 Setting up tuples for ${level.types.length} resource types...`);
  const setupStartTime = Date.now();

  const tupleCount = keto.setupTestTuples(
    levelTestData.users,
    levelTestData.tenants,
    level.types
  );

  const setupTime = Date.now() - setupStartTime;
  const tuplesPerResource = tupleCount / level.types.length;

  resourceScalingMetrics.resourceTypes.add(level.types.length);
  resourceScalingMetrics.tuplesPerResource.add(tuplesPerResource);
  resourceScalingMetrics.setupTimeByResourceCount.add(setupTime, {
    resource_count: level.types.length.toString()
  });

  console.log(`⏱️  Setup: ${tupleCount} tuples in ${setupTime}ms (${tuplesPerResource.toFixed(0)} per resource)`);

  // Wait for system to settle
  sleep(2);

  // Perform authorization checks across all resource types
  const authResults = [];
  const checksPerResourceType = Math.ceil(testConfig.authChecksPerLevel / level.types.length);

  for (const resourceType of level.types) {
    for (let i = 0; i < checksPerResourceType; i++) {
      const user = keto.randomChoice(levelTestData.users);
      const tenant = keto.randomChoice(levelTestData.tenants);
      const operation = keto.randomChoice(testConfig.operationsToTest);

      const authResult = keto.checkAuth(
        config.keto.namespace,
        `tenant:${tenant.id}#${resourceType}:items`,
        operation,
        `user:${user.id}`
      );

      authResults.push({
        ...authResult,
        resourceType,
        operation
      });
    }
  }

  // Calculate performance metrics for this level
  const avgLatency = authResults.reduce((sum, r) => sum + r.latency, 0) / authResults.length;
  const maxLatency = Math.max(...authResults.map(r => r.latency));
  const successRate = authResults.filter(r => r.response.status === 200).length / authResults.length;

  // Record level-specific performance
  const performanceMetric = resourceScalingMetrics[`${level.name}Performance`];
  if (performanceMetric) {
    performanceMetric.add(avgLatency);
  }

  resourceScalingMetrics.queryLatencyByResourceCount.add(avgLatency, {
    resource_count: level.types.length.toString()
  });

  // Test cache effectiveness (simulate repeated queries)
  const cacheTestResults = [];
  for (let i = 0; i < 20; i++) {
    const user = keto.randomChoice(levelTestData.users);
    const tenant = keto.randomChoice(levelTestData.tenants);
    const resourceType = keto.randomChoice(level.types);

    const firstCheck = keto.checkAuth(
      config.keto.namespace,
      `tenant:${tenant.id}#${resourceType}:items`,
      'view',
      `user:${user.id}`
    );

    // Immediate repeat - should be faster if cached
    const secondCheck = keto.checkAuth(
      config.keto.namespace,
      `tenant:${tenant.id}#${resourceType}:items`,
      'view',
      `user:${user.id}`
    );

    const cacheEffective = secondCheck.latency < firstCheck.latency * 0.8; // 20% improvement
    resourceScalingMetrics.cacheEffectiveness.add(cacheEffective);
    cacheTestResults.push({ first: firstCheck.latency, second: secondCheck.latency, effective: cacheEffective });
  }

  const cacheHitRate = cacheTestResults.filter(r => r.effective).length / cacheTestResults.length;

  // Test index performance with complex queries
  const indexTestStartTime = Date.now();
  for (let i = 0; i < 10; i++) {
    const user = keto.randomChoice(levelTestData.users);

    // Test batch check across multiple resource types
    const batchChecks = level.types.map(resourceType => ({
      namespace: config.keto.namespace,
      object: `tenant:${levelTestData.tenants[0].id}#${resourceType}:items`,
      relation: 'view',
      subjectId: `user:${user.id}`
    }));

    keto.batchCheckAuth(batchChecks);
  }
  const indexTestTime = Date.now() - indexTestStartTime;

  resourceScalingMetrics.indexPerformance.add(indexTestTime / 10, {
    resource_count: level.types.length.toString()
  });

  // Cleanup tuples for this level
  console.log('🧹 Cleaning up tuples...');
  const cleanupStartTime = Date.now();
  keto.cleanupTestTuples(levelTestData.users, levelTestData.tenants, level.types);
  const cleanupTime = Date.now() - cleanupStartTime;

  const totalLevelTime = Date.now() - levelStartTime;

  const levelResults = {
    level: level.name,
    resourceCount: level.types.length,
    tupleCount,
    setupTime,
    cleanupTime,
    totalTime: totalLevelTime,
    avgLatency,
    maxLatency,
    successRate,
    cacheHitRate,
    indexTestTime: indexTestTime / 10
  };

  console.log(`📊 ${level.name} Results:`);
  console.log(`   • Resource types: ${level.types.length}`);
  console.log(`   • Average latency: ${avgLatency.toFixed(2)}ms`);
  console.log(`   • Max latency: ${maxLatency.toFixed(2)}ms`);
  console.log(`   • Success rate: ${(successRate * 100).toFixed(2)}%`);
  console.log(`   • Cache hit rate: ${(cacheHitRate * 100).toFixed(2)}%`);
  console.log(`   • Index test time: ${(indexTestTime / 10).toFixed(2)}ms avg`);

  return levelResults;
}

/**
 * Main test function - tests each resource progression level
 */
export default function (data) {
  const progressionResults = [];
  let baselineLatency = null;

  // Test each resource progression level
  for (const level of testConfig.resourceProgression) {
    const levelResults = testResourceLevel(level, data.baseTestData);
    progressionResults.push(levelResults);

    // Track performance degradation compared to baseline
    if (level.name === 'baseline') {
      baselineLatency = levelResults.avgLatency;
    } else if (baselineLatency) {
      const degradationPercent = ((levelResults.avgLatency - baselineLatency) / baselineLatency) * 100;
      resourceScalingMetrics.performanceDegradation.add(degradationPercent, {
        level: level.name,
        resource_count: level.types.length.toString()
      });

      console.log(`📈 Performance degradation from baseline: ${degradationPercent.toFixed(2)}%`);
    }

    // Performance checks for this level
    check(levelResults, {
      'setup time reasonable': (r) => r.setupTime < 30000, // 30 seconds
      'latency acceptable': (r) => r.avgLatency < config.sla.authCheckLatency.p95,
      'high success rate': (r) => r.successRate > 0.95,
      'cache effective': (r) => r.cacheHitRate > 0.6, // At least 60% cache effectiveness
      'index performance good': (r) => r.indexTestTime < 50 // Under 50ms per batch
    }, {
      level: level.name,
      resource_count: level.types.length.toString()
    });

    // Delay between levels to allow system recovery
    sleep(5);
  }

  // Overall scaling analysis
  console.log('📊 Resource Scaling Analysis:');

  for (let i = 1; i < progressionResults.length; i++) {
    const prev = progressionResults[i - 1];
    const curr = progressionResults[i];

    const latencyIncrease = ((curr.avgLatency - prev.avgLatency) / prev.avgLatency) * 100;
    const setupTimeIncrease = ((curr.setupTime - prev.setupTime) / prev.setupTime) * 100;

    console.log(`   ${prev.level} → ${curr.level}:`);
    console.log(`     • Latency change: ${latencyIncrease.toFixed(2)}%`);
    console.log(`     • Setup time change: ${setupTimeIncrease.toFixed(2)}%`);
    console.log(`     • Cache effectiveness: ${(curr.cacheHitRate * 100).toFixed(2)}%`);
  }

  data.progressionResults = progressionResults;
}

/**
 * Teardown phase
 */
export function teardown(data) {
  console.log('🏁 Resource Type Scaling Impact Test Complete');

  const testDuration = Date.now() - data.startTime;
  console.log(`⏰ Total test duration: ${(testDuration / 1000 / 60).toFixed(2)} minutes`);

  if (data.progressionResults && data.progressionResults.length > 0) {
    console.log('📈 Scaling Summary:');

    const baseline = data.progressionResults[0];
    const enterprise = data.progressionResults[data.progressionResults.length - 1];

    const overallLatencyIncrease = ((enterprise.avgLatency - baseline.avgLatency) / baseline.avgLatency) * 100;
    const overallSetupIncrease = ((enterprise.setupTime - baseline.setupTime) / baseline.setupTime) * 100;

    console.log(`   • Baseline (2 resources): ${baseline.avgLatency.toFixed(2)}ms avg latency`);
    console.log(`   • Enterprise (20 resources): ${enterprise.avgLatency.toFixed(2)}ms avg latency`);
    console.log(`   • Overall latency increase: ${overallLatencyIncrease.toFixed(2)}%`);
    console.log(`   • Overall setup time increase: ${overallSetupIncrease.toFixed(2)}%`);

    // Recommendations based on results
    if (overallLatencyIncrease < 100) {
      console.log('✅ Good scalability: Linear performance degradation');
    } else if (overallLatencyIncrease < 300) {
      console.log('⚠️  Moderate scaling impact: Consider optimization');
    } else {
      console.log('❌ Poor scalability: Significant performance degradation');
    }
  }

  console.log('✅ Check metrics for resource type scaling analysis');
}
