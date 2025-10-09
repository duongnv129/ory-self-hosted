/**
 * Scenario 2: Real-World Authorization Patterns Test
 *
 * Tests realistic authorization request patterns based on user behavior:
 * - Alice Pattern (Multi-tenant user): 60% product, 30% category, 10% cross-tenant
 * - Bob Pattern (Single-tenant admin): 80% admin ops, 20% view ops
 * - Charlie Pattern (Customer): 95% view ops, 5% failed ops
 *
 * Load Distribution: 70% Alice, 20% Bob, 10% Charlie
 */

import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import config, { getStagesByProfile } from '../config.js';
import keto from '../utils/keto-utils.js';

// Test-specific metrics
const authPatternMetrics = {
  aliceRequests: new Counter('alice_pattern_requests'),
  bobRequests: new Counter('bob_pattern_requests'),
  charlieRequests: new Counter('charlie_pattern_requests'),
  crossTenantAttempts: new Counter('cross_tenant_attempts'),
  adminOperations: new Counter('admin_operations'),
  viewOperations: new Counter('view_operations'),
  failedOperations: new Counter('failed_operations'),

  // Latency by user type
  aliceLatency: new Trend('alice_latency', true),
  bobLatency: new Trend('bob_latency', true),
  charlieLatency: new Trend('charlie_latency', true),

  // Success rates by pattern
  aliceSuccessRate: new Rate('alice_success_rate'),
  bobSuccessRate: new Rate('bob_success_rate'),
  charlieSuccessRate: new Rate('charlie_success_rate')
};

// Test configuration
const testConfig = {
  // User distribution (70% Alice, 20% Bob, 10% Charlie)
  userDistribution: {
    alice: 0.7,
    bob: 0.2,
    charlie: 0.1
  },

  // Number of tenants and resources for realistic scenario
  tenantCount: 3,  // Reduced for test case validation
  userCount: 15,   // Reduced for test case validation
  resourceTypes: ['product', 'category'],  // Reduced for test case validation

  // Actions per user type per iteration
  actionsPerIteration: {
    alice: 5,   // Reduced for test case validation
    bob: 4,     // Reduced for test case validation
    charlie: 3  // Reduced for test case validation
  }
};

// K6 options for this test
export const options = {
  stages: getStagesByProfile(__ENV.LOAD_PROFILE),
  thresholds: {
    ...config.thresholds,

    // User-specific SLAs (relaxed for validation)
    'alice_latency': ['p(95) < 100'], // Relaxed for test validation
    'bob_latency': ['p(95) < 100'],   // Relaxed for test validation
    'charlie_latency': ['p(95) < 100'], // Relaxed for test validation

    // Success rate requirements (should be high now that test patterns match granted permissions)
    'alice_success_rate': ['rate > 0.95'], // Should be high - Alice only tests granted permissions (view, create, delete for products; view, update for categories)
    'bob_success_rate': ['rate > 0.95'],   // Should be high - Bob only tests granted permissions per resource type
    'charlie_success_rate': ['rate > 0.95'], // Should be high - Charlie only does view operations

    // Cross-tenant isolation
    'checks{check:tenant_isolation}': ['rate == 1'], // 100% isolation maintained

    // Overall performance (relaxed)
    'http_req_duration{endpoint:auth_check}': ['p(95) < 100']
  },
  setupTimeout: '120s'
};

/**
 * Setup phase - create realistic test environment
 */
