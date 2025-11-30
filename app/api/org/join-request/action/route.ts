import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  unauthorizedResponse,
  badRequestResponse,
  forbiddenResponse,
  notFoundResponse,
  successResponse,
  handleApiError,
} from "@/lib/api-response"
import { sendEmail } from "@/lib/email"
import { getJoinRequestAcceptedTemplate, getJoinRequestRejectedTemplate } from "@/lib/email-templates"
import { NextResponse } from "next/server"

// GET /api/org/join-request/action - Handle accept/reject from email link
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const notificationId = searchParams.get("notificationId")
    const action = searchParams.get("action")

    const baseUrl = process.env.BETTER_AUTH_URL || request.headers.get("origin") || "http://localhost:3000"
    const workspaceUrl = `${baseUrl}/workspace`

    if (!notificationId || !action) {
      return NextResponse.redirect(new URL(`${workspaceUrl}?error=Missing notificationId or action parameter`, request.url))
    }

    if (action !== "accept" && action !== "reject") {
      return NextResponse.redirect(new URL(`${workspaceUrl}?error=Invalid action. Must be 'accept' or 'reject'`, request.url))
    }

    // Get the notification
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    })

    if (!notification) {
      return NextResponse.redirect(new URL(`${workspaceUrl}?error=Join request not found or has already been processed`, request.url))
    }

    // Verify it's a join request
    if (notification.type !== "join_request") {
      return NextResponse.redirect(new URL(`${workspaceUrl}?error=Invalid notification type`, request.url))
    }

    // Check if already processed (read)
    if (notification.read) {
      return NextResponse.redirect(new URL(`${workspaceUrl}?error=This join request has already been processed`, request.url))
    }

    // Parse metadata
    let metadata: {
      organizationId?: string
      requestingUserId?: string
      requestingUserName?: string
      requestingUserEmail?: string
      organizationName?: string
      expiresAt?: string
    }
    try {
      metadata = JSON.parse(notification.metadata || "{}")
    } catch {
      return NextResponse.redirect(new URL(`${workspaceUrl}?error=Invalid notification metadata`, request.url))
    }

    const { organizationId, requestingUserId, requestingUserName, requestingUserEmail, organizationName, expiresAt } = metadata

    if (!organizationId || !requestingUserId) {
      return NextResponse.redirect(new URL(`${workspaceUrl}?error=Invalid notification metadata`, request.url))
    }

    // Check expiration
    if (expiresAt) {
      const expirationDate = new Date(expiresAt)
      if (new Date() > expirationDate) {
        // Mark as read and redirect with expired message
        await prisma.notification.update({
          where: { id: notificationId },
          data: { read: true },
        })
        return NextResponse.redirect(
          new URL(
            `${workspaceUrl}?error=This join request has expired. It was valid until ${expirationDate.toLocaleDateString()}.`,
            request.url
          )
        )
      }
    }

    // Get the organization owner (notification recipient)
    const owner = await prisma.user.findUnique({
      where: { id: notification.userId },
    })

    if (!owner) {
      return NextResponse.redirect(new URL(`${workspaceUrl}?error=Organization owner not found`, request.url))
    }

    // Verify organization exists
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    })

    if (!org) {
      return NextResponse.redirect(new URL(`${workspaceUrl}?error=Organization not found`, request.url))
    }

    // Verify the notification belongs to the organization owner
    if (org.ownerId !== notification.userId) {
      return NextResponse.redirect(new URL(`${workspaceUrl}?error=You do not have permission to process this request`, request.url))
    }

    if (action === "accept") {
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
          where: { id: notificationId },
          data: { read: true },
        })
        return NextResponse.redirect(new URL(`${workspaceUrl}?message=User is already a member`, request.url))
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

      // Send email notification to requester
      if (requestingUserEmail) {
        try {
          await sendEmail({
            to: requestingUserEmail,
            subject: "Join Request Accepted",
            text: `Your request to join "${organizationName}" has been accepted!`,
            html: getJoinRequestAcceptedTemplate(organizationName),
          })
        } catch (emailError: any) {
          console.error("Failed to send acceptance email:", emailError)
        }
      }

      // Mark original notification as read
      await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
      })

      return NextResponse.redirect(new URL(`${workspaceUrl}?message=Join request accepted successfully`, request.url))
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

      // Send email notification to requester
      if (requestingUserEmail) {
        try {
          await sendEmail({
            to: requestingUserEmail,
            subject: "Join Request Update",
            text: `Your request to join "${organizationName}" has been rejected.`,
            html: getJoinRequestRejectedTemplate(organizationName),
          })
        } catch (emailError: any) {
          console.error("Failed to send rejection email:", emailError)
        }
      }

      // Mark original notification as read
      await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
      })

      return NextResponse.redirect(new URL(`${workspaceUrl}?message=Join request rejected`, request.url))
    }
  } catch (error) {
    console.error("Error processing join request action:", error)
    const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000"
    const workspaceUrl = `${baseUrl}/workspace`
    return NextResponse.redirect(new URL(`${workspaceUrl}?error=An error occurred while processing the request`, request.url))
  }
}

