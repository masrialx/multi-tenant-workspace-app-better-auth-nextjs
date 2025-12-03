# Deployment Guide

This guide covers how to deploy the Multi-Tenant Workspace App using the automated CI/CD pipelines.

## Quick Start

### Option 1: Vercel (Recommended for Next.js)

Vercel is the easiest and most optimized platform for Next.js applications.

1. **Connect your GitHub repository to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "New Project"
   - Import your repository

2. **Configure environment variables in Vercel:**
   - Go to Project Settings → Environment Variables
   - Add the following required variables:
     ```
     DATABASE_URL=postgresql://user:password@host:5432/dbname
     BETTER_AUTH_SECRET=your-secret-key-here
     BETTER_AUTH_URL=https://your-app.vercel.app
     NEXT_PUBLIC_BETTER_AUTH_URL=https://your-app.vercel.app
     FRONT_END_URL=https://your-app.vercel.app
     NODE_ENV=production
     ```
   - Add email service configuration (default: enabled):
     ```
     ENABLE_EMAIL_SERVICE=true
     NEXT_PUBLIC_ENABLE_EMAIL_SERVICE=true
     ```
   - Add SMTP configuration (required if email service is enabled):
     ```
     SMTP_HOST=smtp.example.com
     SMTP_PORT=587
     SMTP_SECURE=false
     SMTP_USER=your-email@example.com
     SMTP_PASS=your-password
     SMTP_FROM=noreply@example.com
     ```
   - Optional (for troubleshooting):
     ```
     SMTP_CONNECTION_TIMEOUT=30000
     SMTP_SEND_TIMEOUT=30000
     SMTP_MAX_RETRIES=2
     SMTP_REJECT_UNAUTHORIZED=true
     ```

3. **Enable GitHub Actions (Optional):**
   - If you want to use GitHub Actions instead of Vercel's built-in deployment:
   - Add secrets to GitHub (see `.github/workflows/README.md`)
   - The workflow will automatically deploy on push to main

### Option 2: Railway

1. **Install Railway CLI:**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login and create project:**
   ```bash
   railway login
   railway init
   ```

3. **Add environment variables:**
   - Use Railway dashboard or CLI:
   ```bash
   railway variables set DATABASE_URL=postgresql://...
   railway variables set BETTER_AUTH_SECRET=...
   ```

4. **Deploy:**
   ```bash
   railway up
   ```

   Or use GitHub Actions (see `.github/workflows/deploy-railway.yml`)

### Option 3: Docker Deployment

1. **Build and run with Docker Compose:**
   ```bash
   # Production
   docker-compose -f docker-compose.prod.yml up -d
   
   # Or build manually
   docker build -t workspace-app .
   docker run -p 3000:3000 --env-file .env.production workspace-app
   ```

2. **Using GitHub Actions:**
   - Configure secrets (see `.github/workflows/README.md`)
   - Push to main branch
   - The workflow will build and deploy automatically

### Option 4: Traditional Server (VPS/Dedicated)

1. **SSH into your server:**
   ```bash
   ssh user@your-server.com
   ```

2. **Clone repository:**
   ```bash
   git clone https://github.com/your-username/your-repo.git
   cd your-repo
   ```

3. **Install dependencies:**
   ```bash
   npm ci
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env.production
   nano .env.production
   ```

5. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```

6. **Build and start:**
   ```bash
   npm run build
   npm start
   ```

   Or use PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start npm --name "workspace-app" -- start
   pm2 save
   pm2 startup
   ```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `BETTER_AUTH_SECRET` | Secret for authentication | Generate with: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Your application URL | `https://your-app.com` |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Public auth URL (client-side) | `https://your-app.com` (should match BETTER_AUTH_URL) |
| `FRONT_END_URL` | Frontend URL for email links | `https://your-app.com` |
| `NODE_ENV` | Environment mode | `production` |

### Email Service Configuration

| Variable | Description | Example | Default |
|----------|-------------|---------|---------|
| `ENABLE_EMAIL_SERVICE` | Enable/disable email service | `"true"` or `"false"` | `true` (enabled) |
| `NEXT_PUBLIC_ENABLE_EMAIL_SERVICE` | Client-side email service flag | `"true"` or `"false"` | `true` (enabled) |

**Note:** Both email service flags should match. If not set, defaults to `true` (enabled).

### SMTP Variables (Required if email service is enabled)

