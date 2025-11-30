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

const rejectInvitationSchema = z.object({
  invitationId: z.string().min(1, "Invitation ID is required"),
})

// POST /api/org/invitations/reject
export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const data = rejectInvitationSchema.parse(body)

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
      },
    })

    if (!invitation) {
      return notFoundResponse("Invitation")
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

    // Update invitation status to rejected
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "rejected" },
    })

    // Mark the notification as read
    const notification = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        type: "invitation",
        metadata: {
          contains: `"invitationId":"${invitation.id}"`,
        },
      },
    })

    if (notification) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { read: true },
      })
    }

    // Create notification for the organization owner
    await prisma.notification.create({
      data: {
        type: "invitation_rejected",
        title: "Invitation Declined",
        message: `${user.name || user.email} has declined the invitation to join "${invitation.organization.name}"`,
        userId: invitation.organization.ownerId,
        metadata: JSON.stringify({
          organizationId: invitation.organization.id,
          organizationName: invitation.organization.name,
          userId: user.id,
          userName: user.name || user.email,
          userEmail: user.email,
          invitationId: invitation.id,
        }),
      },
    })

    return successResponse(
      undefined,
      "Invitation declined successfully"
    )
  } catch (error) {
    return handleApiError(error)
  }
}


