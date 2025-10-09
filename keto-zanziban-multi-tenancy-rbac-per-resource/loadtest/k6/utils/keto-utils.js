/**
 * Keto API utilities for k6 load testing
 *
 * Provides helper functions for interacting with Keto's relation-tuple API
 * and performing authorization checks in a performance testing context.
 */

import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import config from '../config.js';

// Custom metrics
export const authCheckLatency = new Trend('auth_check_latency', true);
export const tupleCreationLatency = new Trend('tuple_creation_latency', true);
export const authFailureRate = new Rate('auth_failure_rate');
export const tenantIsolationViolations = new Counter('tenant_isolation_violations');

/**
 * Create a relation tuple in Keto with subject_id
 */
export function createTuple(namespace, object, relation, subjectId) {
  const payload = {
    namespace,
    object,
    relation,
    subject_id: subjectId
  };

  const response = http.put(
    `${config.keto.writeUrl}/admin/relation-tuples`,
    JSON.stringify(payload),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { operation: 'tuple_create', endpoint: 'write_tuple' }
    }
  );

  tupleCreationLatency.add(response.timings.duration);

  check(response, {
    'tuple creation successful': (r) => r.status === 201,
    'tuple creation fast': (r) => r.timings.duration < 100
  });

  return response;
}

/**
 * Create a relation tuple in Keto with subject_set (for role inheritance and permissions)
 */
export function createTupleWithSubjectSet(namespace, object, relation, subjectNamespace, subjectObject, subjectRelation) {
  const payload = {
    namespace,
    object,
    relation,
    subject_set: {
      namespace: subjectNamespace,
      object: subjectObject,
      relation: subjectRelation
    }
  };

  const response = http.put(
    `${config.keto.writeUrl}/admin/relation-tuples`,
    JSON.stringify(payload),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { operation: 'tuple_create', endpoint: 'write_tuple' }
    }
  );

  tupleCreationLatency.add(response.timings.duration);

  check(response, {
    'tuple creation successful': (r) => r.status === 201,
    'tuple creation fast': (r) => r.timings.duration < 100
  });

  return response;
}

/**
 * Delete a relation tuple from Keto
 */
export function deleteTuple(namespace, object, relation, subjectId) {
  // Build URL with query parameters (same pattern as checkAuth)
  const url = `${config.keto.writeUrl}/admin/relation-tuples` +
    `?namespace=${encodeURIComponent(namespace)}` +
    `&object=${encodeURIComponent(object)}` +
    `&relation=${encodeURIComponent(relation)}` +
    `&subject_id=${encodeURIComponent(subjectId)}`;

  const response = http.del(url, null, {
    tags: { operation: 'tuple_delete', endpoint: 'delete_tuple' }
  });

  check(response, {
    'tuple deletion successful': (r) => r.status === 204,
    'tuple deletion fast': (r) => r.timings.duration < 50
  });

  return response;
}

/**
 * Check authorization for a specific permission
 */
export function checkAuth(namespace, object, relation, subjectId) {
  // Manually construct URL with proper encoding (like curl --data-urlencode)
  const url = `${config.keto.readUrl}/relation-tuples/check` +
    `?namespace=${encodeURIComponent(namespace)}` +
    `&object=${encodeURIComponent(object)}` +
    `&relation=${encodeURIComponent(relation)}` +
    `&subject_id=${encodeURIComponent(subjectId)}`;

  const startTime = Date.now();
  const response = http.get(url, {
    tags: { endpoint: 'auth_check', operation: 'check_permission' }
  });
  const endTime = Date.now();

  const latency = endTime - startTime;
  authCheckLatency.add(latency);

  const isAuthorized = response.status === 200 &&
    JSON.parse(response.body).allowed === true;
  const authFailed = response.status !== 200;

  authFailureRate.add(authFailed);

  check(response, {
    'auth check responded': (r) => r.status === 200,
    'auth check fast': (r) => r.timings.duration < config.sla.authCheckLatency.p95,
    'auth check ultra-fast': (r) => r.timings.duration < config.sla.authCheckLatency.p50
  });

  return {
    allowed: isAuthorized,
    latency,
    response
  };
}

