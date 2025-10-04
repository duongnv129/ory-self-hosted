# Multi-Tenancy RBAC Problem Analysis

## Problem Analysis

### Core Challenge

Extend the existing single-tenant Keto RBAC system to support **multi-tenancy** where:
- Multiple tenants (Tenant A, Tenant B) have isolated roles and permissions
- Users belong to specific tenants
- Roles and permissions are **tenant-scoped** (tenant A's admin ` tenant B's admin)
- Different tenants may have different role hierarchies

### Key Constraints

1. **Single Namespace Model**: Current system uses only `default` namespace (id: 0)
2. **Existing Simple RBAC**: Working implementation without tenant isolation
3. **Zanzibar Model**: Must leverage Keto's relationship tuples efficiently
4. **Backward Compatibility**: Shouldn't break existing authorization patterns

### Critical Success Factors

- Complete tenant isolation (no cross-tenant permission leakage)
- Efficient authorization checks (single-query model preserved)
- Scalable to many tenants
- Clear, maintainable relationship structure

---

## Multi-Dimensional Analysis

### 1. Technical Perspective

**Current Architecture Gap:**
```
Current: user:alice ’ role:admin ’ product:items#create
Problem: role:admin is global, not tenant-scoped
```

**Multi-Tenancy Challenges:**
- Keto uses relationship tuples: `(namespace, object, relation, subject)`
- Tenancy must be encoded in the tuple structure
- Single namespace limits isolation options
- Need efficient cross-tenant boundary enforcement

### 2. System Perspective

**Zanzibar Relationship Model:**
```
Traditional RBAC: User ’ Role ’ Permission
Zanzibar Pattern: Subject ’ Relation ’ Object
```

**Key Insight:** Tenancy is a **relationship property**, not just an attribute

### 3. User Perspective (Developers)

**Developer Experience Requirements:**
- Authorization checks should include tenant context
- Clear API: "Can user X in tenant A perform action Y?"
- Debugging capability: inspect tenant-specific permissions
- Migration path from simple RBAC

---

## Solution Options

### Option 1: **Object-Level Tenant Encoding** (Recommended)

**Description:** Encode tenant ID directly in object identifiers

**Implementation:**
```json
// User to role assignment (tenant-scoped)
{
  "namespace": "default",
  "object": "tenant:a#role:admin",
  "relation": "member",
  "subject_id": "user:alice"
}

// Role hierarchy (tenant-scoped)
{
  "namespace": "default",
  "object": "tenant:a#role:customer",
  "relation": "member",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:a#role:moderator",
    "relation": "member"
  }
}

// Permission assignment (tenant-scoped resources)
{
  "namespace": "default",
  "object": "tenant:a#product:items",
  "relation": "create",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:a#role:moderator",
    "relation": "member"
  }
}
```

**Authorization Check:**
```bash
# Check if alice (tenant A) can create products in tenant A
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=default" \
  --data-urlencode "object=tenant:a#product:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:alice"
```

**Pros:**
-  Complete tenant isolation at object level
-  Single namespace simplicity maintained
-  Clear tenant boundaries in relation tuples
-  Natural tenant-specific role hierarchies
-  Backward compatible (can migrate incrementally)
-  Efficient single-query authorization
-  Easy to debug (tenant visible in all tuples)

**Cons:**
-   Object naming convention must be strictly enforced
-   Requires application-level tenant context injection
-   More verbose tuple definitions

**Risk Assessment:** **Low** - Well-established pattern in Zanzibar systems

---

### Option 2: **Subject-Set Tenant Membership**

**Description:** Model tenant membership as a relationship, then check both tenant and permission

**Implementation:**
```json
// User belongs to tenant
{
  "namespace": "default",
  "object": "tenant:a",
  "relation": "member",
  "subject_id": "user:alice"
}

// Role scoped to tenant via subject_set
{
  "namespace": "default",
  "object": "role:admin",
  "relation": "member",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:a",
    "relation": "member"
  }
}
```

