# Tenant-Centric Multi-Tenancy RBAC Approach

## Hierarchy Model

```
user:alice → tenant:a (as admin) → tenant:a#product:items (create permission)
user:alice → tenant:b (as customer) → tenant:b#product:items (view permission)
user:bob → tenant:a (as moderator) → tenant:a#product:items (create permission)
user:charlie → tenant:b (as customer) → tenant:b#product:items (view permission)
```

This demonstrates **multi-tenant user membership**: Alice has admin privileges in Tenant A but only customer (view-only) privileges in Tenant B.

## Complete Tuple Setup

### Tenant A: Role Assignments

```json
// Alice is admin in Tenant A
{
  "namespace": "tenant-rbac",
  "object": "tenant:a",
  "relation": "admin",
  "subject_id": "user:alice"
}

// Bob is moderator in Tenant A
{
  "namespace": "tenant-rbac",
  "object": "tenant:a",
  "relation": "moderator",
  "subject_id": "user:bob"
}
```

### Tenant A: Role Hierarchy

```json
// Admin inherits moderator permissions
{
  "namespace": "tenant-rbac",
  "object": "tenant:a",
  "relation": "moderator",
  "subject_set": {
    "namespace": "tenant-rbac",
    "object": "tenant:a",
    "relation": "admin"
  }
}

// Moderator inherits customer permissions
{
  "namespace": "tenant-rbac",
  "object": "tenant:a",
  "relation": "customer",
  "subject_set": {
    "namespace": "tenant-rbac",
    "object": "tenant:a",
    "relation": "moderator"
  }
}
```

### Tenant A: Product Permissions

```json
// Customers can view products
{
  "namespace": "tenant-rbac",
  "object": "tenant:a#product:items",
  "relation": "view",
  "subject_set": {
    "namespace": "tenant-rbac",
    "object": "tenant:a",
    "relation": "customer"
  }
}

// Moderators can create products
{
  "namespace": "tenant-rbac",
  "object": "tenant:a#product:items",
  "relation": "create",
  "subject_set": {
    "namespace": "tenant-rbac",
    "object": "tenant:a",
    "relation": "moderator"
  }
}

// Admins can delete products
{
  "namespace": "tenant-rbac",
  "object": "tenant:a#product:items",
  "relation": "delete",
  "subject_set": {
    "namespace": "tenant-rbac",
    "object": "tenant:a",
    "relation": "admin"
  }
}
```

### Tenant A: Category Permissions

```json
// Customers can view categories
{
  "namespace": "tenant-rbac",
  "object": "tenant:a#category:items",
  "relation": "view",
  "subject_set": {
    "namespace": "tenant-rbac",
    "object": "tenant:a",
    "relation": "customer"
  }
}

// Moderators can update categories
{
  "namespace": "tenant-rbac",
  "object": "tenant:a#category:items",
  "relation": "update",
  "subject_set": {
    "namespace": "tenant-rbac",
    "object": "tenant:a",
    "relation": "moderator"
  }
}

// Admins can create categories
{
  "namespace": "tenant-rbac",
  "object": "tenant:a#category:items",
  "relation": "create",
  "subject_set": {
    "namespace": "tenant-rbac",
    "object": "tenant:a",
    "relation": "admin"
  }
}
```

### Tenant B: Role Assignments

```json
// Alice is customer in Tenant B (different role than in Tenant A!)
{
  "namespace": "tenant-rbac",
  "object": "tenant:b",
  "relation": "customer",
  "subject_id": "user:alice"
}

// Charlie is customer in Tenant B
{
  "namespace": "tenant-rbac",
  "object": "tenant:b",
  "relation": "customer",
  "subject_id": "user:charlie"
}
```

### Tenant B: Role Hierarchy

```json
// Tenant B has simplified hierarchy: only admin and customer (no moderator)
// Admin inherits customer permissions
{
  "namespace": "tenant-rbac",
  "object": "tenant:b",
  "relation": "customer",
  "subject_set": {
    "namespace": "tenant-rbac",
    "object": "tenant:b",
    "relation": "admin"
  }
}
```

### Tenant B: Product Permissions

```json
// Customers can view products
{
  "namespace": "tenant-rbac",
  "object": "tenant:b#product:items",
  "relation": "view",
  "subject_set": {
    "namespace": "tenant-rbac",
    "object": "tenant:b",
    "relation": "customer"
  }
}

// Admins can create products (Tenant B has no moderator role)
{
  "namespace": "tenant-rbac",
  "object": "tenant:b#product:items",
  "relation": "create",
  "subject_set": {
    "namespace": "tenant-rbac",
    "object": "tenant:b",
    "relation": "admin"
  }
}

// Admins can delete products
{
  "namespace": "tenant-rbac",
  "object": "tenant:b#product:items",
  "relation": "delete",
  "subject_set": {
    "namespace": "tenant-rbac",
    "object": "tenant:b",
    "relation": "admin"
  }
}
```