/**
 * Batch authorization check for multiple permissions
 */
export function batchCheckAuth(checks) {
  const startTime = Date.now();
  const results = [];

  for (const check of checks) {
    const result = checkAuth(
      check.namespace,
      check.object,
      check.relation,
      check.subjectId
    );
    results.push(result);
  }

  const endTime = Date.now();
  const totalLatency = endTime - startTime;

  check(null, {
    'batch auth under SLA': () => totalLatency < config.sla.bulkAuthLatency.p95,
    'batch auth all successful': () => results.every(r => r.response.status === 200)
  }, { endpoint: 'bulk_auth' });

  return {
    results,
    totalLatency,
    averageLatency: totalLatency / checks.length
  };
}

/**
 * Test tenant isolation by attempting cross-tenant access
 */
export function testTenantIsolation(userId, tenantId, otherTenantId, resource, action) {
  // Check valid access
  const validAccess = checkAuth(
    config.keto.namespace,
    `tenant:${tenantId}#${resource}:items`,
    action,
    `user:${userId}`
  );

  // Check invalid cross-tenant access
  const invalidAccess = checkAuth(
    config.keto.namespace,
    `tenant:${otherTenantId}#${resource}:items`,
    action,
    `user:${userId}`
  );

  // This should be denied - if allowed, it's a violation
  if (invalidAccess.allowed) {
    tenantIsolationViolations.add(1);
  }

  check(null, {
    'tenant isolation maintained': () => !invalidAccess.allowed
  }, { check: 'tenant_isolation' });

  return {
    validAccess: validAccess.allowed,
    isolationViolation: invalidAccess.allowed
  };
}

/**
 * Generate test data for users, tenants, and resources
 */
export function generateTestData(userCount, tenantCount, resourceTypes) {
  const users = [];
  const tenants = [];
  const resources = [];

  // Generate users
  for (let i = 1; i <= userCount; i++) {
    users.push({
      id: `user${i}`,
      email: `user${i}@example.com`,
      role: config.testData.roles[i % config.testData.roles.length]
    });
  }

  // Generate tenants
  for (let i = 1; i <= tenantCount; i++) {
    tenants.push({
      id: `tenant${i}`,
      name: `Tenant ${i}`
    });
  }

  // Generate resources for each tenant
  for (const tenant of tenants) {
    for (const resourceType of resourceTypes) {
      resources.push({
        tenantId: tenant.id,
        type: resourceType,
        object: `tenant:${tenant.id}#${resourceType}:items`
      });
    }
  }

  return { users, tenants, resources };
}

/**
 * Setup initial tuples for a test scenario (includes permission mappings)
 */