**Authorization Pattern:**
```
1. Check: user:alice  tenant:a#member
2. Check: user:alice ’ role:admin#member
3. Check: role:admin ’ product:items#create
```

**Pros:**
-  Flexible tenant membership model
-  Supports users in multiple tenants
-  Clean separation of tenant vs role concepts

**Cons:**
- L **Breaks single-query model** (requires multiple checks)
- L Complex relationship graph traversal
- L Potential cross-tenant permission leakage
- L Performance overhead (multiple authorization queries)

**Risk Assessment:** **High** - Violates Keto's single-query efficiency principle

---

### Option 3: **Hybrid Context-Aware Relationships**

**Description:** Combine object encoding with subject attributes

**Implementation:**
```json
// User with tenant attribute (stored in Kratos)
user:alice has trait { "tenant_ids": ["tenant:a"] }

// Authorization includes tenant context
{
  "namespace": "default",
  "object": "product:items",
  "relation": "create",
  "subject_set": {
    "namespace": "default",
    "object": "role:admin",
    "relation": "member"
  }
}

// Application-level check
if (user.tenant_id === resource.tenant_id && keto.check(...)) {
  allow();
}
```

**Pros:**
-  Leverages existing Kratos identity traits
-  Flexible user-tenant associations
-  Simpler Keto tuples

**Cons:**
- L **Tenant isolation enforced in application code** (security risk)
- L Not true Zanzibar model
- L Difficult to audit tenant boundaries
- L Race conditions if user tenant changes

**Risk Assessment:** **Very High** - Moves security logic to application layer

---

### Option 4: **Multi-Namespace Approach**

**Description:** Use separate Keto namespaces per tenant

**Implementation:**
```yaml
namespaces:
  - id: 0
    name: tenant_a
  - id: 1
    name: tenant_b
```

**Pros:**
-  Complete namespace-level isolation
-  Simple per-tenant permission model

**Cons:**
- L **Not scalable** (namespaces are limited, pre-configured)
- L Requires Keto restart for new tenants
- L Complex cross-tenant operations
- L Namespace explosion with many tenants

**Risk Assessment:** **Medium** - Operational complexity, poor scalability

---

## Recommended Solution: Option 1 (Object-Level Tenant Encoding)

### Implementation Roadmap

#### Phase 1: Design & Schema Definition

1. **Define Naming Convention:**
   ```
   Format: tenant:{tenant_id}#{resource_type}:{resource_id}
   Examples:
   - tenant:a#role:admin
   - tenant:b#product:items
   - tenant:a#category:123
   ```

2. **Document Relationship Patterns:**
   ```
   User ’ Tenant-Scoped Role
   Tenant-Scoped Role ’ Tenant-Scoped Resource
   Role Hierarchy (within tenant)
   ```

#### Phase 2: Tuple Structure Implementation

**Core Tuples:**

```json
// 1. User to tenant-scoped role
{
  "namespace": "default",
  "object": "tenant:a#role:admin",
  "relation": "member",
  "subject_id": "user:alice"
}

// 2. Role hierarchy (Tenant A)
{
  "namespace": "default",
  "object": "tenant:a#role:customer",
  "relation": "member",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:a#role:moderator",
    "relation": "member"
  }
}

{
  "namespace": "default",
  "object": "tenant:a#role:moderator",
  "relation": "member",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:a#role:admin",
    "relation": "member"
  }
}

// 3. Resource permissions (Tenant A)
{
  "namespace": "default",
  "object": "tenant:a#product:items",
  "relation": "view",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:a#role:customer",
    "relation": "member"
  }
}

{
  "namespace": "default",
  "object": "tenant:a#product:items",
  "relation": "create",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:a#role:moderator",
    "relation": "member"
  }
}

// Same pattern for Tenant B (but Tenant B has NO moderator role)
{
  "namespace": "default",
  "object": "tenant:b#role:admin",
  "relation": "member",
  "subject_id": "user:charlie"
}

{
  "namespace": "default",
  "object": "tenant:b#role:customer",
  "relation": "member",
  "subject_set": {
    "namespace": "default",
    "object": "tenant:b#role:admin",
    "relation": "member"
  }
}
```

