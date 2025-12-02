# Multi-Tenant Workspace Application

A complete, production-ready multi-tenant workspace application built with **Next.js 16**, **better-auth**, **Prisma**, **PostgreSQL**, and **shadcn/ui**. Features comprehensive organization management, team collaboration, outline tracking, real-time notifications, email verification, and granular role-based access control.

## 🚀 Features

### 🔐 Authentication & Security
- **Email & Password Authentication** - Secure authentication with better-auth
- **Email Verification** - Email verification system with verification links
- **Password Reset** - Forgot password and reset password functionality
- **Session Management** - Secure cookie-based session management with 7-day expiration
- **Password Security** - Bcryptjs hashing with strength requirements (min 8 chars, uppercase, lowercase, number)
- **Protected Routes** - Route-level authentication and authorization
- **Email Validation** - Comprehensive email format and deliverability validation

### 🏢 Multi-Tenant Organization System
- **Create Organizations** - Create new organizations with auto-generated slugs
- **Join Organizations** - Join organizations via slug with join request system
- **Delete Organizations** - Organization owners can delete organizations with password verification
- **Organization Ownership** - Automatic owner role assignment for creators
- **Slug Management** - URL-safe slug generation and validation
- **Organization Listing** - View all organizations user belongs to
- **Organization Scoping** - All resources scoped to organizations
- **Deletion Notifications** - All members and owner notified when organization is deleted

### 👥 Team Management
- **Member Invitations** - Invite team members by email with invitation system
- **Invitation Acceptance/Rejection** - Users can accept or reject invitations
- **Invitation Expiration** - Invitations expire after 7 days with visual indicators
- **Email Notifications** - Automatic email notifications for invitations with action links
- **Role-Based Access Control** - Owner and Member roles with granular permissions
- **Member Management** - List, view, and remove organization members
- **Owner Privileges** - Owner-only actions (invite, remove members, manage outlines, delete organization)
- **Join Request System** - Request-based joining with owner approval workflow
- **Multiple Join Requests** - Users can send multiple join requests (no duplicate prevention)
- **Join Request Expiration** - Join requests expire after 7 days
- **Email Action Links** - Accept/reject join requests directly from email links
- **Real-time Notifications** - Notification system for invitations, join requests, and approvals

### 📋 Outline Management
- **Full CRUD Operations** - Create, read, update, and delete outlines
- **Rich Outline Fields**:
  - Header (title)
  - Section Type (Table of Contents, Executive Summary, Technical Approach, Design, Capabilities, Focus Document, Narrative)
  - Status (Pending, In-Progress, Completed)
  - Target & Limit (numeric values)
  - Reviewer Assignment (Assim, Bini, Mami)
- **Organization-Scoped** - All outlines belong to specific organizations
- **Owner-Only Editing** - Only organization owners can create/edit/delete outlines
- **Status Tracking** - Visual status indicators with color coding

### 🔔 Notification System
- **Real-time Notifications** - Polling-based notification system (30-second intervals)
- **Join Request Notifications** - Notify owners of join requests with email links
- **Join Request Actions** - Accept or reject join requests directly from notifications or email links
- **Notification Types**:
  - `join_request` - New join request (expires in 7 days)
  - `join_accepted` - Join request accepted
  - `join_rejected` - Join request rejected
  - `invitation` - Organization invitation (expires in 7 days, requires acceptance)
  - `invitation_accepted` - Invitation accepted notification
  - `invitation_rejected` - Invitation rejected notification
  - `organization_deleted` - Organization deletion notification
- **Expiration Handling** - Invitations and join requests expire after 7 days with visual indicators
- **Read/Unread Status** - Mark notifications as read individually or all at once
- **Unread Count Badge** - Visual indicator of unread notifications
- **Notification UI** - Beautiful popover-based notification center with expiration warnings
- **Email Integration** - Accept/reject actions available directly from email links

### 📧 Email System
- **SMTP Integration** - Full SMTP support with Nodemailer
- **Email Templates** - Beautiful HTML email templates for:
  - Password reset emails
  - Email verification emails
  - Organization invitation emails (with accept/reject links)
  - Join request notifications (with accept link for owners)
  - Join request acceptance/rejection emails
  - Organization deletion notifications
- **Email Action Links** - Direct action links in emails for accepting/rejecting requests
- **Email Validation** - Comprehensive email format and deliverability checks
- **Email Verification Banner** - UI component prompting users to verify email
- **Error Handling** - Graceful email send error handling with user-friendly messages
- **Multiple SMTP Providers** - Support for Gmail, Outlook, SendGrid, Mailgun, AWS SES