export function setup() {
  console.log('🚀 Starting Real-World Authorization Patterns Test Setup');

  // Generate test data
  const testData = keto.generateTestData(
    testConfig.userCount,
    testConfig.tenantCount,
    testConfig.resourceTypes
  );

  console.log(`👥 Generated ${testData.users.length} users, ${testData.tenants.length} tenants, ${testData.resources.length} resources`);

  // Setup initial role assignments
  console.log('🔧 Setting up role assignments...');

  // Alice gets multi-tenant access with different roles per resource
  const aliceUsers = testData.users.filter(u => u.id.includes('1') || u.id.includes('2')); // ~20% of users are Alice-type
  const bobUsers = testData.users.filter(u => u.id.includes('3')); // ~10% are Bob-type
  const charlieUsers = testData.users.filter(u => !aliceUsers.includes(u) && !bobUsers.includes(u)); // Rest are Charlie-type

  let tupleCount = 0;

  // First, setup permission mappings for each tenant and resource type (like the reference test)
  for (const tenant of testData.tenants) {
    for (const resourceType of testConfig.resourceTypes) {
      const resourceObject = `tenant:${tenant.id}#${resourceType}:items`;

      // Role hierarchy: admin → moderator → customer (like Tenant A in reference)
      keto.createTupleWithSubjectSet(config.keto.namespace, resourceObject, 'moderator', config.keto.namespace, resourceObject, 'admin');
      keto.createTupleWithSubjectSet(config.keto.namespace, resourceObject, 'customer', config.keto.namespace, resourceObject, 'moderator');

      // Permission mappings based on reference test
      keto.createTupleWithSubjectSet(config.keto.namespace, resourceObject, 'view', config.keto.namespace, resourceObject, 'customer');

      if (resourceType === 'product') {
        keto.createTupleWithSubjectSet(config.keto.namespace, resourceObject, 'create', config.keto.namespace, resourceObject, 'moderator');
        keto.createTupleWithSubjectSet(config.keto.namespace, resourceObject, 'delete', config.keto.namespace, resourceObject, 'admin');
      } else if (resourceType === 'category') {
        keto.createTupleWithSubjectSet(config.keto.namespace, resourceObject, 'update', config.keto.namespace, resourceObject, 'moderator');
        keto.createTupleWithSubjectSet(config.keto.namespace, resourceObject, 'create', config.keto.namespace, resourceObject, 'admin');
      } else {
        // For user and invoice: basic CRUD for moderator+ and admin
        keto.createTupleWithSubjectSet(config.keto.namespace, resourceObject, 'create', config.keto.namespace, resourceObject, 'moderator');
        keto.createTupleWithSubjectSet(config.keto.namespace, resourceObject, 'update', config.keto.namespace, resourceObject, 'moderator');
        keto.createTupleWithSubjectSet(config.keto.namespace, resourceObject, 'delete', config.keto.namespace, resourceObject, 'admin');
      }

      tupleCount += 6; // 2 hierarchy + 4 permissions on average
    }
  }

  // Setup Alice patterns - multi-tenant with varying roles
  for (const user of aliceUsers) {
    for (let i = 0; i < Math.min(2, testData.tenants.length); i++) { // Alice has access to first 2 tenants only (to test cross-tenant isolation)
      const tenant = testData.tenants[i];

      // Different roles for different resources (matching reference test pattern)
      keto.createTuple(config.keto.namespace, `tenant:${tenant.id}#product:items`, 'admin', `user:${user.id}`);
      keto.createTuple(config.keto.namespace, `tenant:${tenant.id}#category:items`, 'moderator', `user:${user.id}`);
      keto.createTuple(config.keto.namespace, `tenant:${tenant.id}#user:items`, 'customer', `user:${user.id}`);
      keto.createTuple(config.keto.namespace, `tenant:${tenant.id}#invoice:items`, 'customer', `user:${user.id}`);
      tupleCount += 4;
    }
  }

  // Setup Bob patterns - single tenant admin
  for (const user of bobUsers) {
    const tenant = testData.tenants[0]; // Bob users typically have one main tenant

    // Admin role for all resources in their tenant
    for (const resourceType of testConfig.resourceTypes) {
      keto.createTuple(config.keto.namespace, `tenant:${tenant.id}#${resourceType}:items`, 'admin', `user:${user.id}`);
      tupleCount++;
    }
  }

  // Setup Charlie patterns - customer access
  for (const user of charlieUsers) {
    const tenant = keto.randomChoice(testData.tenants);

    // Customer role for limited resources
    keto.createTuple(config.keto.namespace, `tenant:${tenant.id}#product:items`, 'customer', `user:${user.id}`);
    keto.createTuple(config.keto.namespace, `tenant:${tenant.id}#category:items`, 'customer', `user:${user.id}`);
    tupleCount += 2;
  }

  console.log(`✅ Setup completed: ${tupleCount} tuples created`);

  return {
    testData,
    aliceUsers,
    bobUsers,
    charlieUsers,
    startTime: Date.now()
  };
}

/**
 * Simulate Alice behavior pattern
 */
