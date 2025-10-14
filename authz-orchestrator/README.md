# AuthZ Orchestrator

A high-performance authorization orchestrator that combines **structural permissions** (via Ory Keto) with **contextual policies** (via Open Policy Agent) to provide comprehensive, fine-grained access control.

## Features

- **Dual Authorization**: Combines Keto's Zanzibar-style relations with OPA's policy-based decisions
- **Policy Templates**: Non-technical interface for managing authorization policies
- **Risk-Based Authentication**: Dynamic AAL requirements based on context and risk
- **Working Hours Control**: Time-based access restrictions with override capabilities
- **Action Time Windows**: Specific time windows for sensitive operations
- **Clearance Enforcement**: Classification-based access control
- **Multi-Tenant**: Complete tenant isolation with per-tenant policy configurations

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client        │───▶│ AuthZ Orchestrator│───▶│ Backend Service │
│   Request       │    │   (Port 8080)    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            ┌─────────────────┐  ┌─────────────────┐
            │ Keto            │  │ OPA             │
            │ (Structural)    │  │ (Contextual)    │
            │ Port 4466/4467  │  │ Port 8181       │
            └─────────────────┘  └─────────────────┘
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Ory Keto running (for structural checks)
- Network: `ory-network`

### Start the Service

```bash
# Build and start both AuthZ Orchestrator and OPA
docker compose up -d

# Check health
curl http://localhost:8080/health

# View logs
docker compose logs -f authz-orchestrator
```

## API Endpoints

### Core Authorization

- `POST /decision` - Main authorization decision endpoint
- `POST /simulate` - Test authorization decisions

### Policy Management

- `GET /policy/templates` - List available policy templates
- `GET /policy/tenant/:tenant/config` - Get tenant configuration
- `PUT /policy/tenant/:tenant/draft` - Update draft configuration
- `POST /policy/tenant/:tenant/validate` - Validate configuration
- `POST /policy/tenant/:tenant/publish` - Publish draft to active

### Health & Debug

- `GET /health` - Service health with dependency status
- `GET /health/ready` - Kubernetes readiness probe
- `GET /health/live` - Kubernetes liveness probe

## Decision Flow

1. **Structural Check**: Verify user has required Keto relations
2. **Risk Assessment**: Evaluate request context for risk factors
3. **Policy Evaluation**: Run contextual policies through OPA
4. **Decision Merge**: Combine results into unified response

## Request Format

```json
{
  "subject": "user:alice@example.com",
  "action": "file.read",
  "resource": "file:confidential-doc",
  "tenant": "tenant-a",
  "context": {
    "classification": "confidential",
    "hour_utc": 14,
    "session_aal": 2,
    "user_clearance": 3,
    "ip": "192.168.1.100"
  }
}
```

## Response Format

```json
{
  "state": "ALLOW",
  "action": "file.read", 
  "resource": "file:confidential-doc",
  "subject": "user:alice@example.com",
  "tenant": "tenant-a",
  "structural": {
    "allowed": true,
    "required_relations": ["view"],
    "path": ["view", "user:alice@example.com"]
  },
  "policies": [
    {
      "template": "working_hours",
      "status": "pass",
      "reason_codes": []
    },
    {
      "template": "assurance", 
      "status": "pass",
      "reason_codes": ["assurance_sufficient"]
    }
  ],
  "risk": {
    "level": "LOW",
    "reasons": []
  },
  "required_aal": 2,
  "session_aal": 2,
  "reasons": ["assurance_sufficient"],
  "config_version": "v1",
  "timestamp": "2025-10-12T10:15:30Z"
}
```

## Decision States

- `ALLOW` - Request is authorized
- `DENY` - Request is denied (structural or policy failure)
- `STEP_UP_REQUIRED` - Higher authentication assurance needed

## Policy Templates

### Working Hours
Restrict actions outside defined time windows with user overrides.

### Action Time Windows
Specific time restrictions per action type with maintenance freeze support.

### Risk-Based Assurance
Dynamic AAL requirements based on risk level and resource classification.

### Clearance Control
Classification-based access using user clearance levels.

## Configuration

### Environment Variables

- `PORT` - HTTP server port (default: 8080)
- `KETO_READ_URL` - Keto read API URL
- `KETO_WRITE_URL` - Keto write API URL
- `OPA_URL` - OPA server URL
- `CONFIG_PATH` - Path to configuration files
- `AUTHZ_LOGGING_LEVEL` - Log level (info, debug, warn, error)

### Tenant Configuration

Tenant policies are stored in JSON files under `config/tenants/`:

```bash
config/tenants/
├── tenant-a.json
├── tenant-b.json
└── default.json
```

### OPA Policies

Rego policies are mounted under `policies/`:

```bash
policies/
├── authz.rego          # Main authorization logic
├── working_hours.rego  # Working hours policies
├── assurance.rego      # AAL and risk policies
└── clearance.rego      # Classification policies
```

## Integration with Ory Stack

### Oathkeeper Integration

Add routes to `oathkeeper/config/access-rules.yml`:

```yaml
- id: "authz-orchestrator"
  upstream:
    url: "http://authz-orchestrator:8080"
  match:
    url: "<http|https>://<.*>/api/authz-orchestrator/<.*>"
    methods: ["GET", "POST", "PUT", "DELETE"]
  authenticators:
    - handler: cookie_session
  authorizer:
    handler: allow
  mutators:
    - handler: header
      config:
        headers:
          X-User-Id: "{{ .Subject }}"
          X-Session-AAL: "{{ .Extra.session.aal }}"
          X-Tenant-Id: "{{ .MatchContext.Header.Get \"x-tenant-id\" }}"
```

### Keto Integration

The orchestrator uses existing Keto namespaces:
- `simple-rbac` - Basic role hierarchy
- `tenant-rbac` - Multi-tenant roles  
- `resource-rbac` - Fine-grained permissions

## Development

### Build

```bash
go build -o bin/authz-orchestrator ./cmd/server
```

### Test

```bash
go test ./...
```

### Local Development

```bash
# Set environment variables
export KETO_READ_URL=http://localhost:4466
export KETO_WRITE_URL=http://localhost:4467
export OPA_URL=http://localhost:8181
export CONFIG_PATH=./config

# Run service
./bin/authz-orchestrator
```

## Monitoring

### Health Checks

```bash
# Overall health
curl http://localhost:8080/health

# Dependency-specific health
curl http://localhost:8080/health/ready
```

### Logs

Structured JSON logging with configurable levels:

```json
{
  "level": "info",
  "time": "2025-10-12T10:15:30Z",
  "message": "Authorization decision completed",
  "subject": "user:alice@example.com", 
  "action": "file.read",
  "state": "ALLOW",
  "duration": "25ms"
}
```

## Examples

### Working Hours Violation

```bash
curl -X POST http://localhost:8080/decision \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "user:bob@example.com",
    "action": "file.read", 
    "resource": "file:internal-doc",
    "tenant": "tenant-a",
    "context": {
      "hour_utc": 2,
      "classification": "internal"
    }
  }'

# Response: DENY with "working_hours_violation"
```

### Step-Up Required

```bash
curl -X POST http://localhost:8080/decision \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "user:carol@example.com",
    "action": "file.approve",
    "resource": "file:confidential-doc", 
    "tenant": "tenant-a",
    "context": {
      "hour_utc": 23,
      "classification": "confidential",
      "session_aal": 1
    }
  }'

# Response: STEP_UP_REQUIRED with required_aal: 3
```

## Contributing

This service is part of the Ory Self-Hosted demonstration. See the main repository README for contribution guidelines.

## License

See the main repository license.