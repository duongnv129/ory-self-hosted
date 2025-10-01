# CI/CD Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Configure Docker Hub Secrets

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

Add these secrets:

**DOCKER_USERNAME**
```
Your Docker Hub username
```

**DOCKER_PASSWORD**
```
Create a token at: https://hub.docker.com/settings/security
Use the token, NOT your password
```

### Step 2: Create GitHub Environment

1. Go to **Settings** → **Environments**
2. Click **New environment**

Create production environment:

**production**
- Name: `production`
- Enable **Required reviewers** (add your team)
- Enable **Wait timer**: 5 minutes (optional)
- Restrict deployment branches: `main` only

### Step 3: Enable GitHub Actions

1. Go to **Actions** tab
2. If disabled, click **I understand my workflows, go ahead and enable them**

### Step 4: Test the CI/CD Pipeline

**Option A: Push to trigger CI**
```bash
git add .
git commit -m "feat: enable CI/CD"
git push origin main
```

**Option B: Manual trigger**
1. Go to **Actions** tab
2. Select **CI/CD Pipeline** workflow
3. Click **Run workflow** → **Run workflow**

### Step 5: Verify Everything Works

1. Go to **Actions** tab
2. Click on the running workflow
3. Watch the progress:
   - ✅ Lint & Code Quality
   - ✅ Security Scan
   - ✅ Integration Tests
   - ✅ Build Demo Image (if on main branch)

## 📋 Checklist

- [ ] Docker Hub secrets configured
- [ ] Production environment created
- [ ] GitHub Actions enabled
- [ ] First workflow run successful
- [ ] All tests passed

## 🎯 What Happens Now?

### On Every Push/PR

1. **Linting** - Code quality checks
2. **Security** - Vulnerability scanning
3. **Tests** - Full integration tests
4. **Notifications** - If anything fails

### On Push to Main

Everything above, plus:
- **Build** - Docker image built
- **Push** - Image pushed to Docker Hub
- **Deploy** - To production (with approval)

### On Version Tag (v1.0.0)

- **Release** - GitHub release created
- **Changelog** - Automatically generated
- **Images** - Versioned Docker images

## 🔍 Monitoring

### View Workflow Status

```
Repository → Actions → Click on workflow run
```

### Check Logs

```
Actions → Workflow run → Job → Step
```

### Security Alerts

```
Repository → Security → Code scanning alerts
```

## 🐛 Troubleshooting

### Workflow Fails: Docker Login

**Problem:** `Error: Cannot perform an interactive login from a non TTY device`

**Solution:**
- Check `DOCKER_USERNAME` is set correctly
- Check `DOCKER_PASSWORD` is a token, not password
- Verify secrets are in repository settings, not environment

### Workflow Fails: Network Error

**Problem:** Services can't connect

**Solution:**
```yaml
# Already handled in ci.yml with:
docker network create ory-network
```

### Workflow Fails: Timeout

**Problem:** Tests timeout after 2 minutes

**Solution:** Already set to 15 minutes in workflow

### Build Fails: Cache Issues

**Problem:** Docker build fails with cache

**Solution:** Will auto-retry without cache

## 📊 Expected Results

### First Run Timing

- Lint: ~2 minutes
- Security: ~3 minutes
- Tests: ~5-8 minutes
- Build: ~3-5 minutes

**Total: ~15-20 minutes**

### Subsequent Runs (with cache)

- Lint: ~1 minute
- Security: ~2 minutes
- Tests: ~4-5 minutes
- Build: ~2 minutes

**Total: ~10 minutes**

## 🎓 Next Steps

1. **Add more tests** - Extend integration tests
2. **Configure notifications** - Slack/Discord webhooks
3. **Set up monitoring** - DataDog, New Relic, etc.
4. **Add E2E tests** - Playwright or Cypress
5. **Implement staging deploys** - K8s, AWS, etc.

## 📚 Learn More

- [Full CI/CD Documentation](.github/README.md)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)

## 🆘 Need Help?

1. Check [.github/README.md](.github/README.md) for detailed docs
2. Review workflow logs in Actions tab
3. Check GitHub Actions community forums
4. Open an issue in this repository

---

**Status Check:**
- ✅ Secrets configured
- ✅ Environments created
- ✅ First workflow passed
- 🎉 **You're all set!**
