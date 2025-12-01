# Quick Start Guide - CI/CD Setup

## What Was Created

✅ **5 GitHub Actions Workflows:**
1. `ci.yml` - Runs on every push/PR (linting, type checking, build)
2. `deploy.yml` - Generic deployment workflow
3. `deploy-vercel.yml` - Vercel-specific deployment
4. `deploy-docker.yml` - Docker build and deployment
5. `deploy-railway.yml` - Railway deployment

✅ **Docker Support:**
- `Dockerfile` - Production-ready Docker image
- `docker-compose.prod.yml` - Production Docker Compose
- `.dockerignore` - Optimized Docker builds

✅ **Documentation:**
- `.github/workflows/README.md` - Detailed workflow documentation
- `DEPLOYMENT.md` - Complete deployment guide

## Next Steps

### 1. Choose Your Deployment Platform

**Recommended: Vercel** (easiest for Next.js)
- Go to [vercel.com](https://vercel.com)
- Connect your GitHub repo
- Add environment variables
- Done! Auto-deploys on every push

**Alternative Options:**
- Railway: Simple, good for full-stack apps
- Docker: For custom servers/VPS
- Other: Modify workflows as needed

### 2. Set Up GitHub Secrets (if using GitHub Actions)

Go to: **Repository → Settings → Secrets and variables → Actions**

**For Vercel:**
```
VERCEL_TOKEN=your-token
VERCEL_ORG_ID=your-org-id
VERCEL_PROJECT_ID=your-project-id
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=your-secret
BETTER_AUTH_URL=https://your-app.vercel.app
```

**How to get Vercel credentials:**
```bash
npm i -g vercel
vercel login
vercel link
# Check .vercel/project.json for IDs
```

### 3. Enable Workflows

1. Push your code to GitHub
2. Go to **Actions** tab
3. Select a workflow
4. Click **"Run workflow"** to test

### 4. Test CI Pipeline

The CI workflow runs automatically on every push:
- ✅ Linting
- ✅ Type checking  
- ✅ Build verification

Check the **Actions** tab to see results.

## Workflow Selection

| Platform | Use This Workflow |
|----------|------------------|
| Vercel | `deploy-vercel.yml` |
| Railway | `deploy-railway.yml` |
| Docker/Server | `deploy-docker.yml` |
| Custom | `deploy.yml` (modify as needed) |

## Environment Variables Needed

### Required:
- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Generate: `openssl rand -base64 32`
- `BETTER_AUTH_URL` - Your app URL

### Optional (for emails):
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

## Troubleshooting

**Workflow not running?**
- Check if workflows are enabled in repository settings
- Ensure you're pushing to `main` or `master` branch

**Build failing?**
- Check Actions tab for error details
- Verify all environment variables are set
- Run `npm run lint` and `npm run build` locally first

**Deployment failing?**
- Verify all secrets are set correctly
- Check token permissions
- Review deployment logs in Actions tab

## Need Help?

- See `.github/workflows/README.md` for detailed docs
- See `DEPLOYMENT.md` for deployment guide
- Check GitHub Actions logs for specific errors

## What Happens on Push?

1. **CI Workflow** runs automatically:
   - Lints code
   - Type checks
   - Builds app
   - ✅ All must pass

2. **Deploy Workflow** runs (if on main/master):
   - Runs database migrations
   - Builds production app
   - Deploys to your platform
   - ✅ App goes live!

That's it! Your app now has automated CI/CD! 🚀