### 🎨 User Interface
- **Modern Design** - Beautiful, modern UI with shadcn/ui components
- **Dark Mode** - Full dark mode support with theme toggle
- **Responsive Design** - Mobile-first responsive design
- **Toast Notifications** - User-friendly toast notifications for actions
- **Loading States** - Comprehensive loading states throughout the app
- **Error Handling** - User-friendly error messages and validation feedback
- **Empty States** - Beautiful empty states for all list views
- **Gradient Backgrounds** - Modern gradient backgrounds and visual effects

### 🛡️ Security Features
- **Role-Based Authorization** - Granular permission checks on all API routes
- **Organization Membership Validation** - Verify user membership before access
- **Input Validation** - Zod schema validation on all API endpoints
- **SQL Injection Protection** - Prisma ORM prevents SQL injection
- **XSS Protection** - React's built-in XSS protection
- **CSRF Protection** - Cookie-based session management
- **Email Enumeration Prevention** - Generic error messages to prevent user enumeration
- **Secure Password Requirements** - Enforced password complexity

### 📊 Database & Data Management
- **PostgreSQL** - Robust relational database
- **Prisma ORM** - Type-safe database access
- **Database Migrations** - Version-controlled schema migrations
- **Relationships** - Proper foreign key relationships with cascading deletes
- **Indexes** - Optimized database indexes for performance
- **Transactions** - Atomic operations for data consistency

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety throughout
- **Tailwind CSS 4** - Utility-first CSS framework
- **shadcn/ui** - High-quality component library
- **React Hook Form** - Form state management
- **Zod** - Schema validation
- **Lucide React** - Icon library
- **date-fns** - Date formatting utilities
- **next-themes** - Theme management

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **better-auth** - Authentication framework
- **better-auth/plugins** - Organization management plugin
- **Prisma** - Database ORM
- **Nodemailer** - Email sending
- **bcryptjs** - Password hashing
- **crypto** - Token generation

### Database
- **PostgreSQL** - Relational database
- **Prisma Migrations** - Schema versioning

### Development Tools
- **TypeScript** - Type checking
- **ESLint** - Code linting
- **Docker Compose** - Local PostgreSQL setup
- **Prisma Studio** - Database GUI

## 📦 Quick Start

### Prerequisites
- Node.js 18+ (recommended: 20+)
- PostgreSQL 12+ (or Docker)
- npm, yarn, or pnpm

### 1. Installation

```bash
# Clone repository
git clone <repository-url>
cd multi-tenant-workspace-app-better-auth-nextjs

# Install dependencies
npm install
```

### 2. Environment Setup

Create `.env.local` in the project root:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/workspace_db"

# better-auth
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="generate-secure-32-char-key-here"

# SMTP (Optional - for email features)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="your-email@gmail.com"

# Optional SMTP Advanced Configuration (for production/Render)
# SMTP_CONNECTION_TIMEOUT="30000"  # Connection timeout in ms
# SMTP_SEND_TIMEOUT="30000"        # Send timeout in ms
# SMTP_MAX_RETRIES="2"             # Retry attempts
# SMTP_REJECT_UNAUTHORIZED="false" # Set to false if you have cert issues
```

Generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Database Setup

**Option A: Using Docker (Recommended)**
```bash
# Start PostgreSQL container
npm run db:up

# Run migrations
npm run db:migrate

# Seed sample data
npm run db:seed
```

**Option B: Local PostgreSQL**
```bash
# Create database
createdb workspace_db

# Run migrations
npm run db:migrate

# Seed sample data
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Login

Use seeded credentials:
- **Email**: admin@example.com
- **Password**: admin123

## 📁 Project Structure