| Variable | Description | Example | Default |
|----------|-------------|---------|---------|
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` | - |
| `SMTP_PORT` | SMTP server port | `587` | `587` |
| `SMTP_SECURE` | Use direct TLS (true for 465, false for 587) | `false` | `false` |
| `SMTP_USER` | SMTP username | `your-email@gmail.com` | - |
| `SMTP_PASS` | SMTP password/app password | `your-app-password` | - |
| `SMTP_FROM` | Email sender address | `noreply@your-app.com` | `SMTP_USER` |

**Email Service Behavior:**

**When `ENABLE_EMAIL_SERVICE="false"`:**
- Email verification auto-completes on signup
- Forgot/reset password UI is hidden
- Invitations and join requests use notifications instead of emails
- Email verification banner is hidden
- All email functionality is disabled
- SMTP configuration is not required

**When `ENABLE_EMAIL_SERVICE="true"` (default):**
- Full email functionality enabled
- Email verification required
- Password reset available
- Email notifications for invitations and join requests
- SMTP configuration is required

### Advanced SMTP Variables (Optional)

| Variable | Description | Example | Default |
|----------|-------------|---------|---------|
| `SMTP_CONNECTION_TIMEOUT` | Connection timeout in ms | `30000` | `30000` (prod), `10000` (dev) |
| `SMTP_SEND_TIMEOUT` | Send timeout in ms | `30000` | `30000` (prod), `15000` (dev) |
| `SMTP_MAX_RETRIES` | Maximum retry attempts | `2` | `2` (prod), `1` (dev) |
| `SMTP_REJECT_UNAUTHORIZED` | Reject unauthorized TLS certs | `false` | `true` |

## Database Setup

### Using Vercel Postgres

1. Go to Vercel dashboard → Storage → Create Database
2. Select Postgres
3. Copy the connection string
4. Add to environment variables as `DATABASE_URL`

### Using Railway Postgres

1. In Railway dashboard, add a Postgres service
2. Copy the connection string from the service variables
3. Add to your app's environment variables

### Using External Postgres

1. Create a PostgreSQL database (e.g., on AWS RDS, DigitalOcean, etc.)
2. Get the connection string
3. Add to environment variables

### Running Migrations

After setting up the database:

```bash
# Using npm
npm run db:migrate

# Or using Prisma directly
npx prisma migrate deploy
```

## GitHub Actions Setup

See `.github/workflows/README.md` for detailed instructions on setting up automated deployments.

### Quick Setup for Vercel

1. **Get Vercel credentials:**
   ```bash
   npm i -g vercel
   vercel login
   vercel link
   ```

2. **Add GitHub secrets:**
   - Go to GitHub repo → Settings → Secrets and variables → Actions
   - Add:
     - `VERCEL_TOKEN` (from Vercel dashboard)
     - `VERCEL_ORG_ID` (from `.vercel/project.json`)
     - `VERCEL_PROJECT_ID` (from `.vercel/project.json`)
     - `DATABASE_URL`
     - `BETTER_AUTH_SECRET`
     - `BETTER_AUTH_URL`

3. **Push to main branch:**
   - The workflow will automatically deploy

## Health Checks

After deployment, verify your application:

1. **Check if the app is running:**
   ```bash
   curl https://your-app.com/api/health
   ```

2. **Test authentication:**
   - Visit `/auth/signup`
   - Create an account
   - Verify email (if SMTP is configured)

3. **Check database connection:**
   - Try creating an organization
   - Verify data is persisted

## Troubleshooting

### Build Fails

- **Prisma errors:** Ensure `DATABASE_URL` is set correctly
- **Type errors:** Run `npm run lint` and `npx tsc --noEmit` locally
- **Missing dependencies:** Run `npm ci` to ensure clean install

### Deployment Fails

- **Authentication errors:** Verify all secrets are set correctly
- **Database connection:** Check `DATABASE_URL` format and accessibility
- **Port conflicts:** Ensure port 3000 is available (or change in config)

### Runtime Errors

- **Database migrations:** Run `npm run db:migrate` after deployment
- **Environment variables:** Verify all required variables are set
- **SMTP issues:** Check SMTP credentials and firewall settings
- **Email not working:** 
  - Check `ENABLE_EMAIL_SERVICE` is set to `"true"` (or not set, defaults to true)
  - Verify SMTP credentials are correct
  - Check Render logs for SMTP connection errors
  - Consider temporarily disabling email service: `ENABLE_EMAIL_SERVICE="false"`

## Monitoring

### Recommended Tools

- **Vercel Analytics:** Built-in for Vercel deployments
- **Sentry:** Error tracking (add `@sentry/nextjs`)
- **LogRocket:** Session replay and logging
- **Uptime Robot:** Uptime monitoring

### Logs

- **Vercel:** Dashboard → Project → Logs
- **Railway:** Dashboard → Project → Deployments → View Logs
- **Docker:** `docker-compose logs -f app`
- **PM2:** `pm2 logs workspace-app`

## Security Checklist

- [ ] Use strong `BETTER_AUTH_SECRET` (32+ characters)
- [ ] Use HTTPS in production
- [ ] Set secure database passwords
- [ ] Enable database SSL connections
- [ ] Use environment variables (never commit secrets)
- [ ] Enable rate limiting
- [ ] Set up CORS properly
- [ ] Regular dependency updates
- [ ] Enable security headers

## Scaling

### Horizontal Scaling

- **Vercel:** Automatic scaling
- **Railway:** Manual scaling in dashboard
- **Docker:** Use load balancer (nginx, Traefik) with multiple containers

### Database Scaling

- Use connection pooling (Prisma does this automatically)
- Consider read replicas for high traffic
- Monitor query performance

## Backup Strategy

1. **Database backups:**
   - Most providers (Vercel, Railway) offer automatic backups
   - Or set up manual backups with cron jobs

2. **Code backups:**
   - Git repository is your backup
   - Consider mirroring to multiple remotes

3. **Environment variables:**
   - Document all variables
   - Store securely (1Password, LastPass, etc.)

## Support

For issues or questions:
- Check the [README.md](./README.md)
- Review [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- Open an issue on GitHub

