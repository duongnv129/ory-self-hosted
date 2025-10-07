# Copilot Instructions for Ory Stack Self-Hosted

This project demonstrates identity management, authentication, and authorization using the Ory Stack (Kratos, Keto, Oathkeeper) with multi-tenancy support.

## Architecture Overview

**Services Stack**: All services communicate through Docker network `ory-network`

- **Kratos** (4433/4434): Identity management with PostgreSQL backend
- **Keto** (4466/4467): Zanzibar-style authorization with hierarchical RBAC
- **Oathkeeper** (4455/4456): API gateway with authentication/authorization pipeline
- **PostgreSQL** (5432): Shared database for Kratos and Keto
- **Multi-Tenancy Demo** (9000): Express.js backend with tenant-aware APIs
- **Web Demo** (3000): Next.js 14 frontend demonstrating 3 RBAC models

**Request Flow**: `Web Demo → Oathkeeper → [Kratos + Keto] → Backend API`

## Development Commands

Use the root **Makefile** for all operations:

- `make dev` - Quick start all services and show URLs
- `make logs-[service]` - View service logs (kratos, keto, oathkeeper, postgres)
- `make reload-[service]` - Restart service after config changes
- `make shell-[service]` - Shell access to containers
- `make health` - Check all service endpoints

Never use `docker-compose` directly - the Makefile handles service dependencies and networking.

## Key Patterns

### 1. Tenant Context Management (Critical)

**Context-aware APIs**: All data access respects tenant boundaries through `x-tenant-id` header

```typescript
// web-demo/src/lib/api/client.ts pattern
setTenantContext(tenantId: string) {
  this.tenantId = tenantId;
}
```

**Layout-Level Context**: Tenant context is set/cleared by page layouts, not individual components

- Simple RBAC: Layout clears tenant → global scope requests
- Tenant/Resource RBAC: Tenant context set → tenant-scoped requests

### 2. SWR Data Fetching Convention

**Hook Pattern**: All data fetching uses SWR with consistent error handling

```typescript
// web-demo/src/lib/hooks/useRoles.ts pattern
export function useRoles() {
  const { data, error, isLoading, mutate } = useSWR(
    "/roles/list",
    () => rolesApi.list(),
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  );

  return {
    roles: data?.roles || [],
    tenantId: data?.tenantId, // Always include context info
    isLoading,
    isError: !!error,
    mutate, // For optimistic updates
  };
}
```

### 3. Permission Matrix Architecture

**Live Keto Integration**: Components fetch real permission data with mock fallbacks

```typescript
// Pattern: Always provide mock + live data integration
const {
  rolePermissions: ketoPermissions,
  isLoading,
  isError,
} = useKetoRolePermissions(
  roles.map((r) => r.name),
  { namespace: "simple-rbac", enabled: roles.length > 0 }
);

// Merge mock permissions with live Keto data
const mergedPermissions = mockPermissions.map((mockPerm) => {
  const livePerm = livePermissions.find(
    (kp) => kp.resource === mockPerm.resource && kp.action === mockPerm.action
  );
  return { ...mockPerm, granted: livePerm ? true : mockPerm.granted };
});
```

### 4. Component Architecture Conventions

**Separation of Concerns**:

- Main pages show overview/table views
- Detailed editing happens in dialogs
- Advanced features (Permission Matrix, Role Hierarchy) only in Create/Edit dialogs

**TypeScript Strict Mode**: All components have full type coverage

- Use `interface` for props, `type` for unions
- Always include `className?: string` for style overrides
- Prefer `unknown` over `any` for error types

## Critical Configuration Files

### Keto Namespace: `keto/config/keto.yml`

**Single namespace model**: `default` (id: 0) for simplified RBAC

- Was previously multi-namespace (permissions, tenant_roles, tenant_memberships)
- All relations use `namespace: "default"`

### Oathkeeper Rules: `oathkeeper/config/access-rules.yml`

**Dynamic Action Mapping**: URL patterns with regex capture groups

```yaml
# Pattern: /<resource>/<action> maps to Keto's <resource>:items with permission <action>
- id: "products-api"
  match:
    url: "<^(?:http|https)://[^/]+/products/(list|create|update|delete)(?:/.*)?$>"
  authenticators: [{ handler: "cookie_session" }]
  authorizer:
    handler: "keto_engine_acp_ory"
    config:
      subject: "{{ print .Subject }}"
      resource: "product:items"
      action: '{{ if eq .MatchContext.RegexpCaptureGroups.1 "list" }}view{{ else }}{{ .MatchContext.RegexpCaptureGroups.1 }}{{ end }}'
```

### Multi-Tenancy API: All endpoints follow `/{resource}/{action}` pattern

```bash
# Consistent endpoint structure
/users/list, /users/create, /users/update/{id}, /users/delete/{id}
/products/list, /products/create, /products/update/{id}, /products/delete/{id}
/categories/list, /categories/create, /categories/update/{id}, /categories/delete/{id}
```

## Testing & Debugging

### Keto Permission Testing

```bash
# Use Postman collection in keto-zanziban-simple-rbac/
# Or test with curl:
curl -G http://localhost:4466/relation-tuples/check \
  --data-urlencode "namespace=default" \
  --data-urlencode "object=product:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:alice"
```

### Service Health Checks

```bash
make health  # Checks all endpoints
make status  # Shows running containers
```

## Integration Points

### Kratos → Keto Flow

1. User authenticates via Kratos (session cookies)
2. Oathkeeper extracts identity from session
3. Permission check sent to Keto with `user:email` format
4. Keto returns allow/deny based on relation tuples

### Web Demo → Backend Flow

1. Next.js calls Oathkeeper (never direct API calls)
2. Oathkeeper handles auth/authz pipeline
3. Headers injected: `X-User-Id`, `X-Tenant-Id`, `X-User-Email`
4. Backend receives authenticated/authorized requests

## Error Handling Patterns

### API Errors

```typescript
// Always include status codes and user-friendly messages
catch (err: unknown) {
  const errorMessage = err instanceof Error ? err.message : 'Unknown error';
  if (errorMessage.includes('403')) {
    toast.error('Access denied: You do not have permission');
  } else if (errorMessage.includes('already exists')) {
    toast.error('Resource already exists');
  } else {
    toast.error(errorMessage);
  }
}
```

### Form Validation

```typescript
// Use explicit validation before API calls
if (!formData.name || formData.name.trim().length < 2) {
  toast.error("Role name must be at least 2 characters");
  return;
}
```

## Database Schema Notes

**Kratos Identity Schema**: `kratos/config/identity.schema.json`

- Required: `email` (verified), `name.first`, `name.last`
- Multi-tenancy: `tenant_ids` array field
- Authentication methods: password, TOTP, lookup_secret, recovery codes

**Keto Relations**: All use single `default` namespace

- User assignments: `user:email → role:name (member)`
- Role permissions: `role:name → resource:items (action)`
- Role hierarchy: `role:child → role:parent (member)` for inheritance

When making changes, always test the complete flow: Kratos auth → Oathkeeper → Keto authz → Backend API response.
