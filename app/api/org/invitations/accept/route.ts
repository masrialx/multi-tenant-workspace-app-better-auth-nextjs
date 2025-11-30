import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  successResponse,
  handleApiError,
} from "@/lib/api-response"
import { z } from "zod"

const acceptInvitationSchema = z.object({
  invitationId: z.string().min(1, "Invitation ID is required"),
})

// POST /api/org/invitations/accept
export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const data = acceptInvitationSchema.parse(body)

    // Find the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { id: data.invitationId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!invitation) {
      return notFoundResponse("Invitation")
    }

    // Check if invitation is expired
    if (new Date() > invitation.expiresAt) {
      // Update invitation status to expired
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "expired" },
      })
      return badRequestResponse("This invitation has expired", "INVITATION_EXPIRED")
    }

    // Check if invitation is already accepted or rejected
    if (invitation.status !== "pending") {
      return badRequestResponse(
        `This invitation has already been ${invitation.status}`,
        "INVITATION_NOT_PENDING"
      )
    }

    // Verify the invitation email matches the current user's email
    if (invitation.email !== user.email) {
      return badRequestResponse(
        "This invitation was sent to a different email address",
        "EMAIL_MISMATCH"
      )
    }

    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: user.id,
        },
      },
    })

    if (existingMember) {
      // User is already a member, mark invitation as accepted anyway
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "accepted" },
      })
      return successResponse(
        { alreadyMember: true, organization: invitation.organization },
        "You are already a member of this organization"
      )
    }

    // Add user as member
    await prisma.organizationMember.create({
      data: {
        organizationId: invitation.organizationId,
        userId: user.id,
        role: invitation.role || "member",
      },
    })

    // Update invitation status to accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "accepted" },
    })

    // Mark the original invitation notification as read
    const invitationNotification = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        type: "invitation",
        metadata: {
          contains: `"invitationId":"${invitation.id}"`,
        },
      },
    })

    if (invitationNotification) {
      await prisma.notification.update({
        where: { id: invitationNotification.id },
        data: { read: true },
      })
    }

    // Create notification for the user who accepted
    await prisma.notification.create({
      data: {
        type: "invitation_accepted",
        title: "Invitation Accepted",
        message: `You have successfully joined "${invitation.organization.name}"`,
        userId: user.id,
        metadata: JSON.stringify({
          organizationId: invitation.organization.id,
          organizationName: invitation.organization.name,
        }),
      },
    })

    // Create notification for the organization owner
    await prisma.notification.create({
      data: {
        type: "invitation_accepted",
        title: "Member Joined",
        message: `${user.name || user.email} has accepted your invitation and joined "${invitation.organization.name}"`,
        userId: invitation.organization.ownerId,
        metadata: JSON.stringify({
          organizationId: invitation.organization.id,
          organizationName: invitation.organization.name,
          userId: user.id,
          userName: user.name || user.email,
          userEmail: user.email,
        }),
      },
    })

    // Send email notification to owner
    try {
      const { sendEmail } = await import("@/lib/email")
      const owner = await prisma.user.findUnique({
        where: { id: invitation.organization.ownerId },
        select: { email: true, name: true },
      })

      if (owner) {
        await sendEmail({
          to: owner.email,
          subject: `New member joined ${invitation.organization.name}`,
          text: `Hi ${owner.name || "there"},\n\n${user.name || user.email} has accepted your invitation and joined "${invitation.organization.name}".\n\nYou can now collaborate with them in your workspace.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #10b981;">New Member Joined</h2>
              <p>Hi ${owner.name || "there"},</p>
              <p><strong>${user.name || user.email}</strong> has accepted your invitation and joined <strong>"${invitation.organization.name}"</strong>.</p>
              <p>You can now collaborate with them in your workspace.</p>
            </div>
          `,
        })
      }
    } catch (emailError: any) {
      console.error("Failed to send email to owner:", emailError)
      // Don't fail the request if email fails
    }

    return successResponse(
      {
        organization: invitation.organization,
        member: {
          userId: user.id,
          organizationId: invitation.organizationId,
          role: invitation.role || "member",
        },
      },
      `Successfully joined "${invitation.organization.name}"`
    )
  } catch (error) {
    return handleApiError(error)
  }
}

