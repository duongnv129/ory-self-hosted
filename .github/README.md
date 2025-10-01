# GitHub Actions CI/CD

This directory contains GitHub Actions workflows for continuous integration and continuous deployment.

## Workflows

### 1. CI/CD Pipeline (`ci.yml`)

Main pipeline that runs on every push and pull request.

**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch
- Manual dispatch

**Jobs:**

#### Lint & Code Quality
- Validates JavaScript code
- Checks YAML syntax
- Validates JSON files
- Node.js 18 environment

#### Security Scan
- Trivy vulnerability scanning
- NPM audit for dependencies
- Results uploaded to GitHub Security
- SARIF format reports

#### Integration Tests
- Full stack deployment (PostgreSQL → Kratos → Keto)
- Health checks for all services
- Test identity creation in Kratos
- Test relation management in Keto
- Test permission checks
- Multi-tenancy demo build and test
- Automatic cleanup on failure

#### Build Demo Image
- Builds multi-tenancy demo Docker image
- Pushes to Docker Hub (on main branch)
- Multi-platform support (amd64, arm64)
- Layer caching for faster builds

#### Deploy Production
- Deploys to production environment
- Runs on `main` branch pushes only
- Environment protection rules
- Manual approval required

#### Notification
- Sends notifications on pipeline failure
- Can be configured for Slack, email, etc.

### 2. Release (`release.yml`)

Automated release creation when version tags are pushed.

**Triggers:**
- Push tags matching `v*.*.*` (e.g., v1.0.0)

**Actions:**
- Generates changelog from git commits
- Creates GitHub release with notes
- Builds and pushes versioned Docker images
- Tags images with both version and `latest`

**Example:**
```bash
git tag v1.0.0
git push origin v1.0.0
```

### 3. Docker Compose Tests (`docker-compose-test.yml`)

Validates Docker Compose configurations.

**Triggers:**
- Pull requests modifying Docker Compose files
- Pull requests modifying Dockerfiles

**Tests:**
- Validates all docker-compose.yaml syntax
- Tests full stack deployment
- Verifies service connectivity
- Shows logs on failure

### 4. Cleanup (`cleanup.yml`)

Maintains repository hygiene.

**Triggers:**
- Weekly schedule (Sunday at midnight)
- Manual dispatch

**Actions:**
- Deletes workflow runs older than 30 days
- Keeps minimum of 10 runs
- Reduces storage usage

## Setup Requirements

### GitHub Secrets

Configure these secrets in your repository settings:

1. **DOCKER_USERNAME** - Docker Hub username
   ```
   Settings → Secrets → Actions → New repository secret
   ```

2. **DOCKER_PASSWORD** - Docker Hub access token
   ```
   Create at: https://hub.docker.com/settings/security
   ```

### Environment Protection Rules

1. Go to Settings → Environments
2. Create `production` environment
3. Add protection rules:
   - Required reviewers
   - Wait timer (optional)
   - Deployment branches: `main` only

## Dependabot

Automatic dependency updates configured for:
- GitHub Actions (weekly)
- Docker base images (weekly)
- NPM packages (weekly)

Configuration: `.github/dependabot.yml`

## YAML Linting

YAML files are validated using yamllint with custom rules:

Configuration: `.yamllint.yml`

**Rules:**
- Max line length: 120 (warning)
- 2-space indentation
- Sequence indentation enabled
- Document start marker optional

## Pull Request Template

Template automatically appears when creating PRs.

Location: `.github/PULL_REQUEST_TEMPLATE.md`

**Includes:**
- Description fields
- Type of change checklist
- Testing checklist
- Documentation checklist
- Configuration changes tracking

## Local Testing

### Test CI Pipeline Locally

Using [act](https://github.com/nektos/act):

```bash
# Install act
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run all jobs
act

# Run specific job
act -j test

# Run specific workflow
act -W .github/workflows/ci.yml
```

### Validate Workflows

```bash
# Validate workflow syntax
yamllint .github/workflows/*.yml

# Test docker-compose files
docker-compose -f postgres/docker-compose.yaml config
docker-compose -f kratos/docker-compose.yaml config
docker-compose -f keto/docker-compose.yaml config
```

## Monitoring CI/CD

### View Workflow Runs

1. Go to repository → Actions tab
2. Click on a workflow to see runs
3. Click on a run to see jobs
4. Click on a job to see steps

### Badges

Add status badges to README:

```markdown
![CI/CD](https://github.com/username/repo/workflows/CI/CD%20Pipeline/badge.svg)
![Release](https://github.com/username/repo/workflows/Release/badge.svg)
```

### Logs

- All logs are stored for 90 days
- Download logs from workflow run page
- View real-time logs while workflow is running

## Troubleshooting

### Build Failures

**Problem:** Docker build fails
```bash
# Check locally
cd multi-tenancy-demo
docker build -t test .
```

**Problem:** Tests timeout
```bash
# Increase timeout in workflow
timeout-minutes: 30
```

### Secret Issues

**Problem:** Docker login fails
```bash
# Verify secrets are set correctly
# Check Docker Hub token hasn't expired
```

### Network Issues

**Problem:** Services can't communicate
```bash
# Ensure network is created
docker network create ory-network

# Check service names match in docker-compose
```

## Best Practices

### Commits

- Use conventional commits:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation
  - `ci:` for CI/CD changes
  - `test:` for tests

### Pull Requests

- Create from feature branches
- Keep PRs focused and small
- Fill out the PR template completely
- Request reviews from team members
- Ensure all checks pass before merging

### Releases

- Follow semantic versioning (MAJOR.MINOR.PATCH)
- Update CHANGELOG.md before releasing
- Test thoroughly before creating release tag
- Include migration notes if needed

## Optimization

### Speed Up Builds

1. **Use caching:**
   - Docker layer caching (already configured)
   - NPM cache (already configured)

2. **Parallel jobs:**
   - Jobs run in parallel by default
   - Use `needs:` to create dependencies

3. **Reduce image size:**
   - Use multi-stage builds
   - Use alpine base images
   - Remove unnecessary dependencies

### Reduce Costs

1. **Cancel redundant runs:**
   ```yaml
   concurrency:
     group: ${{ github.workflow }}-${{ github.ref }}
     cancel-in-progress: true
   ```

2. **Use self-hosted runners:**
   - For frequently running workflows
   - For resource-intensive builds

## Security

### Scanning

- **Trivy**: Scans for vulnerabilities in dependencies and images
- **NPM Audit**: Checks for known vulnerabilities in packages
- **SARIF Upload**: Results visible in Security tab

### Secrets Management

- Never commit secrets
- Use GitHub Secrets for sensitive data
- Rotate secrets regularly
- Use environment-specific secrets

### Image Scanning

All Docker images are scanned before pushing:
- Critical and high vulnerabilities must be fixed
- Results uploaded to GitHub Security

## Support

### Documentation

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [Trivy Action](https://github.com/aquasecurity/trivy-action)

### Getting Help

1. Check workflow logs
2. Review GitHub Actions documentation
3. Search GitHub Actions community
4. Open an issue in this repository

## Future Improvements

- [ ] Add E2E tests with Playwright/Cypress
- [ ] Implement blue-green deployment
- [ ] Add performance testing
- [ ] Implement automatic rollback
- [ ] Add Slack/Discord notifications
- [ ] Implement canary deployments
- [ ] Add database migration checks
- [ ] Implement smoke tests after deployment
