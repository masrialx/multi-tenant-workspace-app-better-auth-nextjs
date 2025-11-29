import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkOrgAccess, checkOrgOwner } from "@/lib/auth-utils"
import { inviteMemberSchema } from "@/lib/validation"
import {
  unauthorizedResponse,
  badRequestResponse,
  forbiddenResponse,
  notFoundResponse,
  successResponse,
  handleApiError,
} from "@/lib/api-response"

// GET /api/org/members?orgId=...
export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get("orgId")

    if (!orgId) {
      return badRequestResponse("orgId is required", "MISSING_ORG_ID")
    }

    const access = await checkOrgAccess(user.id, orgId)
    if (!access.hasAccess) {
      return forbiddenResponse("You do not have access to this organization")
    }

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    return successResponse({
      members,
      organization: access.organization,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/org/members (invite)
export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const data = inviteMemberSchema.parse(body)

    const isOwner = await checkOrgOwner(user.id, data.orgId)
    if (!isOwner) {
      return forbiddenResponse("Only organization owner can invite members")
    }

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: data.orgId },
    })

    if (!organization) {
      return notFoundResponse("Organization")
    }

    // Check if user exists
    const invitedUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (!invitedUser) {
      return notFoundResponse("User with this email address")
    }

    // Prevent inviting yourself
    if (invitedUser.id === user.id) {
      return badRequestResponse("You are already a member of this organization", "ALREADY_MEMBER")
    }

    // Check if already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: data.orgId,
          userId: invitedUser.id,
        },
      },
    })

    if (existingMember) {
      return badRequestResponse("User is already a member of this organization", "ALREADY_MEMBER")
    }

    // Prevent inviting as owner (only one owner allowed)
    if (data.role === "owner") {
      return badRequestResponse("Cannot invite additional owners. Only one owner is allowed per organization.", "INVALID_ROLE")
    }

    // Add member
    const member = await prisma.organizationMember.create({
      data: {
        organizationId: data.orgId,
        userId: invitedUser.id,
        role: data.role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    return successResponse({ member }, "Member invited successfully")
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/org/members?orgId=...&userId=...
export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get("orgId")
    const userId = searchParams.get("userId")

    if (!orgId || !userId) {
      return badRequestResponse("orgId and userId are required", "MISSING_PARAMS")
    }

    const isOwner = await checkOrgOwner(user.id, orgId)
    if (!isOwner) {
      return forbiddenResponse("Only organization owner can remove members")
    }

    // Check if organization exists
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    })

    if (!org) {
      return notFoundResponse("Organization")
    }

    // Check if trying to remove the owner
    if (org.ownerId === userId) {
      return badRequestResponse("Cannot remove the organization owner", "CANNOT_REMOVE_OWNER")
    }

    // Check if member exists
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    })

    if (!member) {
      return notFoundResponse("Member")
    }

    await prisma.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    })

    return successResponse(undefined, "Member removed successfully")
  } catch (error) {
    return handleApiError(error)
  }
}