```
multi-tenant-workspace-app-better-auth-nextjs/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...all]/          # better-auth handler
│   │   │   ├── forgot-password/  # Password reset request
│   │   │   ├── reset-password/   # Password reset confirmation
│   │   │   ├── send-verification/ # Resend verification email
│   │   │   ├── send-verification-signup/ # Send verification on signup
│   │   │   └── verify-email/      # Email verification handler
│   │   ├── notifications/
│   │   │   ├── join-request/     # Handle join request actions
│   │   │   └── route.ts          # Notification CRUD
│   │   ├── org/
│   │   │   ├── create/           # Create organization
│   │   │   ├── join/             # Join organization
│   │   │   ├── list/             # List user's organizations
│   │   │   ├── members/          # Member management
│   │   │   └── invitations/
│   │   │       └── accept/       # Accept invitation
│   │   ├── outlines/
│   │   │   ├── [id]/             # Update/Delete outline
│   │   │   └── route.ts          # List/Create outlines
│   │   └── user/
│   │       └── verification-status/ # Check email verification status
│   ├── auth/
│   │   ├── forgot-password/      # Forgot password page
│   │   ├── reset-password/        # Reset password page
│   │   ├── signin/                # Sign in page
│   │   ├── signup/                # Sign up page
│   │   └── verify-email/          # Email verification page
│   ├── workspace/
│   │   ├── [orgId]/
│   │   │   ├── layout.tsx         # Workspace layout with sidebar
│   │   │   ├── page.tsx           # Outline management page
│   │   │   ├── team/              # Team management page
│   │   │   └── not-found.tsx      # Organization not found page
│   │   └── page.tsx               # Organization list page
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                  # Home page (redirects)
│   └── globals.css               # Global styles
├── components/
│   ├── ui/                        # shadcn/ui components
│   ├── email-verification-banner.tsx  # Email verification prompt
│   ├── notifications.tsx         # Notification center component
│   ├── theme-provider.tsx        # Theme context provider
│   └── theme-toggle.tsx          # Theme toggle button
├── hooks/
│   ├── use-mobile.ts             # Mobile detection hook
│   └── use-toast.ts              # Toast notification hook
├── lib/
│   ├── api-response.ts           # Standardized API response utilities
│   ├── auth.ts                   # better-auth server configuration
│   ├── auth-client.ts            # better-auth client configuration
│   ├── auth-utils.ts             # Authorization utilities
│   ├── email.ts                  # Email sending utilities
│   ├── email-templates.ts        # HTML email templates
│   ├── email-validation.ts       # Email validation utilities
│   ├── prisma.ts                 # Prisma client instance
│   ├── utils.ts                  # Utility functions
│   └── validation.ts             # Zod validation schemas
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── migrations/               # Database migrations
├── scripts/
│   └── seed.js                   # Database seeding script
├── public/                       # Static assets
└── package.json                  # Dependencies and scripts
```

## 🗄️ Database Schema

### Core Models

**User**
- User accounts with email/password authentication
- Email verification status
- Relations to sessions, organizations, members, notifications

**Session**
- User session management
- Token-based sessions with expiration
- IP address and user agent tracking
- Active organization tracking

**Organization**
- Multi-tenant organization data
- Unique slug for URL-friendly access
- Owner relationship
- Metadata field for extensibility

**OrganizationMember**
- Join table for User-Organization relationship
- Role: "owner" or "member"
- Unique constraint on (organizationId, userId)

**Outline**
- Project outline items
- Fields: header, sectionType, status, target, limit, reviewer
- Scoped to organization

**Notification**
- User notifications
- Types: join_request, join_accepted, join_rejected, invitation, invitation_accepted, invitation_rejected, organization_deleted
- Read/unread status
- JSON metadata for additional data (expiration dates, organization info, etc.)
- Expiration tracking for invitations and join requests (7 days)

**Verification**
- Email verification tokens
- Password reset tokens
- Token expiration