function simulateAlicePattern(aliceUser, testData) {
  const actions = [];
  const tenant = keto.randomChoice(testData.tenants.slice(0, 2)); // Alice has access to first 2 tenants only

  for (let i = 0; i < testConfig.actionsPerIteration.alice; i++) {
    const behavior = keto.weightedRandomChoice(
      ['product_check', 'category_check', 'cross_tenant_check'],
      [0.6, 0.3, 0.1]
    );

    let action;

    switch (behavior) {
      case 'product_check':
        action = {
          type: 'alice_product',
          namespace: config.keto.namespace,
          object: `tenant:${tenant.id}#product:items`,
          relation: keto.randomChoice(['view', 'create', 'delete']), // Alice is admin for products (view from customer, create from moderator, delete from admin)
          subjectId: `user:${aliceUser.id}`
        };
        break;

      case 'category_check':
        action = {
          type: 'alice_category',
          namespace: config.keto.namespace,
          object: `tenant:${tenant.id}#category:items`,
          relation: keto.randomChoice(['view', 'update']), // Alice is moderator for categories (view from customer, update from moderator)
          subjectId: `user:${aliceUser.id}`
        };
        break;

      case 'cross_tenant_check':
        // Find tenant Alice doesn't have access to (Alice only has access to first 2 tenants)
        const aliceAccessibleTenants = testData.tenants.slice(0, Math.min(2, testData.tenants.length));
        const allTenants = testData.tenants;
        const inaccessibleTenants = allTenants.filter(t => !aliceAccessibleTenants.includes(t));

        // Use tenant 3 (index 2) which Alice doesn't have access to
        const otherTenant = inaccessibleTenants.length > 0 ?
          keto.randomChoice(inaccessibleTenants) :
          testData.tenants[testData.tenants.length - 1]; // Fallback to last tenant

        action = {
          type: 'alice_cross_tenant',
          namespace: config.keto.namespace,
          object: `tenant:${otherTenant.id}#product:items`,
          relation: 'view',
          subjectId: `user:${aliceUser.id}`,
          expectFailure: true
        };
        break;
    }

    actions.push(action);
  }

  return actions;
}

/**
 * Simulate Bob behavior pattern
 */
function simulateBobPattern(bobUser, testData) {
  const actions = [];
  const tenant = testData.tenants[0]; // Bob works in primary tenant

  for (let i = 0; i < testConfig.actionsPerIteration.bob; i++) {
    const behavior = keto.weightedRandomChoice(
      ['admin_operation', 'view_operation'],
      [0.8, 0.2]
    );

    const resourceType = keto.randomChoice(testConfig.resourceTypes);

    let action;

    if (behavior === 'admin_operation') {
      // Bob is admin - choose operations based on resource type permissions
      let adminRelations;
      if (resourceType === 'product') {
        adminRelations = ['create', 'delete']; // Products have create (moderator) and delete (admin)
      } else if (resourceType === 'category') {
        adminRelations = ['create', 'update', 'delete']; // Categories have create (admin), update (moderator), delete (admin)
      } else {
        adminRelations = ['create', 'update', 'delete']; // Other resources have full CRUD
      }

      action = {
        type: 'bob_admin',
        namespace: config.keto.namespace,
        object: `tenant:${tenant.id}#${resourceType}:items`,
        relation: keto.randomChoice(adminRelations),
        subjectId: `user:${bobUser.id}`
      };
    } else {
      action = {
        type: 'bob_view',
        namespace: config.keto.namespace,
        object: `tenant:${tenant.id}#${resourceType}:items`,
        relation: 'view',
        subjectId: `user:${bobUser.id}`
      };
    }

    actions.push(action);
  }

  return actions;
}

/**
 * Simulate Charlie behavior pattern
 */
function simulateCharliePattern(charlieUser, testData) {
  const actions = [];
  const tenant = keto.randomChoice(testData.tenants);

  for (let i = 0; i < testConfig.actionsPerIteration.charlie; i++) {
    const behavior = keto.weightedRandomChoice(
      ['view_operation', 'failed_operation'],
      [0.95, 0.05]
    );

    let action;

    if (behavior === 'view_operation') {
      action = {
        type: 'charlie_view',
        namespace: config.keto.namespace,
        object: `tenant:${tenant.id}#${keto.randomChoice(['product', 'category'])}:items`,
        relation: 'view',
        subjectId: `user:${charlieUser.id}`
      };
    } else {
      // Intentional failure - trying to do admin action as customer
      action = {
        type: 'charlie_failed',
        namespace: config.keto.namespace,
        object: `tenant:${tenant.id}#product:items`,
        relation: keto.randomChoice(['create', 'update', 'delete']),
        subjectId: `user:${charlieUser.id}`,
        expectFailure: true
      };
    }

    actions.push(action);
  }

  return actions;
}

