# Ory Oathkeeper - API Gateway Configuration

Ory Oathkeeper acts as an identity and access proxy (API gateway) that sits between your clients and backend services. It authenticates requests via Kratos and authorizes them via Keto before proxying to the backend.

## Architecture

```
Client → Oathkeeper → Kratos (Auth) → Keto (Authz) → Backend Service
```

## Configuration Files

### `config/oathkeeper.yml`

Main Oathkeeper configuration defining:
- **Authenticators**: How to verify identity (cookie_session, bearer_token, anonymous)
- **Authorizers**: How to check permissions (allow, deny, keto_engine_acp_ory, remote_json)
- **Mutators**: How to transform requests (noop, header, hydrator)
- **Error Handlers**: How to handle auth failures (redirect to login, JSON errors)

### `config/access-rules.yml`

Routing rules that define:
- URL patterns to match
- Which authenticator to use
- Which authorizer to use
- Which mutator to use
- Where to proxy the request

## Access Rules Explained

### Rule Structure

Each rule in `access-rules.yml` follows this structure:

```yaml
- id: "unique-rule-id"
  upstream:
    url: "http://backend-service:port"
    preserve_path: true
  match:
    url: "http://localhost:4455/path/<pattern>"
    methods: [GET, POST, PUT, DELETE]
  authenticators:
    - handler: cookie_session  # or bearer_token
  authorizer:
    handler: remote_json
    config:
      remote: "http://keto:4466/relation-tuples/check"
      payload: |
        { ... authorization payload ... }
  mutators:
    - handler: header
      config:
        headers:
          X-User-Id: "{{ .Subject }}"
```

## Dynamic Relation Mapping

### Understanding Regex Capture Groups

Access rules use regex patterns to extract parts of the URL:

```yaml
match:
  url: "http://localhost:4455/products/<[^/]+><.*>"
```

**Pattern Breakdown:**
- `<[^/]+>` - **Capture Group 0**: Matches one or more non-slash characters (the action)
- `<.*>` - Matches the rest of the path (optional parameters)

**Examples:**
- `/products/list` → Capture group 0 = `"list"`
- `/products/create` → Capture group 0 = `"create"`
- `/products/update/123` → Capture group 0 = `"update"`
- `/products/delete/abc` → Capture group 0 = `"delete"`

### Template Expression for Action Mapping

```go
"relation": "{{ if eq (index .MatchContext.RegexpCaptureGroups 0) \"list\" }}view{{ else }}{{ index .MatchContext.RegexpCaptureGroups 0 }}{{ end }}"
```

**What This Does:**

1. **Access Capture Group**: `(index .MatchContext.RegexpCaptureGroups 0)` gets the first captured value
2. **Check Condition**: `if eq ... "list"` checks if the action is "list"
3. **Map to Permission**:
   - If action is `"list"` → use `"view"` permission
   - Otherwise → use the action name as-is

**Action to Permission Mapping:**

| HTTP Endpoint | Captured Action | Keto Permission |
|--------------|----------------|-----------------|
| `/products/list` | `list` | `view` ← mapped |
| `/products/create` | `create` | `create` |
| `/products/update/123` | `update` | `update` |
| `/products/delete/456` | `delete` | `delete` |

**Why Map "list" to "view"?**
- **API Convention**: REST endpoints often use "list" for listing resources
- **Authorization Model**: Permission systems use "view" or "read" for viewing
- **Semantic Clarity**: "list" is semantically a "view" operation

## Complete Flow Example

### Example 1: List Products

**1. Client Request:**
```bash
GET http://localhost:4455/products/list
Authorization: Bearer <kratos-session-token>
```

**2. Oathkeeper Processing:**

