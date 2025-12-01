# Pipeline Troubleshooting Guide

## Common Issues and Solutions

### 1. Prisma Generate Fails

**Error:** `Error: Can't reach database server`

**Solution:**
- Prisma generate doesn't actually need a database connection
- Use the simple CI workflow: `ci-simple.yml`
- Or update the workflow to use: `npx prisma generate --schema=./prisma/schema.prisma`

**Fix Applied:**
```yaml
- name: Generate Prisma Client
  run: npx prisma generate --schema=./prisma/schema.prisma
```

### 2. Database Migration Fails in CI

**Error:** `prisma migrate dev` requires interactive prompts

**Solution:**
- Use `prisma migrate deploy` for production/CI
- This command doesn't require prompts

**Fix Applied:**
```yaml
- name: Run database migrations
  run: npx prisma migrate deploy
```

### 3. Build Fails - Missing Environment Variables

**Error:** `Environment variable BETTER_AUTH_SECRET is missing`

**Solution:**
- Add default values for CI builds
- Ensure all required env vars are set

**Fix Applied:**
```yaml
env:
  BETTER_AUTH_SECRET: ${{ secrets.BETTER_AUTH_SECRET || 'dummy-secret-for-build-min-32-chars' }}
```

### 4. ESLint Fails

**Error:** ESLint found errors

**Solution:**
- Fix linting errors locally first: `npm run lint`
- Or make lint step non-blocking: `continue-on-error: true`

### 5. TypeScript Errors

**Error:** Type errors found

**Solution:**
- Fix type errors: `npx tsc --noEmit`
- Check `tsconfig.json` configuration

### 6. Vercel Deployment Fails

**Error:** Missing VERCEL_TOKEN

**Solution:**
- Add conditional check: `if: ${{ secrets.VERCEL_TOKEN != '' }}`
- Or skip deployment if not configured

## Quick Fixes

### Make CI Non-Blocking

If you want CI to report issues but not block:
```yaml
- name: Run ESLint
  run: npm run lint
  continue-on-error: true
```

### Skip Build in CI

If builds are slow, use `ci-simple.yml` which only does linting and type checking.

### Use Production Migration Command

Always use `prisma migrate deploy` in CI/CD, not `prisma migrate dev`.

## Testing Workflows Locally

### Using act (GitHub Actions locally)

```bash
# Install act
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run CI workflow
act push

# Run with secrets
act push --secret DATABASE_URL=postgresql://...
```

### Manual Testing

```bash
# Test Prisma generate
npm run db:generate

# Test linting
npm run lint

# Test type checking
npx tsc --noEmit

# Test build
npm run build
```

## Workflow Selection

| Issue | Use This Workflow |
|-------|------------------|
| Prisma DB connection errors | `ci-simple.yml` |
| Want faster CI | `ci-simple.yml` |
| Need full build test | `ci.yml` |
| Deployment to Vercel | `deploy-vercel.yml` |
| Deployment to server | `deploy-docker.yml` |

## Debugging Steps

1. **Check workflow logs:**
   - Go to Actions tab
   - Click on failed workflow
   - Expand failed step
   - Read error message

2. **Test locally:**
   ```bash
   npm ci
   npm run db:generate
   npm run lint
   npx tsc --noEmit
   npm run build
   ```

3. **Check secrets:**
   - Repository → Settings → Secrets
   - Verify all required secrets are set

4. **Verify environment:**
   - Check Node.js version matches (20.x)
   - Verify package.json scripts exist
   - Check Prisma schema is valid

## Common Error Messages

### "Cannot find module '@prisma/client'"
**Fix:** Run `npm run db:generate` before build

### "DATABASE_URL is not set"
**Fix:** Add to secrets or use default value in workflow

### "Command failed with exit code 1"
**Fix:** Check the step above for specific error

### "Workflow run failed"
**Fix:** Check all steps, one of them failed

## Getting Help

1. Check workflow logs in GitHub Actions
2. Test commands locally
3. Review this troubleshooting guide
4. Check GitHub Actions documentation
5. Review Next.js deployment docs

