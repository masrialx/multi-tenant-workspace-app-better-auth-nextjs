# GitHub Actions Workflows

This directory contains CI/CD workflows for automated testing, building, and deployment.

## Available Workflows

### 1. `ci.yml` - Continuous Integration
Runs on every push and pull request to main/master/develop branches:
- Linting with ESLint
- Type checking with TypeScript
- Building the Next.js application

**No secrets required** - Uses dummy values for build-time environment variables.

### 2. `deploy.yml` - Generic Deployment
Deploys to production when code is pushed to main/master branch:
- Runs database migrations
- Builds the application
- Deploys using Vercel Action

**Required Secrets:**
- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Authentication secret
- `BETTER_AUTH_URL` - Application URL
- `VERCEL_TOKEN` - Vercel authentication token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID

### 3. `deploy-vercel.yml` - Vercel CLI Deployment
Alternative Vercel deployment using Vercel CLI:
- Uses Vercel CLI for deployment
- Pulls environment variables from Vercel
- Builds and deploys to production

**Required Secrets:**
- `VERCEL_TOKEN` - Vercel authentication token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID

### 4. `deploy-docker.yml` - Docker Deployment
Builds Docker image and deploys to a server:
- Builds Docker image
- Pushes to Docker Hub
- Deploys via SSH to your server

**Required Secrets:**
- `DOCKER_USERNAME` - Docker Hub username
- `DOCKER_PASSWORD` - Docker Hub password
- `SSH_HOST` - Server hostname/IP
- `SSH_USERNAME` - SSH username
- `SSH_PRIVATE_KEY` - SSH private key

### 5. `deploy-railway.yml` - Railway Deployment
Deploys to Railway platform:
- Uses Railway CLI
- Simple deployment workflow

**Required Secrets:**
- `RAILWAY_TOKEN` - Railway authentication token

## Setup Instructions

### For Vercel Deployment (Recommended for Next.js)

1. **Get Vercel credentials:**
   ```bash
   # Install Vercel CLI locally
   npm i -g vercel
   
   # Login and link your project
   vercel login
   vercel link
   
   # Get your credentials
   vercel whoami
   ```

2. **Add secrets to GitHub:**
   - Go to your repository → Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `VERCEL_TOKEN` - Get from Vercel dashboard → Settings → Tokens
     - `VERCEL_ORG_ID` - Found in `.vercel/project.json` after running `vercel link`
     - `VERCEL_PROJECT_ID` - Found in `.vercel/project.json` after running `vercel link`
     - `DATABASE_URL` - Your PostgreSQL connection string
     - `BETTER_AUTH_SECRET` - Generate a secure random string
     - `BETTER_AUTH_URL` - Your production URL (e.g., https://your-app.vercel.app)

3. **Enable the workflow:**
   - The workflow will automatically run on push to main/master
   - Or manually trigger from Actions tab → Deploy to Vercel → Run workflow

### For Docker Deployment

1. **Create Docker Hub account** (if you don't have one)

2. **Add secrets to GitHub:**
   - `DOCKER_USERNAME` - Your Docker Hub username
   - `DOCKER_PASSWORD` - Your Docker Hub password or access token
   - `SSH_HOST` - Your server IP or hostname
   - `SSH_USERNAME` - SSH user (usually `root` or `ubuntu`)
   - `SSH_PRIVATE_KEY` - Your SSH private key

3. **Update deployment script:**
   - Edit `.github/workflows/deploy-docker.yml`
   - Update the path in the SSH script: `cd /path/to/your/app`

### For Railway Deployment

1. **Get Railway token:**
   - Go to Railway dashboard → Account Settings → Tokens
   - Create a new token

2. **Add secret to GitHub:**
   - `RAILWAY_TOKEN` - Your Railway token

3. **Link Railway project:**
   - Run `railway link` in your project directory
   - Or create a new project in Railway dashboard

## Environment Variables

Make sure to set these in your deployment platform:

### Required:
- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Secret for authentication (generate with: `openssl rand -base64 32`)
- `BETTER_AUTH_URL` - Your application URL

### Optional (for email functionality):
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `SMTP_FROM` - Email sender address

## Next.js Standalone Output

The Dockerfile uses Next.js standalone output. To enable this, update `next.config.mjs`:

```javascript
const nextConfig = {
  output: 'standalone',
  // ... other config
}
```

## Workflow Selection

Choose the workflow that matches your deployment platform:

- **Vercel** (Recommended): Use `deploy-vercel.yml` or `deploy.yml`
- **Docker/Server**: Use `deploy-docker.yml`
- **Railway**: Use `deploy-railway.yml`
- **Other platforms**: Modify `deploy.yml` to match your platform

## Manual Deployment

All workflows support manual triggering:
1. Go to Actions tab in GitHub
2. Select the workflow
3. Click "Run workflow"
4. Select branch and click "Run workflow"

## Troubleshooting

### Build fails with Prisma errors
- Ensure `DATABASE_URL` is set in secrets
- Run `npm run db:generate` locally to verify Prisma setup

### Deployment fails with authentication errors
- Verify all required secrets are set correctly
- Check token expiration dates
- Ensure tokens have proper permissions

### Docker build fails
- Check Dockerfile syntax
- Verify all dependencies are listed in package.json
- Ensure Node.js version matches (20.x)

