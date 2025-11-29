import { getSessionUser } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// GET /api/notifications - Get all notifications for current user
export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if notification model exists
    if (!prisma.notification) {
      console.error("Prisma notification model not available. Please restart the dev server.")
      return Response.json({ 
        error: "Notification service unavailable. Please restart the server.",
        notifications: [],
        unreadCount: 0
      }, { status: 503 })
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50, // Limit to 50 most recent
    })

    const unreadCount = notifications.filter((n) => !n.read).length

    return Response.json({ 
      notifications,
      unreadCount 
    })
  } catch (error) {
    console.error("GET /api/notifications error:", error)
    return Response.json({ 
      error: "Internal server error",
      notifications: [],
      unreadCount: 0
    }, { status: 500 })
  }
}

// PATCH /api/notifications - Mark notification as read
export async function PATCH(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { notificationId, markAllAsRead } = await request.json()

    if (markAllAsRead) {
      // Mark all notifications as read
      await prisma.notification.updateMany({
        where: { 
          userId: user.id,
          read: false 
        },
        data: { read: true },
      })
      return Response.json({ success: true, message: "All notifications marked as read" })
    }

    if (!notificationId) {
      return Response.json({ error: "notificationId is required" }, { status: 400 })
    }

    // Mark single notification as read
    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    })

    // Verify the notification belongs to the user
    if (notification.userId !== user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 403 })
    }

    return Response.json({ success: true, notification })
  } catch (error) {
    console.error("PATCH /api/notifications error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