### Tenant B: Category Permissions

```json
// Customers can view categories
{
  "namespace": "tenant-rbac",
  "object": "tenant:b#category:items",
  "relation": "view",
  "subject_set": {
    "namespace": "tenant-rbac",
    "object": "tenant:b",
    "relation": "customer"
  }
}

// Admins can update categories
{
  "namespace": "tenant-rbac",
  "object": "tenant:b#category:items",
  "relation": "update",
  "subject_set": {
    "namespace": "tenant-rbac",
    "object": "tenant:b",
    "relation": "admin"
  }
}

// Admins can create categories
{
  "namespace": "tenant-rbac",
  "object": "tenant:b#category:items",
  "relation": "create",
  "subject_set": {
    "namespace": "tenant-rbac",
    "object": "tenant:b",
    "relation": "admin"
  }
}
```

## Authorization Test Scenarios

### Alice: Multi-Tenant User Tests

```bash
# ✅ Alice (admin in Tenant A) can view products in Tenant A
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=tenant-rbac" \
  --data-urlencode "object=tenant:a#product:items" \
  --data-urlencode "relation=view" \
  --data-urlencode "subject_id=user:alice"
# Expected: {"allowed": true} (via admin → moderator → customer → view)

# ✅ Alice (admin in Tenant A) can create products in Tenant A
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=tenant-rbac" \
  --data-urlencode "object=tenant:a#product:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:alice"
# Expected: {"allowed": true} (via admin → moderator → create)

# ✅ Alice (admin in Tenant A) can delete products in Tenant A
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=tenant-rbac" \
  --data-urlencode "object=tenant:a#product:items" \
  --data-urlencode "relation=delete" \
  --data-urlencode "subject_id=user:alice"
# Expected: {"allowed": true} (via admin → delete)

# ✅ Alice (customer in Tenant B) can view products in Tenant B
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=tenant-rbac" \
  --data-urlencode "object=tenant:b#product:items" \
  --data-urlencode "relation=view" \
  --data-urlencode "subject_id=user:alice"
# Expected: {"allowed": true} (via customer → view)

# ❌ Alice (customer in Tenant B) CANNOT create products in Tenant B
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=tenant-rbac" \
  --data-urlencode "object=tenant:b#product:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:alice"
# Expected: {"allowed": false} (customer role has no create permission)

# ❌ Alice (customer in Tenant B) CANNOT delete products in Tenant B
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=tenant-rbac" \
  --data-urlencode "object=tenant:b#product:items" \
  --data-urlencode "relation=delete" \
  --data-urlencode "subject_id=user:alice"
# Expected: {"allowed": false}
```

### Bob: Single-Tenant User (Tenant A Moderator)

```bash
# ✅ Bob (moderator) can view products in Tenant A
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=tenant-rbac" \
  --data-urlencode "object=tenant:a#product:items" \
  --data-urlencode "relation=view" \
  --data-urlencode "subject_id=user:bob"
# Expected: {"allowed": true}

# ✅ Bob (moderator) can create products in Tenant A
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=tenant-rbac" \
  --data-urlencode "object=tenant:a#product:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:bob"
# Expected: {"allowed": true} (via moderator → create)

# ❌ Bob (moderator) CANNOT delete products in Tenant A
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=tenant-rbac" \
  --data-urlencode "object=tenant:a#product:items" \
  --data-urlencode "relation=delete" \
  --data-urlencode "subject_id=user:bob"
# Expected: {"allowed": false}

# ❌ Bob (no role in Tenant B) CANNOT access Tenant B
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=tenant-rbac" \
  --data-urlencode "object=tenant:b#product:items" \
  --data-urlencode "relation=view" \
  --data-urlencode "subject_id=user:bob"
# Expected: {"allowed": false}
```

### Charlie: Single-Tenant User (Tenant B Customer)

```bash
# ✅ Charlie (customer) can view products in Tenant B
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=tenant-rbac" \
  --data-urlencode "object=tenant:b#product:items" \
  --data-urlencode "relation=view" \
  --data-urlencode "subject_id=user:charlie"
# Expected: {"allowed": true}

# ❌ Charlie (customer) CANNOT create products in Tenant B
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=tenant-rbac" \
  --data-urlencode "object=tenant:b#product:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:charlie"
# Expected: {"allowed": false}

# ❌ Charlie (no role in Tenant A) CANNOT access Tenant A
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=tenant-rbac" \
  --data-urlencode "object=tenant:a#product:items" \
  --data-urlencode "relation=view" \
  --data-urlencode "subject_id=user:charlie"
# Expected: {"allowed": false}
```

