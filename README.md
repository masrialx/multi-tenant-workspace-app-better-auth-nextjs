# Multi-Tenant Workspace Application

A complete multi-tenant workspace application built with **Next.js 15**, **better-auth**, **Prisma**, **PostgreSQL**, and **shadcn/ui**. Features organization management, team collaboration, and outline tracking with granular role-based access control.

## Features

### Authentication
- Email & password authentication with better-auth
- Secure password hashing with bcryptjs
- Session management with cookies
- Sign up and sign in pages

### Multi-Tenant Organization System
- Create and manage multiple organizations
- Join organizations
- Organization ownership and member management
- Automatic owner role for organization creator

### Team Management
- Invite team members by email
- Role-based access control (Owner/Member)
- Owner-only member removal
- Organization member listing

### Outline Management
- Full CRUD for outline items
- Outline fields: header, section type, status, target, limit, reviewer
- Status tracking: Pending, In-Progress, Completed
- Reviewer assignment: Assim, Bini, Mami
- Organization-scoped access

### Security
- Role-based authorization on API routes
- Organization membership validation
- Protected routes
- Secure API endpoints with proper validation

## Tech Stack

### Frontend
- **Next.js 15** - App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **shadcn/ui** - Component library
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Backend
- **Next.js API Routes** - Serverless API
- **better-auth** - Authentication framework
- **better-auth plugins** - Organization management

### Database
- **PostgreSQL** - Relational database
- **Prisma** - ORM and database toolkit
- **Prisma migrations** - Schema versioning

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm, yarn, or pnpm

### 1. Installation

\`\`\`bash
# Clone repository
git clone <repository-url>
cd workspace-app

# Install dependencies
npm install
\`\`\`

### 2. Environment Setup

Create `.env.local`:

\`\`\`env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/workspace_db"

# better-auth
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="generate-secure-32-char-key-here"
\`\`\`

Generate a secure secret:
\`\`\`bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
\`\`\`

### 3. Database Setup

\`\`\`bash
# Create database
createdb workspace_db

# Run migrations
npm run db:migrate

# Seed sample data
npm run db:seed
\`\`\`

### 4. Start Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000)

### 5. Login

Use seeded credentials:
- **Email**: admin@example.com
- **Password**: admin123

## Project Structure

\`\`\`
src/
├── app/
│   ├── api/              # API routes (auth, org, outlines)
│   ├── auth/             # Authentication pages
│   └── workspace/        # Workspace pages (outlines, team)
├── components/ui/        # shadcn/ui components
├── hooks/                # React hooks
├── lib/                  # Core libraries (auth config)
├── prisma/               # Database schema & migrations
└── scripts/              # Seeding scripts
\`\`\`

## Database Schema

### User
- User accounts with email/password authentication
- Relations to sessions, organizations, and team memberships

### Organization
- Multi-tenant organization data
- Owner relationship to User
- Related outlines and members

### OrganizationMember
- Join table for User-Organization relationship
- Role field: "owner" or "member"
- Unique constraint on (organizationId, userId)

### Outline
- Project outline items
- Fields: header, sectionType, status, target, limit, reviewer
- Scoped to organization

### Session
- User session management
- Token-based sessions with expiration

## API Endpoints

### Authentication
\`\`\`
POST   /api/auth/sign-up      - Create new user
POST   /api/auth/sign-in      - Authenticate user
POST   /api/auth/sign-out     - Logout user
\`\`\`

### Organization Members
\`\`\`
GET    /api/org/members       - List org members
POST   /api/org/members       - Invite member (owner only)
DELETE /api/org/members       - Remove member (owner only)
\`\`\`

### Outlines
\`\`\`
GET    /api/outlines          - List outlines
POST   /api/outlines          - Create outline
PATCH  /api/outlines/:id      - Update outline
DELETE /api/outlines/:id      - Delete outline
\`\`\`

## Key Components

### Authentication Pages
- **Sign In** (`app/auth/signin/page.tsx`) - User login
- **Sign Up** (`app/auth/signup/page.tsx`) - User registration

### Workspace Pages
- **Workspace List** (`app/workspace/page.tsx`) - Organization list
- **Outline Table** (`app/workspace/[orgId]/page.tsx`) - Main outline CRUD interface
- **Team Page** (`app/workspace/[orgId]/team/page.tsx`) - Member management

### Layout
- **Workspace Layout** (`app/workspace/[orgId]/layout.tsx`) - Sidebar navigation with org context

## Development

### Available Commands

\`\`\`bash
# Development
npm run dev              # Start dev server

# Production
npm run build            # Build for production
npm start                # Start production server

# Database
npm run db:migrate       # Run migrations
npm run db:generate      # Generate Prisma client
npm run db:seed          # Seed sample data
npm run db:studio        # Open Prisma Studio

# Linting
npm run lint             # Run ESLint
\`\`\`

### TypeScript

Full TypeScript support with strict mode:
- Typed API routes
- Typed database models (via Prisma)
- Typed client hooks

### Form Validation

Uses Zod for schema validation:
- API request validation
- Type-safe validation
- Clear error messages

## Security Considerations

### Implemented
✅ Password hashing with bcryptjs
✅ Secure session management
✅ API route authentication checks
✅ Organization membership validation
✅ Role-based authorization
✅ Input validation with Zod

### Recommended for Production
- Rate limiting on API endpoints
- CORS configuration
- HTTPS enforcement
- CSP headers
- Email verification
- 2FA support
- Audit logging
- Regular security audits

## Database Migrations

Prisma migrations are stored in `prisma/migrations/`. To create new migrations:

\`\`\`bash
# Create migration after schema changes
npm run db:migrate -- --name add_new_table

# Review migrations
npx prisma migrate diff

# Rollback migration (dev only)
npx prisma migrate resolve --rolled-back
\`\`\`

## Deployment

### Deploy to Vercel

\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
\`\`\`

### Environment Variables
Set in Vercel dashboard:
- DATABASE_URL
- BETTER_AUTH_URL (set to your deployed URL)
- BETTER_AUTH_SECRET
- BETTER_AUTH_TRUST_HOST=true

### Database
- Setup managed PostgreSQL (Vercel Postgres, Neon, Railway, etc.)
- Update DATABASE_URL
- Run migrations on production database

## Troubleshooting

### "Connection refused"
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env.local

### "BETTER_AUTH_SECRET not set"
- Verify .env.local exists in project root
- Ensure BETTER_AUTH_SECRET is at least 32 characters

### "Migration pending"
\`\`\`bash
npm run db:generate
npm run db:migrate
\`\`\`

### Reset Database (⚠️ Deletes all data)
\`\`\`bash
npx prisma migrate reset
\`\`\`

## Contributing

1. Create feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. Open Pull Request

## Documentation

- [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md) - Detailed setup guide
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API reference
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Detailed structure
- [better-auth docs](https://better-auth.vercel.app) - Authentication framework
- [Prisma docs](https://www.prisma.io/docs) - Database ORM
- [Next.js docs](https://nextjs.org/docs) - Framework

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check existing issues
2. Review documentation
3. Create detailed bug report with reproduction steps

## Roadmap

- [ ] Email notifications for invites
- [ ] Organization settings page
- [ ] Advanced role management
- [ ] Bulk outline operations
- [ ] Outline templates
- [ ] Activity logging
- [ ] User preferences
- [ ] API documentation (Swagger)
- [ ] Integration tests
- [ ] Performance monitoring