#### Phase 3: Authorization Integration

**Oathkeeper Access Rule Pattern:**
```yaml
- id: "product-create-multi-tenant"
  match:
    url: "http://localhost:9000/products/create"
    methods: ["POST"]
  authenticators:
    - handler: cookie_session
  authorizers:
    - handler: keto_engine_acp_ory
      config:
        required_action: create
        required_resource: "tenant:{{ print .MatchContext.Header.Get \"x-tenant-id\" }}#product:items"
        subject: "{{ print .Subject }}"
  mutators:
    - handler: header
      config:
        headers:
          X-User-Id: "{{ print .Subject }}"
          X-Tenant-Id: "{{ print .MatchContext.Header.Get \"x-tenant-id\" }}"
```

**Multi-Tenancy Demo API Updates:**
```javascript
// middleware/context.js
const contextMiddleware = (req, res, next) => {
  const tenantId = req.headers['x-tenant-id'];
  const userId = req.headers['x-user-id'];

  if (!tenantId) {
    return res.status(400).json({ error: 'x-tenant-id header required' });
  }

  req.context = {
    tenantId,
    userId,
    // Helper to generate tenant-scoped resource names
    scopedResource: (resource) => `tenant:${tenantId}#${resource}`
  };

  next();
};

// Authorization helper
async function checkPermission(userId, tenantId, resource, action) {
  const scopedResource = `tenant:${tenantId}#${resource}`;

  const response = await axios.get('http://keto:4466/relation-tuples/check', {
    params: {
      namespace: 'default',
      object: scopedResource,
      relation: action,
      subject_id: userId
    }
  });

  return response.data.allowed;
}

