# Workspace Application Setup Guide

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm installed
- PostgreSQL database running locally or accessible remotely

## Step 1: Clone and Install Dependencies

\`\`\`bash
npm install
\`\`\`

## Step 2: Setup Environment Variables

The `.env.local` file is already created with a comprehensive template. Update it with your actual values:

**Required Variables:**

\`\`\`env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/workspace_db

# Better Auth Configuration
BETTER_AUTH_SECRET=your-secret-key-here-change-this-in-production
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
FRONT_END_URL=http://localhost:3000

# Email Service Configuration (default: enabled)
ENABLE_EMAIL_SERVICE=true
NEXT_PUBLIC_ENABLE_EMAIL_SERVICE=true

# SMTP Configuration (Required if email service is enabled)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-smtp-password-or-app-password
SMTP_FROM=your-email@gmail.com

# Node Environment
NODE_ENV=development
\`\`\`

**Replace the following:**
- `user`, `password`, and `workspace_db` in `DATABASE_URL` with your actual PostgreSQL credentials
- `BETTER_AUTH_SECRET` with a secure random string (see below)
- SMTP credentials with your email provider settings
- URLs with your actual deployment URLs (for production)

> **Note:** The `.env.local` file contains detailed comments explaining all variables, including optional SMTP tuning variables for production/serverless environments.

### Generate BETTER_AUTH_SECRET

Run one of these commands to generate a secure secret:

\`\`\`bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -base64 32
\`\`\`

Copy the generated secret and paste it as the value for `BETTER_AUTH_SECRET` in `.env.local`.

## Step 3: Setup Database

### Create PostgreSQL Database

\`\`\`bash
createdb workspace_db
\`\`\`

Or use your PostgreSQL client to create a database named `workspace_db`.

### Run Migrations

\`\`\`bash
npm run db:migrate
\`\`\`

This will:
1. Create all necessary tables (User, Session, Organization, OrganizationMember, Outline)
2. Setup indexes for performance

### Seed Sample Data

\`\`\`bash
npm run db:seed
\`\`\`

This creates:
- Admin user: `admin@example.com` / `admin123`
- Demo organization
- Sample outline items

## Step 4: Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 5: Access the Application

1. **First Time**: You'll be redirected to the sign-in page
2. **Sign In**: Use the seeded credentials:
   - Email: `admin@example.com`
   - Password: `admin123`
3. **Workspace**: You'll see your demo organization
4. **Create Organization**: Sign up new accounts and create new organizations

## Key Features

### Outlines Page
- View all outlines for an organization
- Add new outlines using the "Add Outline" button
- Edit existing outlines (click Edit icon)
- Delete outlines (click Trash icon)
- Track status, reviewer, target/limit values

**Target/Limit Input Features:**
- Full keyboard input support - type freely while editing
- Field can be completely cleared (delete all characters)
- Real-time validation with immediate error feedback
- Shows "Negative values are not supported" error message in red text below input
- Arrow key support (↑/↓) for quick increment/decrement
- Minimum value enforcement: values less than 1 are auto-corrected to 1 on field blur
- Red border and error text for invalid values (negative or zero)

### Team Management
- View all organization members
- Invite new members by email (Owner only)
- Invitations must be accepted by users before joining
- Remove members (Owner only)
- See member roles (Owner/Member)
- Receive notifications for invitation acceptance

## API Endpoints

### Authentication
- `POST /api/auth/sign-up` - Sign up new user
- `POST /api/auth/sign-in` - Sign in user
- `POST /api/auth/sign-out` - Sign out user

### Organization Members
- `GET /api/org/members?orgId=...` - Get organization members
- `POST /api/org/members` - Invite member (owner only, creates invitation)
- `DELETE /api/org/members?orgId=...&userId=...` - Remove member (owner only)
- `POST /api/org/invitations/accept` - Accept organization invitation

### Outlines
- `GET /api/outlines?orgId=...` - Get organization outlines
- `POST /api/outlines` - Create new outline
- `PATCH /api/outlines/:id` - Update outline
- `DELETE /api/outlines/:id?orgId=...` - Delete outline

## Database Schema

### User
- id, email, name, password, emailVerified, image, createdAt, updatedAt
- Relations: sessions, accounts, organizations, organizationMembers

### Organization
- id, name, slug, logo, ownerId, createdAt, updatedAt
- Relations: owner (User), members (OrganizationMember), outlines (Outline)

### OrganizationMember
- id, role (owner/member), organizationId, userId, createdAt, updatedAt
- Unique constraint: (organizationId, userId)

### Invitation
- id, organizationId, email, role, status (pending/accepted/rejected/expired), expiresAt, inviterId, createdAt, updatedAt
- Tracks organization invitations that require user acceptance

### Outline
- id, header, sectionType, status, target, limit, reviewer, organizationId, createdAt, updatedAt

## Development Commands

\`\`\`bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# View Prisma Studio (interactive database browser)
npm run db:studio

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate
\`\`\`

## Troubleshooting

### "Connection refused" error
- Ensure PostgreSQL is running
- Check DATABASE_URL is correct

### "BETTER_AUTH_SECRET not set"
- Ensure .env.local file exists
- Check BETTER_AUTH_SECRET is set to at least 32 characters

### Migrations not applying
\`\`\`bash
npm run db:generate
npm run db:migrate
\`\`\`

### Reset database (WARNING: Deletes all data)
\`\`\`bash
npx prisma migrate reset
\`\`\`

## Next Steps

1. Customize organization creation/joining flows
2. Configure SMTP for email notifications (see SMTP_SETUP.md)
3. Implement user roles/permissions system
4. Add organization settings page
5. Setup production database
6. Deploy to Vercel

## Support

For better-auth documentation: https://better-auth.vercel.app
For Prisma documentation: https://www.prisma.io/docs
For Next.js documentation: https://nextjs.org/docs
