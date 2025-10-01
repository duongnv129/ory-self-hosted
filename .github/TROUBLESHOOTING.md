# CI/CD Troubleshooting Guide

## Common Issues and Solutions

### 1. Docker Compose Command Not Found

**Error:**
```
docker-compose: command not found
Error: Process completed with exit code 127
```

**Cause:** GitHub Actions runners use Docker Compose V2 (`docker compose`) by default.

**Solution:** ✅ Already fixed in workflows. All commands now use `docker compose` instead of `docker-compose`.

**Local Testing:**
```bash
# Use V2 syntax (space, not hyphen)
docker compose up -d

# Or install V2 if you have V1
brew install docker-compose
```

---

### 2. Network Already Exists

**Error:**
```
Error response from daemon: network with name ory-network already exists
```

**Solution:**
```bash
# The workflow handles this with || true
docker network create ory-network || echo "Network already exists"
```

**Manual cleanup:**
```bash
docker network rm ory-network
```

---

### 3. Port Already in Use

**Error:**
```
Error starting userland proxy: listen tcp 0.0.0.0:4433: bind: address already in use
```

**Cause:** Another container or process is using the port.

**Solution in CI:**
```bash
# The cleanup step removes all containers
docker compose down -v
```

**Local fix:**
```bash
# Find what's using the port
lsof -i :4433

# Stop the service
docker stop <container-id>
```

---

### 4. Service Health Check Timeout

**Error:**
```
timeout: failed to run command 'bash': No such file or directory
```

**Solution:** Already implemented with proper wait conditions:
```yaml
- name: Wait for Kratos
  run: |
    timeout 60 bash -c 'until curl -sf http://localhost:4433/health/ready; do sleep 2; done'
```

**Increase timeout if needed:**
```yaml
timeout-minutes: 15  # At job level
```

---

### 5. Docker Login Failed

**Error:**
```
Error: Cannot perform an interactive login from a non TTY device
```

**Cause:** Incorrect Docker Hub credentials.

**Solution:**
1. Check secrets are set:
   - `DOCKER_USERNAME` (your Docker Hub username)
   - `DOCKER_PASSWORD` (access token, NOT password)

2. Create a new access token:
   - https://hub.docker.com/settings/security
   - Click "New Access Token"
   - Copy and save to GitHub Secrets

3. Verify secrets location:
   - Settings → Secrets and variables → Actions
   - Should be in Repository secrets, not Environment secrets

---

### 6. Permission Denied

**Error:**
```
permission denied while trying to connect to the Docker daemon socket
```

**Cause:** User doesn't have Docker permissions.

**Solution:** GitHub Actions runners have Docker pre-configured. This shouldn't happen in CI.

**Local fix:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, or
newgrp docker
```

---

### 7. Image Pull Rate Limit

**Error:**
```
Error response from daemon: toomanyrequests: You have reached your pull rate limit
```

**Cause:** Docker Hub anonymous pull limit (100 pulls/6 hours).

**Solution:**
1. Already handled by logging in to Docker Hub in workflow
2. Authenticated users get 200 pulls/6 hours
3. For higher limits, upgrade Docker Hub plan

---

### 8. Cache Issues

**Error:**
```
failed to solve with frontend dockerfile.v0: failed to build LLB: failed to load cache key
```

**Solution:**
```yaml
# Already implemented in workflow
cache-from: type=gha
cache-to: type=gha,mode=max
```

**Manual clear:**
- Settings → Actions → Caches → Delete all caches

---

### 9. Workflow Not Triggering

**Problem:** Pushed to main but workflow didn't run.

**Solutions:**

1. **Check if Actions are enabled:**
   - Repository → Settings → Actions → General
   - Enable "Allow all actions and reusable workflows"

2. **Check branch protection:**
   - Settings → Branches → main
   - Ensure workflows aren't blocked

3. **Check workflow syntax:**
   ```bash
   # Validate YAML
   yamllint .github/workflows/ci.yml
   ```

4. **Check file location:**
   ```
   ✅ .github/workflows/ci.yml
   ❌ github/workflows/ci.yml
   ```

---

### 10. Tests Failing Locally But Pass in CI

**Cause:** Environment differences.

**Solution:**

1. **Use same Docker Compose version:**
   ```bash
   docker compose version  # Should be V2
   ```

2. **Clean environment:**
   ```bash
   make clean
   docker system prune -af
   docker volume prune -f
   ```

3. **Check Docker resources:**
   - Docker Desktop → Settings → Resources
   - Increase memory to 4GB+
   - Increase disk space

---

### 11. Secrets Not Working

**Problem:** Secrets showing as empty or undefined.

**Solutions:**

1. **Verify secret names match:**
   ```yaml
   # In workflow
   username: ${{ secrets.DOCKER_USERNAME }}

   # In GitHub (must match exactly)
   Secret name: DOCKER_USERNAME
   ```

2. **Check secret scope:**
   - Repository secrets: Available to all workflows
   - Environment secrets: Only for specific environment

3. **Re-create secrets:**
   - Delete and create again
   - Ensure no trailing spaces

---

### 12. Multi-Platform Build Fails

**Error:**
```
ERROR: failed to solve: failed to push: unexpected status: 400 Bad Request
```

**Cause:** Platform incompatibility.

**Solution:**
```yaml
# Already configured
platforms: linux/amd64,linux/arm64

