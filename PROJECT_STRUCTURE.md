# Project Structure

\`\`\`
workspace-app/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [auth]/
│   │   │       └── route.ts              # better-auth handler
│   │   ├── org/
│   │   │   ├── create/
│   │   │   │   └── route.ts              # Create organization
│   │   │   ├── delete/
│   │   │   │   └── route.ts              # Delete organization (owner only)
│   │   │   ├── join/
│   │   │   │   └── route.ts              # Join organization (creates request)
│   │   │   ├── join-request/
│   │   │   │   └── action/
│   │   │   │       └── route.ts          # Accept/reject join request from email
│   │   │   ├── list/
│   │   │   │   └── route.ts              # List user's organizations
│   │   │   ├── members/
│   │   │   │   └── route.ts              # Team member CRUD
│   │   │   └── invitations/
│   │   │       ├── accept/
│   │   │       │   └── route.ts          # Accept invitation
│   │   │       └── reject/
│   │   │           └── route.ts          # Reject invitation
│   │   └── outlines/
│   │       ├── route.ts                  # Outline CRUD
│   │       └── [id]/
│   │           └── route.ts              # Update/Delete outline
│   ├── auth/
│   │   ├── signin/
│   │   │   └── page.tsx                  # Sign in page
│   │   └── signup/
│   │       └── page.tsx                  # Sign up page
│   ├── workspace/
│   │   ├── page.tsx                      # Workspace list page
│   │   └── [orgId]/
│   │       ├── layout.tsx                # Workspace layout with sidebar
│   │       ├── page.tsx                  # Outline table page
│   │       └── team/
│   │           └── page.tsx              # Team management page
│   ├── page.tsx                          # Root redirect
│   ├── layout.tsx                        # Root layout
│   └── globals.css                       # Global styles
├── components/
│   └── ui/                               # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── table.tsx
│       ├── sheet.tsx
│       ├── dialog.tsx
│       ├── select.tsx
│       ├── sidebar.tsx
│       └── ... (other shadcn components)
├── hooks/
│   ├── use-toast.ts                      # Toast notifications
│   └── use-mobile.tsx                    # Mobile detection
├── lib/
│   ├── auth.ts                           # better-auth server config
│   ├── auth-client.ts                    # better-auth client config
│   └── utils.ts                          # Utility functions
├── prisma/
│   ├── schema.prisma                     # Database schema
│   └── migrations/                       # Database migrations
├── scripts/
│   └── seed.js                           # Database seeding script
├── public/
│   └── ...                               # Static assets
├── .env.local                            # Environment variables (local)
├── package.json                          # Dependencies and scripts
├── tsconfig.json                         # TypeScript configuration
├── next.config.mjs                       # Next.js configuration
├── SETUP_INSTRUCTIONS.md                 # Setup guide
├── API_DOCUMENTATION.md                  # API documentation
└── PROJECT_STRUCTURE.md                  # This file
\`\`\`

## File Descriptions

### API Routes (`app/api/`)

#### `auth/[auth]/route.ts`
- Handles all better-auth authentication routes
- Manages sign-up, sign-in, sign-out
- Handles session management

#### `org/create/route.ts`
- POST: Create new organization with auto-generated slug

#### `org/delete/route.ts`
- DELETE: Delete organization (owner only, requires password verification)

#### `org/join/route.ts`
- POST: Join organization by slug (creates join request)

#### `org/join-request/action/route.ts`
- GET: Accept/reject join request from email link (redirects to workspace)

#### `org/list/route.ts`
- GET: List all organizations user belongs to

#### `org/members/route.ts`
- GET: Fetch organization members
- POST: Invite new member (creates invitation)
- DELETE: Remove member from organization

#### `org/invitations/accept/route.ts`
- POST: Accept organization invitation

#### `org/invitations/reject/route.ts`
- POST: Reject organization invitation

#### `notifications/route.ts`
- GET: Fetch user notifications with unread count
- PATCH: Mark notification(s) as read

#### `notifications/join-request/route.ts`
- POST: Accept/reject join request from notification

#### `outlines/route.ts`
- GET: Fetch all outlines for an organization
- POST: Create new outline

#### `outlines/[id]/route.ts`
- PATCH: Update outline
- DELETE: Delete outline

### Pages (`app/`)

#### Authentication Pages
- `auth/signin/page.tsx` - User sign in form
- `auth/signup/page.tsx` - User registration form

#### Workspace Pages
- `workspace/page.tsx` - List of user organizations
- `workspace/[orgId]/page.tsx` - Outline table for organization
- `workspace/[orgId]/team/page.tsx` - Team member management

### Configuration Files

#### `prisma/schema.prisma`
Defines database models:
- User: User accounts and authentication
- Session: User sessions
- Account: OAuth accounts (if needed)
- Verification: Email verification tokens
- Organization: Org information
- OrganizationMember: Org membership with roles
- Invitation: Organization invitations with status tracking
- Outline: Outline items

#### `lib/auth.ts`
Server-side better-auth configuration:
- Database adapter setup
- Email/password authentication
- Organization plugin configuration
- Session management
- Callbacks for auth events

#### `lib/auth-client.ts`
Client-side better-auth setup:
- Client initialization
- Organization client plugin
- Exports for use in components

### Database

#### Migrations
Auto-generated by Prisma when running `npm run db:migrate`

#### Seed Script
`scripts/seed.js` - Creates initial data:
- Admin user
- Demo organization
- Sample outlines

## Dependencies

### Core
- `next`: Next.js framework
- `react`: React library
- `react-dom`: React DOM
- `typescript`: TypeScript support

### Authentication & Database
- `better-auth`: Authentication library
- `@better-auth/plugins`: Organization plugin
- `@prisma/client`: Database ORM
- `prisma`: Database toolkit
- `bcryptjs`: Password hashing

### UI & Styling
- `tailwindcss`: Utility CSS framework
- `lucide-react`: Icon library
- `shadcn/ui`: Component library

### Utilities
- `react-hook-form`: Form management
- `@hookform/resolvers`: Form validation resolvers
- `zod`: Schema validation
- `zustand`: State management
- `@tanstack/react-query`: Data fetching
- `swr`: Data fetching alternative
- `js-cookie`: Cookie management
- `jose`: JWT handling

## Environment Variables

Required for local development:

\`\`\`env
# Database connection
DATABASE_URL="postgresql://user:password@host:port/database"

# better-auth configuration
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="min-32-char-secret-key"
\`\`\`

Optional for production:

\`\`\`env
# Enable production mode
BETTER_AUTH_TRUST_HOST="true"
NODE_ENV="production"
\`\`\`

## Development Workflow

1. **Clone repository**
   \`\`\`bash
   git clone <repo>
   cd workspace-app
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Setup environment**
   \`\`\`bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   \`\`\`

4. **Setup database**
   \`\`\`bash
   npm run db:migrate
   npm run db:seed
   \`\`\`

5. **Start development server**
   \`\`\`bash
   npm run dev
   \`\`\`

6. **Open in browser**
   \`\`\`
   http://localhost:3000

## Author

**Masresha Alemu**  
*Mid-level Software Engineer*

- 🌐 **Portfolio**: [https://masresha-alemu.netlify.app/](https://masresha-alemu.netlify.app/)
- 💼 **LinkedIn**: [https://www.linkedin.com/in/masresha-a-851241232/](https://www.linkedin.com/in/masresha-a-851241232/)
- 📧 **Email**: masrialemuai@gmail.com
- 📱 **Phone**: +251979742762