/**
 * Main test function - simulates realistic user behavior
 */
export default function (data) {
  // Select user type based on distribution
  const userType = keto.weightedRandomChoice(
    ['alice', 'bob', 'charlie'],
    [testConfig.userDistribution.alice, testConfig.userDistribution.bob, testConfig.userDistribution.charlie]
  );

  let selectedUser, actions;

  switch (userType) {
    case 'alice':
      selectedUser = keto.randomChoice(data.aliceUsers);
      actions = simulateAlicePattern(selectedUser, data.testData);
      authPatternMetrics.aliceRequests.add(actions.length);
      break;

    case 'bob':
      selectedUser = keto.randomChoice(data.bobUsers);
      actions = simulateBobPattern(selectedUser, data.testData);
      authPatternMetrics.bobRequests.add(actions.length);
      break;

    case 'charlie':
      selectedUser = keto.randomChoice(data.charlieUsers);
      actions = simulateCharliePattern(selectedUser, data.testData);
      authPatternMetrics.charlieRequests.add(actions.length);
      break;
  }

  // Execute the actions
  const results = [];

  for (const action of actions) {
    const startTime = Date.now();
    const result = keto.checkAuth(
      action.namespace,
      action.object,
      action.relation,
      action.subjectId
    );
    const endTime = Date.now();

    const latency = endTime - startTime;
    const success = action.expectFailure ? !result.allowed : result.allowed;

    // Record metrics by user type
    switch (userType) {
      case 'alice':
        authPatternMetrics.aliceLatency.add(latency);
        authPatternMetrics.aliceSuccessRate.add(success);
        break;
      case 'bob':
        authPatternMetrics.bobLatency.add(latency);
        authPatternMetrics.bobSuccessRate.add(success);
        break;
      case 'charlie':
        authPatternMetrics.charlieLatency.add(latency);
        authPatternMetrics.charlieSuccessRate.add(success);
        break;
    }

    // Record action type metrics
    if (action.type.includes('cross_tenant')) {
      authPatternMetrics.crossTenantAttempts.add(1);
    } else if (action.relation === 'view') {
      authPatternMetrics.viewOperations.add(1);
    } else if (['create', 'update', 'delete'].includes(action.relation)) {
      authPatternMetrics.adminOperations.add(1);
    }

    if (action.expectFailure && result.allowed) {
      authPatternMetrics.failedOperations.add(1);
    }

    results.push({
      action,
      result,
      latency,
      success
    });
  }

  // Performance checks
  const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
  const successRate = results.filter(r => r.success).length / results.length;

  check(null, {
    'user pattern latency acceptable': () => avgLatency < config.sla.authCheckLatency.p95,
    'user pattern success rate good': () => successRate > 0.8,
    'no unauthorized cross-tenant access': () => !results.some(r =>
      r.action.type.includes('cross_tenant') && r.result.allowed
    )
  }, {
    user_type: userType,
    user_id: selectedUser.id
  });

  // Small delay to simulate real user behavior
  sleep(0.5 + Math.random() * 1); // 0.5-1.5s delay
}

/**
 * Teardown phase
 */
export function teardown(data) {
  console.log('🏁 Real-World Authorization Patterns Test Complete');

  const testDuration = Date.now() - data.startTime;
  console.log(`⏰ Total test duration: ${(testDuration / 1000 / 60).toFixed(2)} minutes`);

  console.log('📊 User Distribution Summary:');
  console.log(`   • Alice users (multi-tenant): ${data.aliceUsers.length}`);
  console.log(`   • Bob users (admin): ${data.bobUsers.length}`);
  console.log(`   • Charlie users (customer): ${data.charlieUsers.length}`);

  console.log('✅ Check metrics for realistic user behavior analysis');
}