## Permission Matrix

### Tenant A

| User | Role | Product View | Product Create | Product Delete | Category View | Category Update | Category Create |
|------|------|--------------|----------------|----------------|---------------|-----------------|-----------------|
| **Alice** | Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Bob** | Moderator | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |

### Tenant B

| User | Role | Product View | Product Create | Product Delete | Category View | Category Update | Category Create |
|------|------|--------------|----------------|----------------|---------------|-----------------|-----------------|
| **Alice** | Customer | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Charlie** | Customer | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |

**Key Insight:** Alice has **different privilege levels** in different tenants:
- **Tenant A**: Full admin access (create, delete, update all resources)
- **Tenant B**: Read-only customer access (view only)

## Debug Queries

### Check User's Role in Specific Tenant

```bash
# Is Alice an admin in Tenant A?
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=tenant-rbac" \
  --data-urlencode "object=tenant:a" \
  --data-urlencode "relation=admin" \
  --data-urlencode "subject_id=user:alice"
# Expected: {"allowed": true}

# Is Alice an admin in Tenant B?
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=tenant-rbac" \
  --data-urlencode "object=tenant:b" \
  --data-urlencode "relation=admin" \
  --data-urlencode "subject_id=user:alice"
# Expected: {"allowed": false}

# Is Alice a customer in Tenant B?
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=tenant-rbac" \
  --data-urlencode "object=tenant:b" \
  --data-urlencode "relation=customer" \
  --data-urlencode "subject_id=user:alice"
# Expected: {"allowed": true}

# Is Bob a moderator in Tenant A?
curl -G "http://localhost:4466/relation-tuples/check" \
  --data-urlencode "namespace=tenant-rbac" \
  --data-urlencode "object=tenant:a" \
  --data-urlencode "relation=moderator" \
  --data-urlencode "subject_id=user:bob"
# Expected: {"allowed": true}
```

### Expand Role Hierarchy

```bash
# Expand admin role in Tenant A to see inherited permissions
curl -G "http://localhost:4466/relation-tuples/expand" \
  --data-urlencode "namespace=tenant-rbac" \
  --data-urlencode "object=tenant:a" \
  --data-urlencode "relation=admin" \
  --data-urlencode "max-depth=5"
```

### List All Relations for a Tenant

```bash
# List all tuples for Tenant A
curl -G "http://localhost:4466/relation-tuples" \
  --data-urlencode "namespace=tenant-rbac" | jq '.relation_tuples[] | select(.object | startswith("tenant:a"))'

# List all tuples for Tenant B
curl -G "http://localhost:4466/relation-tuples" \
  --data-urlencode "namespace=tenant-rbac" | jq '.relation_tuples[] | select(.object | startswith("tenant:b"))'
```

### List All User's Tenant Memberships

```bash
# List all relations where Alice is the subject
curl -G "http://localhost:4466/relation-tuples" \
  --data-urlencode "namespace=tenant-rbac" \
  --data-urlencode "subject_id=user:alice"
# Shows both: tenant:a#admin and tenant:b#customer
```

## Application Integration

### JavaScript/Node.js Helper

```javascript
class KetoTenantAuth {
  constructor(ketoReadUrl = 'http://localhost:4466') {
    this.ketoReadUrl = ketoReadUrl;
  }

  async checkPermission(userId, tenantId, resource, action) {
    const scopedResource = `tenant:${tenantId}#${resource}`;

    const response = await fetch(
      `${this.ketoReadUrl}/relation-tuples/check?` +
      new URLSearchParams({
        namespace: 'tenant-rbac',
        object: scopedResource,
        relation: action,
        subject_id: userId
      })
    );

    const result = await response.json();
    return result.allowed;
  }

  async getUserRole(userId, tenantId) {
    // Check each role in hierarchy
    const roles = ['admin', 'moderator', 'customer'];

    for (const role of roles) {
      const response = await fetch(
        `${this.ketoReadUrl}/relation-tuples/check?` +
        new URLSearchParams({
          namespace: 'tenant-rbac',
          object: `tenant:${tenantId}`,
          relation: role,
          subject_id: userId
        })
      );

      const result = await response.json();
      if (result.allowed) {
        return role;
      }
    }

    return null; // No role in this tenant
  }

  async getUserTenants(userId) {
    // List all tenant memberships for a user
    const response = await fetch(
      `${this.ketoReadUrl}/relation-tuples?` +
      new URLSearchParams({
        namespace: 'tenant-rbac',
        subject_id: userId
      })
    );

    const data = await response.json();
    const tenantRoles = {};

    data.relation_tuples?.forEach(tuple => {
      if (tuple.object.startsWith('tenant:')) {
        const tenantId = tuple.object.split(':')[1];
        tenantRoles[tenantId] = tuple.relation;
      }
    });

    return tenantRoles;
  }
}