**Invitation**
- Organization invitations with acceptance workflow
- Status tracking (pending, accepted, rejected, expired)
- Expiration dates (7 days default)
- Email notifications for both existing and new users
- Auto-generated IDs with cuid()

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/sign-up              - Create new user
POST   /api/auth/sign-in              - Authenticate user
POST   /api/auth/sign-out             - Logout user
POST   /api/auth/forgot-password      - Request password reset
POST   /api/auth/reset-password       - Reset password with token
POST   /api/auth/send-verification    - Resend verification email
POST   /api/auth/send-verification-signup - Send verification on signup
POST   /api/auth/verify-email         - Verify email with token
```

### Organizations
```
GET    /api/org/list                  - List user's organizations
POST   /api/org/create                - Create new organization
POST   /api/org/join                  - Join organization (creates request)
DELETE /api/org/delete                - Delete organization (owner only, requires password)
GET    /api/org/members?orgId={id}   - List organization members
POST   /api/org/members               - Invite member (owner only, creates invitation)
DELETE /api/org/members?orgId={id}&userId={id} - Remove member (owner only)
POST   /api/org/invitations/accept   - Accept organization invitation
POST   /api/org/invitations/reject   - Reject organization invitation
GET    /api/org/join-request/action   - Accept/reject join request from email link
```

### Outlines
```
GET    /api/outlines?orgId={id}       - List organization outlines
POST   /api/outlines                  - Create outline
PATCH  /api/outlines/:id               - Update outline
DELETE /api/outlines/:id?orgId={id}   - Delete outline
```

### Notifications
```
GET    /api/notifications             - Get user notifications (with unread count)
PATCH  /api/notifications             - Mark notification(s) as read
POST   /api/notifications/join-request - Accept/reject join request from notification
```

### User
```
GET    /api/user/verification-status  - Check email verification status
```

## 🎯 Key Components

### Authentication Pages
- **Sign In** (`app/auth/signin/page.tsx`) - User login with email/password
- **Sign Up** (`app/auth/signup/page.tsx`) - User registration with validation
- **Forgot Password** (`app/auth/forgot-password/page.tsx`) - Password reset request
- **Reset Password** (`app/auth/reset-password/page.tsx`) - Password reset form
- **Verify Email** (`app/auth/verify-email/page.tsx`) - Email verification page

### Workspace Pages
- **Workspace List** (`app/workspace/page.tsx`) - Organization list with create/join
- **Outline Management** (`app/workspace/[orgId]/page.tsx`) - Full outline CRUD interface
- **Team Management** (`app/workspace/[orgId]/team/page.tsx`) - Member management interface

### UI Components
- **Notifications** (`components/notifications.tsx`) - Real-time notification center
- **Email Verification Banner** (`components/email-verification-banner.tsx`) - Email verification prompt
- **Theme Toggle** (`components/theme-toggle.tsx`) - Dark mode toggle

## 🚀 Development

### Available Commands

```bash
# Development
npm run dev              # Start dev server (port 3000)

# Production
npm run build            # Build for production
npm start                # Start production server

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed sample data
npm run db:studio        # Open Prisma Studio (database GUI)
npm run db:up            # Start PostgreSQL Docker container
npm run db:down          # Stop PostgreSQL Docker container
npm run db:logs          # View PostgreSQL logs

# Code Quality
npm run lint             # Run ESLint
npm run format            # Format code with Prisma
```

### TypeScript

Full TypeScript support with strict mode:
- Typed API routes with proper request/response types
- Typed database models via Prisma
- Typed client hooks and components
- Type-safe validation with Zod

### Form Validation

Uses Zod for schema validation:
- API request validation
- Type-safe validation schemas
- Clear, user-friendly error messages
- Consistent validation across frontend and backend

## 🔒 Security Features

### Implemented
✅ Password hashing with bcryptjs  
✅ Secure session management (7-day expiration)  
✅ API route authentication checks  
✅ Organization membership validation  
✅ Role-based authorization (Owner/Member)  
✅ Input validation with Zod  
✅ Email format and deliverability validation  
✅ SQL injection protection (Prisma ORM)  
✅ XSS protection (React)  
✅ CSRF protection (cookie-based sessions)  
✅ Email enumeration prevention  
✅ Secure password requirements enforcement  
✅ Token-based email verification  
✅ Secure password reset flow  

### Recommended for Production
- Rate limiting on API endpoints
- CORS configuration
- HTTPS enforcement
- Content Security Policy (CSP) headers
- Two-factor authentication (2FA)
- Audit logging
- Regular security audits
- DDoS protection
- API key management
- Webhook signature verification

## 📧 Email Configuration

See [SMTP_SETUP.md](./SMTP_SETUP.md) for detailed email configuration instructions.

Supported providers:
- Gmail (with App Password)
- Outlook/Hotmail
- SendGrid
- Mailgun
- AWS SES

## 🗄️ Database Migrations

Prisma migrations are stored in `prisma/migrations/`. To create new migrations:

```bash
# Create migration after schema changes
npm run db:migrate -- --name add_new_table

# Review migrations
npx prisma migrate diff

