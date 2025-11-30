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

    // Allow multiple join requests - users can send requests multiple times
    // No restriction on pending requests

    // Get organization owner details for email
    const owner = await prisma.user.findUnique({
      where: { id: org.ownerId },
      select: { email: true, name: true },
    })

    // Calculate expiration date (7 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)
    const daysUntilExpiration = 7

    // Create notification for organization owner
    let notificationId: string | null = null
    try {
      const notification = await prisma.notification.create({
        data: {
          type: "join_request",
          title: "New Join Request",
          message: `${user.name || user.email} wants to join "${org.name}" (expires in ${daysUntilExpiration} days)`,
          userId: org.ownerId,
          metadata: JSON.stringify({
            organizationId: org.id,
            organizationName: org.name,
            requestingUserId: user.id,
            requestingUserName: user.name || user.email,
            requestingUserEmail: user.email,
            expiresAt: expiresAt.toISOString(),
            daysUntilExpiration,
          }),
        },
      })
      notificationId = notification.id
      console.log(`✅ Join request notification created for owner:`, {
        notificationId: notification.id,
        ownerId: org.ownerId,
        ownerEmail: owner?.email,
        organizationId: org.id,
        requesterId: user.id,
      })
    } catch (notificationError: any) {
      console.error("❌ CRITICAL: Failed to create join request notification:", {
        error: notificationError.message,
        errorCode: notificationError.code,
        ownerId: org.ownerId,
        organizationId: org.id,
        requesterId: user.id,
        stack: notificationError.stack,
      })
      // Continue - email will still be sent
    }

    // Send email notification to organization owner
    if (owner && owner.email && notificationId) {
      try {
        const { sendEmail } = await import("@/lib/email")
        const { getJoinRequestNotificationTemplate } = await import("@/lib/email-templates")
        
        const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000"
        const workspaceUrl = `${baseUrl}/workspace`
        const acceptLink = `${baseUrl}/api/org/join-request/action?notificationId=${notificationId}&action=accept`
        const rejectLink = `${baseUrl}/api/org/join-request/action?notificationId=${notificationId}&action=reject`
        
        await sendEmail({
          to: owner.email,
          subject: `New Join Request for ${org.name}`,
          text: `Hello,\n\n${user.name || user.email} (${user.email}) has requested to join your organization "${org.name}".\n\nAccept: ${acceptLink}\nReject: ${rejectLink}\n\nView in workspace: ${workspaceUrl}\n\nThis request will expire in 7 days.`,
          html: getJoinRequestNotificationTemplate(
            org.name,
            user.name || user.email,
            user.email,
            acceptLink,
            rejectLink,
            workspaceUrl,
            "7 days"
          ),
        })
        console.log(`✅ Join request email sent to owner: ${owner.email}`)
      } catch (emailError: any) {
        console.error("❌ Failed to send join request email to owner:", emailError)
        // Don't fail the request if email fails
      }
    }

    return successResponse(
      {
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
        },
      },
      "Join request sent. The organization owner will be notified via email and notification."
    )
  } catch (error) {
    return handleApiError(error)
  }
}
