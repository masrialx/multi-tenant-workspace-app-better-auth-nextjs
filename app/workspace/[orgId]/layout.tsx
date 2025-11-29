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
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full">
        <Sidebar className="border-r">
          <SidebarHeader className="border-b p-4">
            <div className="flex items-center justify-between">
              <Link href="/workspace" className="font-bold text-lg hover:opacity-80 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Workspace
              </Link>
              <div className="flex items-center gap-2">
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
          <div className="border-t p-4 mt-auto">
            <div className="text-sm font-medium mb-2">{session?.user.email}</div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout} 
              disabled={isLoggingOut}
              className="w-full bg-transparent gap-2"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing Out...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </>
              )}
            </Button>
          </div>
        </Sidebar>
        <main className="flex-1 overflow-auto relative bg-gradient-to-br from-background via-background to-muted/5">
          <div className="absolute top-4 left-4 z-20">
            <SidebarTrigger />
          </div>
          <div className="min-h-full">
            <div className="px-4 py-4">
              <EmailVerificationBanner />
            </div>
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
