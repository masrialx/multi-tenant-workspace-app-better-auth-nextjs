# Workspace Application API Documentation

## Authentication

### Sign Up
**POST** `/api/auth/sign-up`

Create a new user account.

**Request:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "secure_password",
  "name": "User Name"
}
\`\`\`

**Response:**
\`\`\`json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name"
  },
  "session": {
    "token": "session_token"
  }
}
\`\`\`

### Sign In
**POST** `/api/auth/sign-in`

Authenticate with email and password.

**Request:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "secure_password"
}
\`\`\`

**Response:**
\`\`\`json
{
  "user": { ... },
  "session": { ... }
}
\`\`\`

## Organization Management

### Create Organization
**POST** `/api/org/create`

Create a new organization. The authenticated user becomes the organization owner.

**Request:**
\`\`\`json
{
  "name": "Organization Name"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "organization": {
      "id": "org_id",
      "name": "Organization Name",
      "slug": "organization-name",
      "ownerId": "user_id"
    }
  },
  "message": "Organization created successfully"
}
\`\`\`

**Behavior:**
- Generates URL-safe slug from organization name
- Creates organization with user as owner
- Automatically adds owner as organization member
- Slug must be unique

**Error Cases:**
- 401: Unauthorized
- 400: Invalid name, slug already exists

### List Organizations
**GET** `/api/org/list`

Get all organizations the authenticated user belongs to.

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "organizations": [
      {
        "id": "org_id",
        "name": "Organization Name",
        "slug": "organization-name",
        "role": "owner"
      }
    ]
  }
}
\`\`\`

### Join Organization
**POST** `/api/org/join`

Join an organization by providing its slug. Creates a join request that the organization owner must approve. Users can send multiple join requests (no duplicate prevention).

**Request:**
\`\`\`json
{
  "slug": "organization-slug"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "organization": {
      "id": "org_id",
      "name": "Organization Name",
      "slug": "organization-slug"
    }
  },
  "message": "Join request sent. The organization owner will be notified via email and notification."
}
\`\`\`

**Behavior:**
- Normalizes and validates organization slug
- Finds organization by slug
- Checks if user is already a member (prevents duplicate membership)
- Allows multiple join requests (no duplicate prevention)
- Creates notification for organization owner
- Sends email to owner with accept link
- Join request expires in 7 days

**Error Cases:**
- 401: Unauthorized
- 400: Invalid slug, already a member
- 404: Organization not found

### Get Organization Members
**GET** `/api/org/members?orgId={orgId}`

Get all members of an organization. Requires authenticated user and membership in the organization.

**Response:**
\`\`\`json
{
  "members": [
    {
      "id": "member_id",
      "role": "owner",
      "user": {
        "id": "user_id",
        "name": "User Name",
        "email": "user@example.com",
        "image": null
      }
    }
  ]
}
\`\`\`

### Invite Organization Member
**POST** `/api/org/members`

Invite a new member to an organization by email. Creates an invitation that the user must accept before joining. Only organization owner can perform this action.

**Request:**
\`\`\`json
{
  "orgId": "org_id",
  "email": "newmember@example.com",
  "role": "member"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "invitation": {
      "id": "invitation_id",
      "email": "newmember@example.com",
      "status": "pending"
    }
  },
  "message": "Invitation sent successfully. The user will be notified."
}
\`\`\`

**Behavior:**
- Creates an invitation record (not directly adds member)
- If user exists: Sends notification and email invitation with accept/reject links
- If user doesn't exist: Sends email invitation (user can sign up and accept later)
- Invitation expires in 7 days
- Updates existing unread invitation notifications instead of creating duplicates
- Email includes expiration information (7 days)

**Error Cases:**
- 401: Unauthorized (not logged in)
- 403: Forbidden (not organization owner)
- 400: Invalid email format, user already member, or invitation already exists
- 404: Organization not found

### Remove Organization Member
**DELETE** `/api/org/members?orgId={orgId}&userId={userId}`

Remove a member from an organization. Only organization owner can perform this action.

**Response:**
\`\`\`json
{
  "success": true
}
\`\`\`

**Error Cases:**
- 401: Unauthorized
- 403: Forbidden (not organization owner)
- 400: Missing required parameters

### Accept Organization Invitation
**POST** `/api/org/invitations/accept`

Accept an organization invitation. User must be authenticated and the invitation email must match the user's email.

**Request:**
\`\`\`json
{
  "invitationId": "invitation_id"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "organization": {
      "id": "org_id",
      "name": "Organization Name"
    },
    "member": {
      "userId": "user_id",
      "organizationId": "org_id",
      "role": "member"
    }
  },
  "message": "Successfully joined \"Organization Name\""
}
\`\`\`

**Behavior:**
- Validates invitation (expiration, status, email match)
- Adds user as organization member
- Updates invitation status to "accepted"
- Creates notifications for both user and owner
- Sends email notification to organization owner

**Error Cases:**
- 401: Unauthorized (not logged in)
- 400: Invitation expired, already accepted/rejected, or email mismatch
- 404: Invitation not found

### Reject Organization Invitation
**POST** `/api/org/invitations/reject`

Reject an organization invitation. User must be authenticated and the invitation email must match the user's email.

**Request:**
\`\`\`json
{
  "invitationId": "invitation_id"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Invitation declined successfully"
}
\`\`\`

**Behavior:**
- Validates invitation (status, email match)
- Updates invitation status to "rejected"
- Marks related notification as read
- Creates notification for organization owner
- Prevents duplicate rejections

**Error Cases:**
- 401: Unauthorized (not logged in)
- 400: Invitation already accepted/rejected, or email mismatch
- 404: Invitation not found

### Delete Organization
**DELETE** `/api/org/delete`

Delete an organization. Only the organization owner can perform this action, and password verification is required.

**Request:**
\`\`\`json
{
  "orgId": "org_id",
  "password": "user_password"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Organization \"Organization Name\" has been deleted successfully"
}
\`\`\`

**Behavior:**
- Verifies user is the organization owner
- Verifies password using better-auth sign-in API
- Creates notifications for all members and owner about deletion
- Sends email notifications to all members and owner
- Deletes organization (cascade deletes related records)

**Error Cases:**
- 401: Unauthorized (not logged in)
- 403: Forbidden (not organization owner)
- 400: Incorrect password, missing password, or organization not found
- 404: Organization not found

### Join Request Action (Email Link)
**GET** `/api/org/join-request/action?notificationId={id}&action={accept|reject}`

Accept or reject a join request directly from an email link. This endpoint redirects to the workspace page with success/error messages.

**Query Parameters:**
- `notificationId` (required): Notification ID for the join request
- `action` (required): Either "accept" or "reject"

**Behavior:**
- Validates notification exists and is a join request
- Checks if request is already processed
- Validates expiration (7 days)
- Verifies organization owner permissions
- Processes accept/reject action
- Redirects to workspace with message

**Redirect URLs:**
- Success: `/workspace?message=Join request accepted successfully`
- Error: `/workspace?error=Error message`

**Error Cases:**
- Redirects with error if notification not found
- Redirects with error if already processed
- Redirects with error if expired
- Redirects with error if invalid permissions

## Outline Management

### Get Organization Outlines
**GET** `/api/outlines?orgId={orgId}`

Get all outlines for an organization. User must be a member of the organization.

**Query Parameters:**
- `orgId` (required): Organization ID

**Response:**
\`\`\`json
{
  "outlines": [
    {
      "id": "outline_id",
      "header": "Project Overview",
      "sectionType": "Table of Contents",
      "status": "Completed",
      "target": 100,
      "limit": 100,
      "reviewer": "Assim",
      "organizationId": "org_id",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
\`\`\`

### Create Outline
**POST** `/api/outlines`

Create a new outline in an organization.

**Request:**
\`\`\`json
{
  "orgId": "org_id",
  "header": "Technical Architecture",
  "sectionType": "Technical Approach",
  "status": "In-Progress",
  "target": 80,
  "limit": 100,
  "reviewer": "Bini"
}
\`\`\`

**Field Definitions:**
- `header` (string, required): Title of the outline
- `sectionType` (enum, required): 
  - "Table of Contents"
  - "Executive Summary"
  - "Technical Approach"
  - "Design"
  - "Capabilities"
  - "Focus Document"
  - "Narrative"
- `status` (enum, default: "Pending"):
  - "Pending"
  - "In-Progress"
  - "Completed"
- `target` (number, minimum: 1): Target value (must be positive integer, minimum 1)
- `limit` (number, minimum: 1): Limit value (must be positive integer, minimum 1)

**Target/Limit Input Behavior:**
- Supports free keyboard input while editing
- Field can be completely cleared (empty state allowed during editing)
- Real-time validation: Shows "Negative values are not supported" error message in red text below input
- Minimum value enforcement: Values less than 1 are automatically corrected to 1 on field blur
- Arrow key support: Use ↑/↓ keys for quick increment/decrement
- Validation: Negative values and zero are not allowed (minimum: 1)
- `reviewer` (enum, default: "Assim"):
  - "Assim"
  - "Bini"
  - "Mami"

**Response:**
\`\`\`json
{
  "outline": {
    "id": "outline_id",
    "header": "Technical Architecture",
    "sectionType": "Technical Approach",
    "status": "In-Progress",
    "target": 80,
    "limit": 100,
    "reviewer": "Bini",
    "organizationId": "org_id",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
\`\`\`

### Update Outline
**PATCH** `/api/outlines/{id}`

Update an existing outline. All fields are optional.

**Request:**
\`\`\`json
{
  "orgId": "org_id",
  "header": "Updated Title",
  "status": "Completed",
  "target": 100
}
\`\`\`

**Response:**
\`\`\`json
{
  "outline": { ... }
}
\`\`\`

### Delete Outline
**DELETE** `/api/outlines/{id}?orgId={orgId}`

Delete an outline from an organization.

**Query Parameters:**
- `orgId` (required): Organization ID to verify access

**Response:**
\`\`\`json
{
  "success": true
}
\`\`\`

### Get Notifications
**GET** `/api/notifications`

Get all notifications for the authenticated user.

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notification_id",
        "type": "join_request",
        "title": "New Join Request",
        "message": "User wants to join \"Organization Name\"",
        "read": false,
        "metadata": "{\"organizationId\":\"...\",\"expiresAt\":\"...\",\"daysUntilExpiration\":7}",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "unreadCount": 5
  }
}
\`\`\`

**Notification Types:**
- `join_request` - New join request (expires in 7 days)
- `join_accepted` - Join request accepted
- `join_rejected` - Join request rejected
- `invitation` - Organization invitation (expires in 7 days)
- `invitation_accepted` - Invitation accepted
- `invitation_rejected` - Invitation rejected
- `organization_deleted` - Organization deleted

**Metadata Fields:**
- `organizationId` - Organization ID
- `organizationName` - Organization name
- `requestingUserId` - User ID (for join requests)
- `invitationId` - Invitation ID (for invitations)
- `expiresAt` - Expiration date (ISO string)
- `daysUntilExpiration` - Days until expiration

### Mark Notification as Read
**PATCH** `/api/notifications`

Mark one or all notifications as read.

**Request (Single):**
\`\`\`json
{
  "notificationId": "notification_id"
}
\`\`\`

**Request (All):**
\`\`\`json
{
  "markAllAsRead": true
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Notification marked as read"
}
\`\`\`

### Accept/Reject Join Request
**POST** `/api/notifications/join-request`

Accept or reject a join request from a notification. Only organization owners can perform this action.

**Request:**
\`\`\`json
{
  "notificationId": "notification_id",
  "action": "accept"
}
\`\`\`

**Actions:**
- `accept` - Accept the join request
- `reject` - Reject the join request

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Join request accepted"
}
\`\`\`

**Behavior:**
- Validates notification and ownership
- Checks expiration (7 days)
- Adds user as member (if accept)
- Updates notification status
- Creates notification for requester
- Sends email to requester

**Error Cases:**
- 401: Unauthorized
- 403: Forbidden (not organization owner)
- 400: Notification not found, already processed, or expired
- 404: Notification not found

## Error Responses

All endpoints return error responses in this format:

\`\`\`json
{
  "error": "Error description"
}
\`\`\`

### Common HTTP Status Codes

- **200 OK**: Request succeeded
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: User not authenticated
- **403 Forbidden**: User doesn't have permission for this action
- **500 Internal Server Error**: Server error

## Authentication

All endpoints (except sign-up and sign-in) require:
1. Valid session token in cookies (set by better-auth)
2. User to be authenticated

The session cookie is automatically managed by better-auth and is included in all requests.

## Rate Limiting

Currently no rate limiting is implemented. For production, implement:
- Per-user rate limiting
- Per-IP rate limiting
- API key-based rate limiting

## Pagination

Pagination is not implemented. For production, add:
- `limit` and `offset` query parameters
- `total` count in responses
- Cursor-based pagination for large datasets

## Field Validation

### Required Fields
- `email`: Valid email format
- `password`: Minimum 8 characters (recommended)
- `header`: Non-empty string
- `orgId`: Valid UUID format

### Optional Validation
- `name`: 1-255 characters
- `target` and `limit`: Non-negative integers
- `sectionType`, `status`, `reviewer`: Valid enum values only

---

## Author

**Masresha Alemu**  
*Mid-level Software Engineer*

- 🌐 **Portfolio**: [https://masresha-alemu.netlify.app/](https://masresha-alemu.netlify.app/)
- 💼 **LinkedIn**: [https://www.linkedin.com/in/masresha-a-851241232/](https://www.linkedin.com/in/masresha-a-851241232/)
- 📧 **Email**: masrialemuai@gmail.com
- 📱 **Phone**: +251979742762
