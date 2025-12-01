"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { LayoutGrid, Users, LogOut, Building2, Loader2 } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { EmailVerificationBanner } from "@/components/email-verification-banner"
import { Notifications } from "@/components/notifications"

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const params = useParams()
  const orgIdParam = params?.orgId as string | undefined
  // Validate orgId - ensure it's not undefined, null, or the string "undefined"
  const orgId = orgIdParam && orgIdParam !== "undefined" ? orgIdParam : undefined
  const { data: session, isPending } = useSession()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin")
    } else if (!isPending && session && !orgId) {
      router.push("/workspace")
    }
  }, [session, isPending, router, orgId])

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-lg font-medium">Loading...</div>
        </div>
      </div>
    )
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch("/api/auth/sign-out", { method: "POST" })
      router.push("/auth/signin")
    } catch (error) {
      console.error("Error logging out:", error)
      setIsLoggingOut(false)
    }
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar className="border-r">
          <SidebarHeader className="border-b p-3 sm:p-4 min-w-0">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <Link href="/workspace" className="font-bold text-base sm:text-lg hover:opacity-80 flex items-center gap-2 min-w-0">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="hidden sm:inline truncate">Workspace</span>
              </Link>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <Notifications />
                <ThemeToggle />
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href={orgId ? `/workspace/${orgId}` : "/workspace"}>
                    <LayoutGrid className="w-4 h-4" />
                    <span>Outlines</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href={orgId ? `/workspace/${orgId}/team` : "/workspace"}>
                    <Users className="w-4 h-4" />
                    <span>Team</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <div className="border-t p-3 sm:p-4 mt-auto min-w-0">
            <div className="text-xs sm:text-sm font-medium mb-2 truncate" title={session?.user.email || undefined}>{session?.user.email}</div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout} 
              disabled={isLoggingOut}
              className="w-full bg-transparent gap-2 text-xs sm:text-sm"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                  <span className="hidden sm:inline">Signing Out...</span>
                  <span className="sm:hidden">Out...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                  <span className="sm:hidden">Out</span>
                </>
              )}
            </Button>
          </div>
        </Sidebar>
        <main className="flex-1 overflow-auto relative bg-gradient-to-br from-background via-background to-muted/5 min-w-0">
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-20">
            <SidebarTrigger />
          </div>
          <div className="min-h-full w-full max-w-full overflow-x-hidden">
            <div className="px-2 sm:px-4 py-2 sm:py-4">
              <EmailVerificationBanner />
            </div>
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