export function setupTestTuples(users, tenants, resourceTypes) {
  const setupStartTime = Date.now();
  let tupleCount = 0;

  // First, setup permission mappings for each tenant and resource type (like the reference test)
  for (const tenant of tenants) {
    for (const resourceType of resourceTypes) {
      const resourceObject = `tenant:${tenant.id}#${resourceType}:items`;

      // Role hierarchy: admin → moderator → customer (like reference test)
      createTupleWithSubjectSet(config.keto.namespace, resourceObject, 'moderator', config.keto.namespace, resourceObject, 'admin');
      createTupleWithSubjectSet(config.keto.namespace, resourceObject, 'customer', config.keto.namespace, resourceObject, 'moderator');

      // Permission mappings based on reference test
      createTupleWithSubjectSet(config.keto.namespace, resourceObject, 'view', config.keto.namespace, resourceObject, 'customer');

      if (resourceType === 'product') {
        createTupleWithSubjectSet(config.keto.namespace, resourceObject, 'create', config.keto.namespace, resourceObject, 'moderator');
        createTupleWithSubjectSet(config.keto.namespace, resourceObject, 'delete', config.keto.namespace, resourceObject, 'admin');
      } else if (resourceType === 'category') {
        createTupleWithSubjectSet(config.keto.namespace, resourceObject, 'update', config.keto.namespace, resourceObject, 'moderator');
        createTupleWithSubjectSet(config.keto.namespace, resourceObject, 'create', config.keto.namespace, resourceObject, 'admin');
      } else {
        // For other resource types: basic CRUD for moderator+ and admin
        createTupleWithSubjectSet(config.keto.namespace, resourceObject, 'create', config.keto.namespace, resourceObject, 'moderator');
        createTupleWithSubjectSet(config.keto.namespace, resourceObject, 'update', config.keto.namespace, resourceObject, 'moderator');
        createTupleWithSubjectSet(config.keto.namespace, resourceObject, 'delete', config.keto.namespace, resourceObject, 'admin');
      }

      tupleCount += 6; // 2 hierarchy + 4 permissions on average
    }
  }

  // Then assign roles to users for each resource in each tenant
  for (const user of users) {
    for (const tenant of tenants) {
      for (const resourceType of resourceTypes) {
        // Assign role to user for each resource in each tenant
        createTuple(
          config.keto.namespace,
          `tenant:${tenant.id}#${resourceType}:items`,
          user.role,
          `user:${user.id}`
        );
        tupleCount++;
      }
    }
  }

  const setupTime = Date.now() - setupStartTime;

  console.log(`Setup completed: ${tupleCount} tuples created in ${setupTime}ms`);
  console.log(`Tuple creation rate: ${(tupleCount / setupTime * 1000).toFixed(2)} tuples/second`);

  return tupleCount;
}

/**
 * Cleanup test tuples (delete all tuples in namespace)
 */
export function cleanupTestTuples(users, tenants, resourceTypes) {
  const cleanupStartTime = Date.now();

  // Delete all tuples in the namespace at once
  const url = `${config.keto.writeUrl}/admin/relation-tuples?namespace=${encodeURIComponent(config.keto.namespace)}`;

  const response = http.del(url, null, {
    tags: { operation: 'cleanup', endpoint: 'delete_namespace' }
  });

  const cleanupTime = Date.now() - cleanupStartTime;
  const success = response.status === 204;

  if (success) {
    console.log(`Cleanup completed: all tuples in namespace '${config.keto.namespace}' deleted in ${cleanupTime}ms`);
  } else {
    console.log(`Cleanup failed: status ${response.status}, response: ${response.body}`);
  }

  check(response, {
    'cleanup successful': (r) => r.status === 204
  });

  return success ? 1 : 0;
}

/**
 * Get random element from array
 */
export function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate weighted random choice based on user behavior patterns
 */
export function weightedRandomChoice(choices, weights) {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < choices.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return choices[i];
    }
  }

  return choices[choices.length - 1];
}

/**
 * Simulate realistic user behavior patterns
 */
export function simulateUserBehavior(userType, tenantId, availableResources) {
  switch (userType) {
    case 'alice': // Multi-tenant user
      return weightedRandomChoice(
        ['product:items', 'category:items', 'cross-tenant'],
        [0.6, 0.3, 0.1]
      );

    case 'bob': // Single-tenant admin
      return weightedRandomChoice(
        ['admin-operations', 'view-operations'],
        [0.8, 0.2]
      );

    case 'charlie': // Customer
      return weightedRandomChoice(
        ['view-operations', 'failed-operations'],
        [0.95, 0.05]
      );

    default:
      return randomChoice(availableResources);
  }
}

export default {
  createTuple,
  createTupleWithSubjectSet,
  deleteTuple,
  checkAuth,
  batchCheckAuth,
  testTenantIsolation,
  generateTestData,
  setupTestTuples,
  cleanupTestTuples,
  randomChoice,
  weightedRandomChoice,
  simulateUserBehavior,
  authCheckLatency,
  tupleCreationLatency,
  authFailureRate,
  tenantIsolationViolations
};