# Use buildx (already in workflow)
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3
```

---

### 13. YAML Validation Errors

**Error:**
```
line too long (> 120 characters)
```

**Solution:** Already configured in `.yamllint.yml`:
```yaml
rules:
  line-length:
    max: 120
    level: warning  # Won't fail, just warn
```

**Fix manually:**
```bash
yamllint .github/workflows/ci.yml
```

---

### 14. Database Connection Refused

**Error:**
```
could not connect to server: Connection refused
```

**Cause:** Database not ready yet.

**Solution:** Already implemented:
```yaml
- name: Wait for PostgreSQL
  run: |
    timeout 30 bash -c 'until docker exec postgres pg_isready -U postgres; do sleep 1; done'
```

---

### 15. Dependabot PR Conflicts

**Problem:** Dependabot PRs have merge conflicts.

**Solution:**
```bash
# Let Dependabot recreate the PR
# Comment on the PR:
@dependabot recreate

# Or close and it will create a new one
```

---

## Quick Diagnostics

### Check Workflow Status
```bash
# View workflow runs
gh run list

# View specific run
gh run view <run-id>

# Watch live
gh run watch
```

### Check Service Health in CI
```yaml
- name: Debug services
  if: failure()
  run: |
    docker ps -a
    docker network ls
    docker logs postgres
    docker logs kratos-kratos-1
    docker logs keto-keto-1
```

### Local Test Before Push
```bash
# Test full stack locally
make clean
make network
make up
make health

# Or use act to test workflow
act -j test
```

---

## Getting Help

1. **Check workflow logs:**
   - Actions → Workflow run → Job → Step

2. **Enable debug logging:**
   - Repository settings → Secrets → Actions
   - Add: `ACTIONS_STEP_DEBUG` = `true`
   - Add: `ACTIONS_RUNNER_DEBUG` = `true`

3. **Compare with working runs:**
   - Find a successful run
   - Compare logs with failing run

4. **Test locally:**
   ```bash
   # Replicate CI environment
   docker compose -f postgres/docker-compose.yaml up -d
   docker compose -f kratos/docker-compose.yaml up -d
   docker compose -f keto/docker-compose.yaml up -d
   ```

5. **Open an issue:**
   - Include workflow logs
   - Include error messages
   - Specify which job failed

---

## Useful Commands

```bash
# View all workflows
gh workflow list

# Trigger workflow manually
gh workflow run ci.yml

# Download artifacts
gh run download <run-id>

# Cancel running workflow
gh run cancel <run-id>

# Re-run failed jobs
gh run rerun <run-id> --failed

# View logs
gh run view <run-id> --log
```

---

## Prevention

✅ **Always test locally first:**
```bash
make clean && make dev && make health
```

✅ **Use pull requests:**
- All changes go through PR
- CI runs before merge
- Review before deploy

✅ **Monitor runs:**
- Enable email notifications
- Check Actions tab regularly
- Review failed runs promptly

✅ **Keep dependencies updated:**
- Dependabot handles this automatically
- Review and merge PRs weekly

✅ **Document changes:**
- Update README when changing CI
- Comment complex workflow logic
- Keep troubleshooting guide updated
