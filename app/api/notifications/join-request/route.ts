import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { joinRequestSchema } from "@/lib/validation"
import { sendEmail } from "@/lib/email"
import { getJoinRequestAcceptedTemplate, getJoinRequestRejectedTemplate } from "@/lib/email-templates"
import {
  unauthorizedResponse,
  badRequestResponse,
  forbiddenResponse,
  notFoundResponse,
  successResponse,
  handleApiError,
} from "@/lib/api-response"

// POST /api/notifications/join-request - Accept or reject join request
export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const data = joinRequestSchema.parse(body)

    // Get the notification
    const notification = await prisma.notification.findUnique({
      where: { id: data.notificationId },
    })

    if (!notification) {
      return notFoundResponse("Notification")
    }

    // Verify the notification belongs to the user (owner)
    if (notification.userId !== user.id) {
      return forbiddenResponse("You do not have permission to modify this notification")
    }

    // Verify it's a join request
    if (notification.type !== "join_request") {
      return badRequestResponse("Invalid notification type", "INVALID_NOTIFICATION_TYPE")
    }

    // Check if already processed (read)
    if (notification.read) {
      return badRequestResponse("This join request has already been processed", "ALREADY_PROCESSED")
    }

    // Parse metadata
    let metadata: {
      organizationId?: string
      requestingUserId?: string
      requestingUserName?: string
      organizationName?: string
      expiresAt?: string
    }
    try {
      metadata = JSON.parse(notification.metadata || "{}")
    } catch {
      return badRequestResponse("Invalid notification metadata", "INVALID_METADATA")
    }

    const { organizationId, requestingUserId, requestingUserName, organizationName, expiresAt } = metadata

    if (!organizationId || !requestingUserId) {
      return badRequestResponse("Invalid notification metadata", "INVALID_METADATA")
    }

    // Check expiration
    if (expiresAt) {
      const expirationDate = new Date(expiresAt)
      if (new Date() > expirationDate) {
        // Mark as read and return expired message
        await prisma.notification.update({
          where: { id: data.notificationId },
          data: { read: true },
        })
        return badRequestResponse(
          `This join request has expired. It was valid until ${expirationDate.toLocaleDateString()}.`,
          "JOIN_REQUEST_EXPIRED"
        )
      }
    }

    // Verify user is the owner of the organization
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    })

    if (!org) {
      return notFoundResponse("Organization")
    }

    if (org.ownerId !== user.id) {
      return forbiddenResponse("Only organization owner can accept/reject requests")
    }

    if (data.action === "accept") {
      // Check if user is already a member
      const existingMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: requestingUserId,
          },
        },
      })

      if (existingMember) {
        // User is already a member, just mark notification as read
        await prisma.notification.update({
          where: { id: data.notificationId },
          data: { read: true },
        })
        return successResponse(
          { alreadyMember: true },
          "User is already a member of this organization"
        )
      }

      // Add user as member
      await prisma.organizationMember.create({
        data: {
          organizationId,
          userId: requestingUserId,
          role: "member",
        },
      })

      // Create notification for the requesting user
      await prisma.notification.create({
        data: {
          type: "join_accepted",
          title: "Join Request Accepted",
          message: `Your request to join "${organizationName}" has been accepted!`,
          userId: requestingUserId,
          metadata: JSON.stringify({
            organizationId,
            organizationName,
          }),
        },
      })

      // Send email notification
      try {
        const requestingUser = await prisma.user.findUnique({
          where: { id: requestingUserId },
          select: { email: true },
        })
        if (requestingUser) {
          try {
            // Email validation is done in sendEmail() function
            await sendEmail({
              to: requestingUser.email,
              subject: "Join Request Accepted",
              text: `Your request to join "${organizationName}" has been accepted!`,
              html: getJoinRequestAcceptedTemplate(organizationName),
            })
          } catch (emailError: any) {
            // If email is invalid, log warning but don't fail the request
            if (emailError.message?.includes("Invalid email") || emailError.message?.includes("cannot receive")) {
              console.warn(`⚠️ Cannot send acceptance email to invalid email: ${requestingUser.email} - ${emailError.message}`)
            } else {
              // For other errors, still log but don't fail
              console.error(`Failed to send acceptance email:`, emailError.message)
            }
          }
        }
      } catch (emailError: any) {
        console.error("Failed to send acceptance email:", emailError)
        // Don't fail the request if email fails, but log the error
        if (emailError.message?.includes("invalid") || emailError.message?.includes("not valid")) {
          console.warn(`User email ${requestingUserId} is invalid and cannot receive emails`)
        }
      }

      // Mark original notification as read
      await prisma.notification.update({
        where: { id: data.notificationId },
        data: { read: true },
      })

      return successResponse(undefined, "Join request accepted")
    } else {
      // Reject the request
      // Create notification for the requesting user
      await prisma.notification.create({
        data: {
          type: "join_rejected",
          title: "Join Request Rejected",
          message: `Your request to join "${organizationName}" has been rejected.`,
          userId: requestingUserId,
          metadata: JSON.stringify({
            organizationId,
            organizationName,
          }),
        },
      })

      // Send email notification
      try {
        const requestingUser = await prisma.user.findUnique({
          where: { id: requestingUserId },
          select: { email: true },
        })
        if (requestingUser) {
          try {
            // Email validation is done in sendEmail() function
            await sendEmail({
              to: requestingUser.email,
              subject: "Join Request Update",
              text: `Your request to join "${organizationName}" has been rejected.`,
              html: getJoinRequestRejectedTemplate(organizationName),
            })
          } catch (emailError: any) {
            // If email is invalid, log warning but don't fail the request
            if (emailError.message?.includes("Invalid email") || emailError.message?.includes("cannot receive")) {
              console.warn(`⚠️ Cannot send rejection email to invalid email: ${requestingUser.email} - ${emailError.message}`)
            } else {
              // For other errors, still log but don't fail
              console.error(`Failed to send rejection email:`, emailError.message)
            }
          }
        }
      } catch (emailError: any) {
        console.error("Failed to send rejection email:", emailError)
        // Don't fail the request if email fails, but log the error
        if (emailError.message?.includes("invalid") || emailError.message?.includes("not valid")) {
          console.warn(`User email ${requestingUserId} is invalid and cannot receive emails`)
        }
      }

      // Mark original notification as read
      await prisma.notification.update({
        where: { id: data.notificationId },
        data: { read: true },
      })

      return successResponse(undefined, "Join request rejected")
    }
  } catch (error) {
    return handleApiError(error)
  }
}