// Usage Examples
const keto = new KetoTenantAuth();

// Check if Alice can create products in Tenant A
const canCreateA = await keto.checkPermission('user:alice', 'a', 'product:items', 'create');
console.log('Alice can create products in Tenant A:', canCreateA); // true

// Check if Alice can create products in Tenant B
const canCreateB = await keto.checkPermission('user:alice', 'b', 'product:items', 'create');
console.log('Alice can create products in Tenant B:', canCreateB); // false

// Get Alice's role in Tenant A
const roleA = await keto.getUserRole('user:alice', 'a');
console.log('Alice role in Tenant A:', roleA); // 'admin'

// Get Alice's role in Tenant B
const roleB = await keto.getUserRole('user:alice', 'b');
console.log('Alice role in Tenant B:', roleB); // 'customer'

// Get all of Alice's tenant memberships
const tenants = await keto.getUserTenants('user:alice');
console.log('Alice tenants:', tenants);
// Output: { 'a': 'admin', 'b': 'customer' }
```

### Express.js Middleware

```javascript
// middleware/tenantAuth.js
const KetoTenantAuth = require('./ketoAuth');
const keto = new KetoTenantAuth();

async function requireTenantPermission(resource, action) {
  return async (req, res, next) => {
    const tenantId = req.headers['x-tenant-id'];
    const userId = req.headers['x-user-id'];

    if (!tenantId || !userId) {
      return res.status(400).json({
        error: 'Missing x-tenant-id or x-user-id header'
      });
    }

    const allowed = await keto.checkPermission(
      userId,
      tenantId,
      resource,
      action
    );

    if (!allowed) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `User ${userId} cannot ${action} ${resource} in tenant ${tenantId}`
      });
    }

    // Attach user role to request for further processing
    req.userRole = await keto.getUserRole(userId, tenantId);
    next();
  };
}

// Usage in routes
router.post('/products/create',
  requireTenantPermission('product:items', 'create'),
  async (req, res) => {
    // Alice with tenant:a can proceed
    // Alice with tenant:b will get 403
    // Create product...
  }
);

router.get('/products/list',
  requireTenantPermission('product:items', 'view'),
  async (req, res) => {
    // Both Alice (any tenant) and Bob can proceed
    // List products...
  }
);
```

## Advantages of This Approach

1. **Natural Hierarchy**: `user → tenant → role → resource` matches intuitive mental model
2. **Multi-Tenant Users**: Same user can have different roles in different tenants (like Alice)
3. **Tenant Isolation**: Complete separation - Alice's admin role in Tenant A doesn't grant any access to Tenant B
4. **Flexible Role Structure**: Each tenant can define different role hierarchies (Tenant B has no moderator)
5. **Single Query Authorization**: Keto resolves the full relationship chain in one check
6. **Clear Debugging**: Easy to inspect user's role in each tenant
7. **Scalable**: Add new tenants or users without modifying existing tuples

## Key Insights

### Multi-Tenant User Pattern

Alice demonstrates the power of this approach:
- **Tenant A**: Alice is `admin` → full control over all resources
- **Tenant B**: Alice is `customer` → read-only access

This is common in B2B SaaS scenarios:
- Alice might be admin of her own company (Tenant A)
- Alice might be a customer/guest in a partner company (Tenant B)

### Role Flexibility Per Tenant

- **Tenant A**: Has 3-tier hierarchy (admin → moderator → customer)
- **Tenant B**: Has 2-tier hierarchy (admin → customer, no moderator)

Each tenant can define its own role structure based on business needs.

## Comparison with Object Encoding Approach

| Feature | Tenant-Centric (this) | Object Encoding |
|---------|----------------------|-----------------|
| User → Tenant link | `tenant:a#admin` | `tenant:a#role:admin#member` |
| Hierarchy clarity | Very clear: user→tenant→role | Less clear: encoded in object name |
| Multi-tenant users | Natural (multiple role tuples) | Natural (multiple role tuples) |
| Tenant object | First-class authorization object | Encoded in object name |
| Role flexibility | Very high (roles as relations) | Medium (roles as objects) |
| Query user's role | Check relations on tenant object | Check membership in role objects |
| Mental model | Very intuitive | Less intuitive |
| Implementation | Slightly more complex | Simpler |

Both approaches achieve the same goal. Choose based on your team's preference:
- **Tenant-Centric**: Better if tenant is the central concept in your domain
- **Object Encoding**: Better if you prefer simpler, flatter relationship graphs
