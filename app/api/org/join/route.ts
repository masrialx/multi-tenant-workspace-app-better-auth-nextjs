import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { joinOrgSchema, generateSlug } from "@/lib/validation"
import {
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  successResponse,
  handleApiError,
} from "@/lib/api-response"

// POST /api/org/join
export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const data = joinOrgSchema.parse(body)

    // Normalize slug (same as in create route)
    const normalizedSlug = generateSlug(data.slug)

    if (!normalizedSlug) {
      return badRequestResponse("Invalid organization slug", "INVALID_SLUG")
    }

    // Find organization by slug
    const org = await prisma.organization.findUnique({
      where: { slug: normalizedSlug },
    })

    if (!org) {
      return notFoundResponse(`Organization with slug "${normalizedSlug}"`)
    }

    // Check if already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: user.id,
        },
      },
    })

    if (existingMember) {
      return badRequestResponse("You are already a member of this organization", "ALREADY_MEMBER")
    }

    // Check if there's already a pending join request
    const existingRequest = await prisma.notification.findFirst({
      where: {
        type: "join_request",
        userId: org.ownerId,
        read: false,
        metadata: {
          contains: `"requestingUserId":"${user.id}"`,
        },
      },
    })

    if (existingRequest) {
      return badRequestResponse(
        "You already have a pending join request for this organization",
        "PENDING_REQUEST"
      )
    }

    // Create notification for organization owner
    await prisma.notification.create({
      data: {
        type: "join_request",
        title: "New Join Request",
        message: `${user.name || user.email} wants to join "${org.name}"`,
        userId: org.ownerId,
        metadata: JSON.stringify({
          organizationId: org.id,
          organizationName: org.name,
          requestingUserId: user.id,
          requestingUserName: user.name || user.email,
          requestingUserEmail: user.email,
        }),
      },
    })

    return successResponse(
      {
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
        },
      },
      "Join request sent. The organization owner will be notified."
    )
  } catch (error) {
    return handleApiError(error)
  }
}
