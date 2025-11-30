import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  unauthorizedResponse,
  badRequestResponse,
  forbiddenResponse,
  successResponse,
  handleApiError,
} from "@/lib/api-response"

// GET /api/notifications - Get all notifications for current user
export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50, // Limit to 50 most recent
    })

    // Calculate unread count from database for accuracy
    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        read: false,
      },
    })

    return successResponse({
      notifications,
      unreadCount,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH /api/notifications - Mark notification as read
export async function PATCH(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { notificationId, markAllAsRead } = body

    if (markAllAsRead) {
      // Mark all notifications as read
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          read: false,
        },
        data: { read: true },
      })
      return successResponse(undefined, "All notifications marked as read")
    }

    if (!notificationId) {
      return badRequestResponse("notificationId is required when markAllAsRead is false", "MISSING_NOTIFICATION_ID")
    }

    // Verify the notification exists and belongs to the user before updating
    const existingNotification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { userId: true },
    })

    if (!existingNotification) {
      return badRequestResponse("Notification not found", "NOTIFICATION_NOT_FOUND")
    }

    if (existingNotification.userId !== user.id) {
      return forbiddenResponse("You do not have permission to modify this notification")
    }

    // Mark single notification as read
    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    })

    return successResponse({ notification }, "Notification marked as read")
  } catch (error) {
    return handleApiError(error)
  }
}