```yaml
# Match Rule
match:
  url: "http://localhost:4455/products/<[^/]+><.*>"
  # Captures: Group 0 = "list"

# Authenticate
authenticators:
  - handler: bearer_token
    config:
      check_session_url: http://kratos:4433/sessions/whoami
# Result: Subject = "identity-uuid-123"

# Authorize
authorizer:
  handler: remote_json
  config:
    payload: |
      {
        "namespace": "default",
        "object": "product:items",
        "relation": "{{ if eq \"list\" \"list\" }}view{{ else }}list{{ end }}",
        # Evaluates to: "relation": "view"
        "subject_id": "user:alice@example.com"
      }
# Keto query: Can user:alice@example.com perform "view" on product:items?
# Keto response: {"allowed": true}

# Mutate
mutators:
  - handler: header
    config:
      headers:
        X-User-Id: "identity-uuid-123"
        X-User-Email: "alice@example.com"

# Proxy
upstream:
  url: "http://multi-tenancy-demo:9000"
  preserve_path: true
# Final request: GET http://multi-tenancy-demo:9000/products/list
# With headers: X-User-Id, X-User-Email
```

**3. Backend Receives:**
```
GET /products/list
Headers:
  X-User-Id: identity-uuid-123
  X-User-Email: alice@example.com
```

### Example 2: Create Product

**1. Client Request:**
```bash
POST http://localhost:4455/products/create
Authorization: Bearer <kratos-session-token>
Content-Type: application/json

{"name": "New Product", "price": 99.99}
```

**2. Oathkeeper Processing:**

```yaml
# Captures: Group 0 = "create"

# Template evaluates:
"relation": "{{ if eq \"create\" \"list\" }}view{{ else }}create{{ end }}"
# Result: "relation": "create"

# Keto query payload:
{
  "namespace": "default",
  "object": "product:items",
  "relation": "create",  ← Used as-is, no mapping
  "subject_id": "user:alice@example.com"
}
```

## Available Template Variables

In the `payload` section, you have access to:

### From Authentication
- `{{ .Subject }}` - Identity ID from Kratos
- `{{ .Extra.identity.traits.email }}` - User's email
- `{{ .Extra.identity.traits.name.first }}` - User's first name
- `{{ .Extra.identity.traits }}` - Full traits object

### From URL Matching
- `{{ index .MatchContext.RegexpCaptureGroups 0 }}` - First capture group
- `{{ index .MatchContext.RegexpCaptureGroups 1 }}` - Second capture group
- `{{ .MatchContext.URL }}` - Full matched URL

### Template Functions
- `{{ eq a b }}` - Equality check
- `{{ print .Subject }}` - Convert to string
- `{{ .Extra | toJson }}` - Convert to JSON

## Common Patterns

### Pattern 1: Direct Action Mapping

Simple 1:1 mapping of actions to permissions:

```yaml
"relation": "{{ index .MatchContext.RegexpCaptureGroups 0 }}"
```

### Pattern 2: Action with Fallback

Map specific actions, use default for others:

```yaml
"relation": "{{ if eq (index .MatchContext.RegexpCaptureGroups 0) \"list\" }}view{{ else if eq (index .MatchContext.RegexpCaptureGroups 0) \"get\" }}view{{ else }}{{ index .MatchContext.RegexpCaptureGroups 0 }}{{ end }}"
```

### Pattern 3: Tenant-Aware Authorization

Extract tenant from URL and include in authorization:

```yaml
match:
  url: "http://localhost:4455/users/<[^/]+>/<.*>"
  # Captures: Group 0 = tenant-id, Group 1 = action

authorizer:
  config:
    payload: |
      {
        "namespace": "default",
        "object": "tenant:{{ index .MatchContext.RegexpCaptureGroups 0 }}:users",
        "relation": "{{ index .MatchContext.RegexpCaptureGroups 1 }}",
        "subject_id": "{{ print .Subject }}"
      }
```

### Pattern 4: Subject from Email

Use email as subject instead of ID:

```yaml
"subject_id": "user:{{ print .Extra.identity.traits.email }}"
```

## Testing Access Rules

### Test Authentication

