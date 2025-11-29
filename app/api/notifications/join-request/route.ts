import { getSessionUser } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"
import { sendEmail } from "@/lib/email"
import { getJoinRequestAcceptedTemplate, getJoinRequestRejectedTemplate } from "@/lib/email-templates"
import { validateEmailFormat, canReceiveEmails } from "@/lib/email-validation"

const prisma = new PrismaClient()

const joinRequestSchema = z.object({
  notificationId: z.string(),
  action: z.enum(["accept", "reject"]),
})

// POST /api/notifications/join-request - Accept or reject join request
export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = joinRequestSchema.parse(await request.json())

    // Get the notification
    const notification = await prisma.notification.findUnique({
      where: { id: data.notificationId },
    })

    if (!notification) {
      return Response.json({ error: "Notification not found" }, { status: 404 })
    }

    // Verify the notification belongs to the user (owner)
    if (notification.userId !== user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Verify it's a join request
    if (notification.type !== "join_request") {
      return Response.json({ error: "Invalid notification type" }, { status: 400 })
    }

    // Parse metadata
    const metadata = JSON.parse(notification.metadata || "{}")
    const { organizationId, requestingUserId, requestingUserName, organizationName } = metadata

    if (!organizationId || !requestingUserId) {
      return Response.json({ error: "Invalid notification metadata" }, { status: 400 })
    }

    // Verify user is the owner of the organization
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    })

    if (!org || org.ownerId !== user.id) {
      return Response.json({ error: "Only organization owner can accept/reject requests" }, { status: 403 })
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
        return Response.json({ 
          success: true, 
          message: "User is already a member",
          alreadyMember: true 
        })
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

      return Response.json({ 
        success: true, 
        message: "Join request accepted" 
      })
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

      return Response.json({ 
        success: true, 
        message: "Join request rejected" 
      })
    }
  } catch (error) {
    console.error("POST /api/notifications/join-request error:", error)
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