// Usage in route
router.post('/create', async (req, res) => {
  const { tenantId, userId } = req.context;

  // Check if user can create products in their tenant
  const allowed = await checkPermission(
    userId,
    tenantId,
    'product:items',
    'create'
  );

  if (!allowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Proceed with product creation...
});
```

#### Phase 4: Testing & Validation

**Postman Collection Structure:**
```
Multi-Tenant RBAC Tests/
   Setup Relations/
      Tenant A Setup/
         Create role hierarchy (admin’moderator’customer)
         Assign Alice to admin
         Assign Bob to moderator
         Set resource permissions
      Tenant B Setup/
          Create role hierarchy (admin’customer, no moderator)
          Assign Charlie to admin
          Set resource permissions
   Tenant Isolation Tests/
      Alice cannot access Tenant B resources
      Charlie cannot access Tenant A resources
      Bob (Tenant A moderator) has no access to Tenant B
   Authorization Tests/
       Tenant A Tests (Alice, Bob)
       Tenant B Tests (Charlie)
```

**Test Scenarios:**
```bash
#  Alice can create products in Tenant A
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=default" \
  --data-urlencode "object=tenant:a#product:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:alice"
# Expected: {"allowed": true}

# L Alice CANNOT create products in Tenant B
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=default" \
  --data-urlencode "object=tenant:b#product:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:alice"
# Expected: {"allowed": false}

#  Charlie (Tenant B admin) can create products in Tenant B
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=default" \
  --data-urlencode "object=tenant:b#product:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:charlie"
# Expected: {"allowed": true}

# L Bob (Tenant A moderator) cannot access Tenant B
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=default" \
  --data-urlencode "object=tenant:b#product:items" \
  --data-urlencode "relation=view" \
  --data-urlencode "subject_id=user:bob"
# Expected: {"allowed": false}
```

#### Phase 5: Documentation & Migration

1. **Update CLAUDE.md** with multi-tenant patterns
2. **Create migration scripts** for existing tuples
3. **Document tenant onboarding** process
4. **Provide debugging tools** (list tenant-specific relations)

---

## Success Metrics

### Functional Metrics
-  **100% Tenant Isolation**: No cross-tenant permission leakage
-  **Single-Query Authorization**: All checks remain O(1)
-  **Role Flexibility**: Different tenants can have different role structures

### Performance Metrics
-  **Latency**: Authorization checks < 50ms (same as single-tenant)
-  **Scalability**: Support 1000+ tenants without degradation
-  **Tuple Count**: Linear growth (O(tenants × roles × resources))

### Operational Metrics
-  **Zero Keto Restarts**: Add tenants without service disruption
-  **Auditability**: Full relationship visibility per tenant
-  **Developer Experience**: Clear API patterns, good error messages

---

## Risk Mitigation Plan

| Risk | Mitigation |
|------|-----------|
| **Naming Convention Violations** | Validation layer in API, automated tests |
| **Cross-Tenant Data Leakage** | Comprehensive test suite with negative cases |
| **Tuple Explosion** | Regular cleanup of unused relations, monitoring |
| **Migration Complexity** | Phased rollout, backward compatibility layer |
| **Debugging Difficulty** | Enhanced logging, relation visualization tools |

---

## Alternative Perspectives

### Contrarian View: "Why Not Just Use Multiple Databases?"

**Argument:** Each tenant gets own Keto instance + database

**Counter:**
- L Operational nightmare (100s of Keto instances)
- L Resource waste (each instance overhead)
- L No cross-tenant analytics capability
- L Complex deployment/upgrade process

**When It Makes Sense:** Regulatory requirements mandate physical isolation

### Future Considerations

1. **Dynamic Tenant Provisioning**: Automate tuple creation for new tenants
2. **Tenant Groups**: Super-tenants with shared resources
3. **Resource-Level Tenancy**: Some resources shared across tenants
4. **Audit Logging**: Track all authorization decisions per tenant
5. **Performance Optimization**: Tenant-specific caching strategies

---

## Areas for Further Research

1. **Keto Performance at Scale**: Benchmark with 10K+ tenants, 1M+ tuples
2. **Relationship Expansion Limits**: Test deep role hierarchies (10+ levels)
3. **Zanzibar Consistency Models**: Explore eventually-consistent multi-region setups
4. **Custom Relations**: Tenant-specific relation types beyond member/view/create

---

## Meta-Analysis

### Confidence Levels
- **Tenant Isolation via Object Encoding**: **95%** confidence (proven pattern)
- **Performance at Scale**: **85%** confidence (needs benchmarking)
- **Operational Simplicity**: **90%** confidence (well-understood deployment)

### Limitations Acknowledged
- Haven't tested with >1000 tenants in practice
- Unknown Keto tuple storage limits for single namespace
- Cross-region consistency not addressed

### Additional Expertise Needed
- Keto internals engineer (storage optimization)
- Security auditor (penetration testing tenant boundaries)
- SRE (production monitoring patterns)

---

## Immediate Next Steps

1. **Create Proof-of-Concept Postman Collection** (2-3 hours)
   - Setup Tenant A and B with proposed tuple structure
   - Run isolation tests
   - Validate single-query performance

2. **Update Multi-Tenancy Demo API** (4-6 hours)
   - Add tenant-scoped authorization helper
   - Update all endpoints with tenant context
   - Integrate with Oathkeeper rules

3. **Documentation** (2 hours)
   - Update README with multi-tenant architecture
   - Create developer guide for adding new tenants
   - Document authorization patterns

**Total Effort:** 1-2 days for full implementation + testing

---

This analysis provides a production-ready approach to multi-tenancy in Ory Keto while preserving the elegance of the Zanzibar model. The object-level tenant encoding pattern is battle-tested, scalable, and maintains Keto's single-query authorization efficiency.
