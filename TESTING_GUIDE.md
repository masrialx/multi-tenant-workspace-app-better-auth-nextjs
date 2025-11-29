# Testing Guide

## Manual Testing Scenarios

### 1. Authentication Flow

#### Sign Up
1. Navigate to http://localhost:3000
2. Click "Sign up" link
3. Fill in:
   - Name: "Test User"
   - Email: "test@example.com"
   - Password: "TestPassword123"
4. Click "Sign Up"
5. Verify redirect to workspace page

#### Sign In
1. Navigate to http://localhost:3000/auth/signin
2. Fill in:
   - Email: "admin@example.com"
   - Password: "admin123"
3. Click "Sign In"
4. Verify redirect to workspace page

#### Sign Out
1. Sign in (see above)
2. Click sign-out button in sidebar
3. Verify redirect to sign-in page

### 2. Workspace Management

#### View Organizations
1. Sign in as admin
2. Should see "Demo Organization" card
3. Click on organization card
4. Should navigate to outlines page

#### Create Organization (Not Implemented)
1. Click "Create Organization" button
2. Enter organization name
3. Should create and display organization

#### Join Organization (Not Implemented)
1. Click "Join Organization" button
2. Enter organization slug
3. Should join organization if exists

### 3. Outline CRUD

#### View Outlines
1. Click on organization
2. Should see outline table with columns:
   - Header
   - Section Type
   - Status
   - Target
   - Limit
   - Reviewer
   - Actions

#### Add Outline
1. Click "Add Outline" button
2. Fill in form:
   - Header: "Test Outline"
   - Section Type: "Design"
   - Status: "Pending"
   - Target: 50
   - Limit: 100
   - Reviewer: "Bini"
3. Click "Create Outline"
4. Verify outline appears in table

#### Edit Outline
1. Click Edit icon (pencil) on outline row
2. Modify fields
3. Click "Update Outline"
4. Verify changes in table

#### Delete Outline
1. Click Delete icon (trash) on outline row
2. Confirm deletion
3. Verify outline removed from table

### 4. Team Management

#### View Team Members
1. Click "Team" in sidebar
2. Should see list of team members
3. Members should show:
   - Name
   - Email
   - Role (Owner/Member)
   - Actions (if owner)

#### Invite Member (Owner Only)
1. As organization owner, click "Invite Member"
2. Enter email: "newmember@example.com"
3. Click "Send Invite"
4. Verify new member appears in list
5. Switch to new member account
6. Should see organization in workspace

#### Remove Member (Owner Only)
1. As organization owner, click trash icon on member
2. Confirm removal
3. Verify member removed from list
4. New member no longer sees organization

### 5. Role-Based Access Control

#### Owner Permissions
- Can view all outlines
- Can create outlines
- Can edit outlines
- Can delete outlines
- Can view team members
- Can invite members
- Can remove members

#### Member Permissions
- Can view all outlines
- Can create outlines
- Can edit outlines
- Can delete outlines
- Can view team members
- Cannot invite members
- Cannot remove members

### 6. API Testing

#### Test with cURL

##### Sign Up
\`\`\`bash
curl -X POST http://localhost:3000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "apitest@example.com",
    "password": "ApiTestPassword123",
    "name": "API Test User"
  }'
\`\`\`

##### Get Organization Members
\`\`\`bash
curl -X GET "http://localhost:3000/api/org/members?orgId=ORG_ID" \
  -H "Cookie: better-auth.session_token=SESSION_TOKEN"
\`\`\`

##### Create Outline
\`\`\`bash
curl -X POST http://localhost:3000/api/outlines \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=SESSION_TOKEN" \
  -d '{
    "orgId": "ORG_ID",
    "header": "API Test Outline",
    "sectionType": "Executive Summary",
    "status": "In-Progress",
    "target": 75,
    "limit": 100,
    "reviewer": "Assim"
  }'
\`\`\`

##### Get Outlines
\`\`\`bash
curl -X GET "http://localhost:3000/api/outlines?orgId=ORG_ID" \
  -H "Cookie: better-auth.session_token=SESSION_TOKEN"
\`\`\`

### 7. Database Verification

#### Check Data in Prisma Studio
\`\`\`bash
npm run db:studio
\`\`\`

Then verify:
- Users table has created users
- Organizations table has created org
- OrganizationMembers table has membership records
- Outlines table has created outlines

#### Query with Prisma CLI
\`\`\`bash
# Show user count
npx prisma db execute --stdin < <(echo "SELECT COUNT(*) FROM \"User\";")

# Show organizations
npx prisma db execute --stdin < <(echo "SELECT * FROM \"Organization\";")
\`\`\`

## Testing Checklist

### Authentication
- [ ] User can sign up with valid email/password
- [ ] User cannot sign up with duplicate email
- [ ] User cannot sign up with weak password
- [ ] User can sign in with correct credentials
- [ ] User cannot sign in with incorrect credentials
- [ ] User can sign out
- [ ] Session persists on page reload
- [ ] Unauthenticated user redirected to sign-in

### Organization & Team
- [ ] Owner can view organization
- [ ] Members can view organization
- [ ] Non-member cannot access organization
- [ ] Owner can invite members
- [ ] New member can access organization after invite
- [ ] Owner can remove members
- [ ] Removed member cannot access organization
- [ ] Organization shows in member's workspace list

### Outline CRUD
- [ ] All users can view outlines
- [ ] Users can create outlines
- [ ] Users can edit own outlines
- [ ] Users can delete own outlines
- [ ] Outlines are scoped to organization
- [ ] All section types available
- [ ] All status options available
- [ ] All reviewer options available
- [ ] Target and limit are numeric

### Security
- [ ] Unauthenticated requests to API rejected
- [ ] User cannot access other org data
- [ ] Non-owner cannot invite members
- [ ] Non-owner cannot remove members
- [ ] API validates input
- [ ] Organization membership verified on requests
- [ ] Session token required in cookies

### UI/UX
- [ ] Forms validate input
- [ ] Error messages display correctly
- [ ] Success messages display correctly
- [ ] Loading states visible
- [ ] Mobile responsive
- [ ] Navigation works correctly
- [ ] Sheet dialogs open/close properly
- [ ] Tables display data correctly

## Performance Testing

### Load Testing
\`\`\`bash
# Using Apache Bench
ab -n 100 -c 10 http://localhost:3000/api/outlines?orgId=TEST

# Using wrk
wrk -t4 -c10 -d30s http://localhost:3000/api/outlines?orgId=TEST
\`\`\`

### Database Query Performance
Monitor in Prisma Studio:
- Slow queries
- N+1 problems
- Missing indexes

## Debugging

### Enable Debug Logging
\`\`\`bash
# In terminal
export DEBUG="*"
npm run dev
\`\`\`

### Browser DevTools
1. Open Chrome DevTools (F12)
2. Check Network tab for API requests
3. Check Console for JavaScript errors
4. Check Application tab for cookies

### Prisma Debug
\`\`\`bash
export DEBUG="prisma:*"
npm run dev
\`\`\`

## Known Limitations & TODOs

- [ ] Email invitations not actually sent
- [ ] No email verification
- [ ] Organization creation/joining not fully implemented
- [ ] No pagination on lists
- [ ] No search functionality
- [ ] No bulk operations
- [ ] No activity logging
- [ ] No rate limiting

## Continuous Integration

### GitHub Actions Example
\`\`\`yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - run: npm ci
      - run: npm run db:migrate
      - run: npm run build
\`\`\`
