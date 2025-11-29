"use client"

import { useState, useEffect } from "react"
import { useSession } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { Bell, Check, X, Loader2, UserPlus, CheckCircle2, XCircle, Users } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  metadata: string | null
  createdAt: string
}

export function Notifications() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (session?.user) {
      fetchNotifications()
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [session])

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications")
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      })

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      })

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error("Error marking all as read:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinRequest = async (notificationId: string, action: "accept" | "reject") => {
    try {
      const response = await fetch("/api/notifications/join-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId, action }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: action === "accept" ? "Request Accepted" : "Request Rejected",
          description: data.message || `Join request ${action}ed successfully`,
        })
        // Refresh notifications
        fetchNotifications()
      } else {
        toast({
          title: "Error",
          description: data.error || `Failed to ${action} request`,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  if (!session?.user) {
    return null
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "join_request":
        return <UserPlus className="h-4 w-4" />
      case "join_accepted":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "join_rejected":
        return <XCircle className="h-4 w-4 text-destructive" />
      case "invitation":
        return <Users className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "join_request":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
      case "join_accepted":
        return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
      case "join_rejected":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
      default:
        return "bg-primary/10 text-primary border-primary/20"
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 hover:bg-accent transition-all duration-200"
          onClick={() => {
            setIsOpen(true)
            fetchNotifications()
          }}
        >
          <Bell className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-red-600 text-[10px] font-bold text-white shadow-lg animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[420px] p-0 shadow-2xl border-2 bg-card/95 backdrop-blur-sm" 
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-background to-muted/30 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {unreadCount} unread {unreadCount === 1 ? "notification" : "notifications"}
                </p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={isLoading}
              className="h-8 text-xs hover:bg-primary/10 transition-colors"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Mark all read"
              )}
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[450px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <Bell className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h4 className="font-semibold text-base mb-1">All caught up!</h4>
              <p className="text-sm text-muted-foreground text-center">
                You don't have any notifications yet
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((notification, index) => {
                const metadata = notification.metadata
                  ? JSON.parse(notification.metadata)
                  : {}
                const isJoinRequest = notification.type === "join_request"

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "group relative px-5 py-4 transition-all duration-200 hover:bg-muted/30",
                      !notification.read 
                        ? "bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-l-4 border-l-primary" 
                        : "bg-transparent",
                      index === 0 && "rounded-t-lg"
                    )}
                    onClick={() => {
                      if (!notification.read && !isJoinRequest) {
                        markAsRead(notification.id)
                      }
                    }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={cn(
                        "flex-shrink-0 p-2.5 rounded-lg border transition-all duration-200",
                        getNotificationColor(notification.type),
                        !notification.read && "ring-2 ring-primary/20"
                      )}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p
                                className={cn(
                                  "text-sm font-semibold leading-tight",
                                  !notification.read 
                                    ? "text-foreground" 
                                    : "text-muted-foreground"
                                )}
                              >
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <span className="h-2 w-2 rounded-full bg-primary shrink-0 animate-pulse" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {notification.message}
                            </p>
                          </div>
                        </div>

                        {/* Time and Actions */}
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground/80">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                          
                          {isJoinRequest && !notification.read && (
                            <div className="flex items-center gap-2 ml-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 px-3 text-xs font-medium shadow-sm hover:shadow-md transition-all duration-200"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleJoinRequest(notification.id, "accept")
                                }}
                              >
                                <Check className="h-3.5 w-3.5 mr-1.5" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-3 text-xs font-medium hover:bg-destructive/10 hover:border-destructive/50 transition-all duration-200"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleJoinRequest(notification.id, "reject")
                                }}
                              >
                                <X className="h-3.5 w-3.5 mr-1.5" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Hover effect indicator */}
                    {!notification.read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t bg-muted/20 px-5 py-3">
            <p className="text-xs text-center text-muted-foreground">
              {notifications.length} {notifications.length === 1 ? "notification" : "notifications"}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

