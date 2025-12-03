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
import { isEmailServiceEnabled } from "@/lib/email-config"

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

    // Check if user exists in database
    const invitedUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    // User must exist before sending invitation
    if (!invitedUser) {
      return notFoundResponse("User with this email address")
    }

    // Prevent inviting yourself
    if (invitedUser.id === user.id) {
      return badRequestResponse("You cannot invite yourself", "CANNOT_INVITE_SELF")
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

    // Check if there's already a pending, non-expired invitation for this email
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        organizationId: data.orgId,
        email: data.email,
        status: "pending",
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (existingInvitation) {
      return badRequestResponse("An invitation has already been sent to this email address", "INVITATION_EXISTS")
    }

    // If there's an expired or rejected invitation, mark it as such and allow resending
    const oldInvitation = await prisma.invitation.findFirst({
      where: {
        organizationId: data.orgId,
        email: data.email,
        OR: [
          { status: "expired" },
          { status: "rejected" },
          {
            status: "pending",
            expiresAt: {
              lte: new Date(),
            },
          },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Mark expired pending invitations as expired
    if (oldInvitation && oldInvitation.status === "pending" && oldInvitation.expiresAt <= new Date()) {
      await prisma.invitation.update({
        where: { id: oldInvitation.id },
        data: { status: "expired" },
      })
    }

    // Create invitation (expires in 7 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invitation = await prisma.invitation.create({
      data: {
        organizationId: data.orgId,
        email: data.email,
        role: data.role || "member",
        inviterId: user.id,
        expiresAt,
      },
    })

    // Calculate days until expiration for display
    const daysUntilExpiration = Math.ceil(
      (invitation.expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )

    // Create notification for the invited user
    // This is critical - user must receive notification
    try {
      // Check if there's already an unread invitation notification for this user and organization
      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId: invitedUser.id,
          type: "invitation",
          read: false,
          metadata: {
            contains: `"organizationId":"${organization.id}"`,
          },
        },
      })

      // If notification exists, update it with new invitation ID, otherwise create new
      if (existingNotification) {
        await prisma.notification.update({
          where: { id: existingNotification.id },
          data: {
            title: "Organization Invitation",
            message: `You have been invited to join "${organization.name}" (expires in ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''})`,
            metadata: JSON.stringify({
              organizationId: organization.id,
              organizationName: organization.name,
              invitationId: invitation.id,
              inviterId: user.id,
              inviterName: user.name || user.email,
              expiresAt: invitation.expiresAt.toISOString(),
              daysUntilExpiration,
            }),
            read: false, // Mark as unread
            updatedAt: new Date(),
          },
        })
        console.log(`✅ Notification updated successfully:`, {
          notificationId: existingNotification.id,
          userId: invitedUser.id,
          userEmail: invitedUser.email,
          invitationId: invitation.id,
        })
      } else {
        const notification = await prisma.notification.create({
          data: {
            type: "invitation",
            title: "Organization Invitation",
            message: `You have been invited to join "${organization.name}" (expires in ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''})`,
            userId: invitedUser.id,
            metadata: JSON.stringify({
              organizationId: organization.id,
              organizationName: organization.name,
              invitationId: invitation.id,
              inviterId: user.id,
              inviterName: user.name || user.email,
              expiresAt: invitation.expiresAt.toISOString(),
              daysUntilExpiration,
            }),
          },
        })
        console.log(`✅ Notification created successfully:`, {
          notificationId: notification.id,
          userId: invitedUser.id,
          userEmail: invitedUser.email,
          type: notification.type,
          invitationId: invitation.id,
        })
      }
    } catch (notificationError: any) {
      // Log detailed error but don't fail the request
      // Email will still be sent, but notification is important
      console.error("❌ CRITICAL: Failed to create/update notification for invitation:", {
        error: notificationError.message,
        errorCode: notificationError.code,
        userId: invitedUser.id,
        userEmail: invitedUser.email,
        invitationId: invitation.id,
        organizationId: organization.id,
        stack: notificationError.stack,
      })
      // Continue - invitation and email will still be sent
      // But this should be investigated
    }

    // Send invitation email (only if email service is enabled)
    if (isEmailServiceEnabled()) {
      try {
        const { sendEmail } = await import("@/lib/email")
        const { getOrganizationInvitationTemplate } = await import("@/lib/email-templates")
        
        const invitationLink = `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/workspace?invitation=${invitation.id}`
        const expiresIn = `${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''}`
        
        await sendEmail({
          to: data.email,
          subject: `You've been invited to join ${organization.name}`,
          text: `Hi,\n\nYou have been invited to join the organization "${organization.name}".\n\nClick the link below to accept the invitation:\n${invitationLink}\n\nThis invitation will expire in ${expiresIn}. Please accept it before it expires.\n\nIf you did not expect this invitation, you can safely ignore it.\n\nThanks.`,
          html: getOrganizationInvitationTemplate(organization.name, invitationLink, expiresIn),
        })
        console.log(`✅ Invitation email sent to ${data.email}`)
      } catch (emailError: any) {
        console.error("❌ Failed to send invitation email:", emailError)
        // Don't fail the request if email fails
      }
    } else {
      console.log("📧 Email service disabled - invitation email skipped. User will be notified via in-app notification.")
    }

    return successResponse(
      { invitation: { id: invitation.id, email: invitation.email, status: invitation.status } },
      "Invitation sent successfully. The user will be notified."
    )
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
