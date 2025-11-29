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

Invite a new member to an organization. Only organization owner can perform this action.

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
  "member": {
    "id": "member_id",
    "role": "member",
    "user": {
      "id": "user_id",
      "name": "User Name",
      "email": "newmember@example.com"
    }
  }
}
\`\`\`

**Error Cases:**
- 401: Unauthorized (not logged in)
- 403: Forbidden (not organization owner)
- 400: Invalid email format or user already member

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
- `target` (number, default: 0): Target value
- `limit` (number, default: 0): Limit value
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