# Rollback migration (dev only)
npx prisma migrate resolve --rolled-back
```

## 🚢 Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Environment Variables

Set in Vercel/Render dashboard:

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_URL` - Your deployed URL (e.g., https://yourapp.vercel.app)
- `BETTER_AUTH_SECRET` - Secure 32+ character secret
- `BETTER_AUTH_TRUST_HOST=true` - Trust host header (for production)
- `NODE_ENV=production` - Set to production

**SMTP (Required for email features):**
- `SMTP_HOST` - SMTP server hostname (e.g., smtp.gmail.com)
- `SMTP_PORT` - SMTP port (usually 587)
- `SMTP_SECURE` - Use TLS (false for 587, true for 465)
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password/app password
- `SMTP_FROM` - From email address

**Optional SMTP (for troubleshooting on Render):**
- `SMTP_CONNECTION_TIMEOUT` - Connection timeout in ms (default: 30000)
- `SMTP_SEND_TIMEOUT` - Send timeout in ms (default: 30000)
- `SMTP_MAX_RETRIES` - Retry attempts (default: 2)
- `SMTP_REJECT_UNAUTHORIZED` - Reject unauthorized certs (default: true, set to false if needed)

### Database

Setup managed PostgreSQL:
- **Vercel Postgres** - Integrated with Vercel
- **Neon** - Serverless PostgreSQL
- **Railway** - Easy PostgreSQL hosting
- **Supabase** - PostgreSQL with additional features

After setup:
1. Update `DATABASE_URL` in environment variables
2. Run migrations: `npm run db:migrate`
3. (Optional) Seed data: `npm run db:seed`

## 🐛 Troubleshooting

### "Connection refused" (Database)
- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `.env.local`
- Verify database exists: `psql -l`
- Check Docker container: `docker ps`

### "BETTER_AUTH_SECRET not set"
- Verify `.env.local` exists in project root
- Ensure `BETTER_AUTH_SECRET` is at least 32 characters
- Restart development server after adding

### "Migration pending"
```bash
npm run db:generate
npm run db:migrate
```

### Email not sending
- Check SMTP configuration in `.env.local`
- Verify SMTP credentials are correct
- Check server logs for SMTP errors
- See [SMTP_SETUP.md](./SMTP_SETUP.md) for detailed setup

### Reset Database (⚠️ Deletes all data)
```bash
npx prisma migrate reset
```

## 📚 Documentation

- [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md) - Detailed setup guide
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Complete API reference
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Detailed project structure
- [SMTP_SETUP.md](./SMTP_SETUP.md) - Email configuration guide
- [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Deep implementation documentation
- [better-auth docs](https://better-auth.vercel.app) - Authentication framework
- [Prisma docs](https://www.prisma.io/docs) - Database ORM
- [Next.js docs](https://nextjs.org/docs) - Framework documentation

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 👨‍💻 Author & Contact

**Masresha Alemu**  
*Mid-level Software Engineer*

- 🌐 **Portfolio**: [https://masresha-alemu.netlify.app/](https://masresha-alemu.netlify.app/)
- 💼 **LinkedIn**: [https://www.linkedin.com/in/masresha-a-851241232/](https://www.linkedin.com/in/masresha-a-851241232/)
- 📧 **Email**: masrialemuai@gmail.com
- 📱 **Phone**: +251979742762

For questions, collaborations, or inquiries, feel free to reach out!

## 👨‍💻 Author

**Masresha Alemu**  
*Mid-level Software Engineer*

- 🌐 **Portfolio**: [https://masresha-alemu.netlify.app/](https://masresha-alemu.netlify.app/)
- 💼 **LinkedIn**: [https://www.linkedin.com/in/masresha-a-851241232/](https://www.linkedin.com/in/masresha-a-851241232/)
- 📧 **Email**: masrialemuai@gmail.com
- 📱 **Phone**: +251979742762

## 🆘 Support

For issues and questions:
1. Check existing issues
2. Review documentation files
3. Check troubleshooting section
4. Create detailed bug report with reproduction steps
5. Contact the author via email or LinkedIn

## 🗺️ Roadmap

### Completed ✅
- ✅ Email verification system
- ✅ Password reset functionality
- ✅ Join request system with notifications and email links
- ✅ Real-time notification center with expiration handling
- ✅ Email templates with action links
- ✅ Email validation
- ✅ Organization slug system
- ✅ Role-based access control
- ✅ Dark mode support
- ✅ Organization deletion with password verification
- ✅ Invitation rejection functionality
- ✅ Join request expiration (7 days)
- ✅ Invitation expiration (7 days)
- ✅ Multiple join requests allowed
- ✅ Email action links for accepting/rejecting requests
- ✅ Organization deletion notifications
- ✅ Notification expiration indicators

### Planned 🚧
- [ ] Two-factor authentication (2FA)
- [ ] Organization settings page
- [ ] Advanced role management (custom roles)
- [ ] Bulk outline operations
- [ ] Outline templates
- [ ] Activity logging and audit trail
- [ ] User preferences and settings
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Integration tests
- [ ] Performance monitoring
- [ ] Webhook support
- [ ] File uploads for organizations
- [ ] Advanced search and filtering
- [ ] Export/import functionality