```bash
# Get a Kratos session token first
curl -X POST http://localhost:4433/self-service/login/api \
  -H "Content-Type: application/json" \
  -d '{"method":"password","identifier":"alice@example.com","password":"secret"}'

# Use the session token
export TOKEN="<session-token>"

# Test protected endpoint
curl http://localhost:4455/products/list \
  -H "Authorization: Bearer $TOKEN"
```

### Test Authorization

```bash
# First, set up Keto permissions
curl -X PUT http://localhost:4467/admin/relation-tuples \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "default",
    "object": "product:items",
    "relation": "view",
    "subject_id": "user:alice@example.com"
  }'

# Then test the endpoint
curl http://localhost:4455/products/list \
  -H "Authorization: Bearer $TOKEN"
```

### Debug with Oathkeeper Logs

```bash
make logs-oathkeeper

# Or directly
cd oathkeeper && docker-compose logs -f
```

## Configuration Reload

After modifying `oathkeeper.yml` or `access-rules.yml`:

```bash
make reload-oathkeeper

# Or directly
cd oathkeeper && docker-compose up -d --force-recreate oathkeeper
```

## Error Handling

### Redirect to Login (HTML Requests)

```yaml
errors:
  handlers:
    redirect:
      enabled: true
      config:
        to: http://127.0.0.1:4455/login
        when:
          - error: [unauthorized, forbidden]
            request:
              header:
                accept: [text/html]
```

### JSON Errors (API Requests)

```yaml
errors:
  handlers:
    json:
      enabled: true
      config:
        verbose: true
```

**Error Response:**
```json
{
  "error": {
    "code": 403,
    "status": "Forbidden",
    "message": "Access denied"
  }
}
```

## Security Best Practices

1. **Always Authenticate**: Use `cookie_session` or `bearer_token`, avoid `anonymous` for protected resources
2. **Validate Authorization**: Use Keto checks (`remote_json`) for all sensitive operations
3. **Least Privilege**: Grant minimum required permissions
4. **Audit Logs**: Monitor Oathkeeper logs for unauthorized access attempts
5. **HTTPS in Production**: Always use HTTPS for the proxy endpoint
6. **Validate Tokens**: Ensure `check_session_url` points to Kratos for validation

## Troubleshooting

### Issue: 401 Unauthorized

**Cause:** Authentication failed
**Check:**
- Is Kratos session valid?
- Is the Authorization header correct?
- Check Kratos logs: `make logs-kratos`

### Issue: 403 Forbidden

**Cause:** Authorization failed
**Check:**
- Does the Keto relation exist?
- Check Keto logs: `make logs-keto`
- Test permission directly: `curl http://localhost:4466/relation-tuples/check?...`

### Issue: 502 Bad Gateway

**Cause:** Backend service unavailable
**Check:**
- Is the upstream service running?
- Check demo status: `make status`
- Verify network: `docker network inspect ory-network`

### Issue: Template Error

**Cause:** Invalid Go template syntax
**Check:**
- Oathkeeper logs for template parsing errors
- Verify capture group indices match regex pattern
- Test regex at https://regex101.com/

## Advanced: Custom Authorizer

For complex authorization logic, you can create custom authorizers:

```yaml
authorizers:
  remote_json:
    enabled: true
    config:
      remote: "http://your-auth-service:8080/authorize"
      payload: |
        {
          "user": "{{ .Subject }}",
          "resource": "{{ .MatchContext.URL }}",
          "action": "{{ .MatchContext.Method }}"
        }
      # Expects response: {"allowed": true/false}
```

## References

- [Oathkeeper Documentation](https://www.ory.sh/docs/oathkeeper)
- [Access Rules Guide](https://www.ory.sh/docs/oathkeeper/api-access-rules)
- [Pipeline Configuration](https://www.ory.sh/docs/oathkeeper/pipeline)
- [Go Template Syntax](https://golang.org/pkg/text/template/)
