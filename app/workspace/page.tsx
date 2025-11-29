"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { LogOut, Building2, Plus, Users, Sparkles, Loader2 } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { EmailVerificationBanner } from "@/components/email-verification-banner"
import { Notifications } from "@/components/notifications"

interface Organization {
  id: string
  name: string
  slug: string
  role: string
}

export default function WorkspacePage() {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const { toast } = useToast()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false)
  const [newOrgName, setNewOrgName] = useState("")
  const [joinOrgSlug, setJoinOrgSlug] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin")
    } else if (session) {
      fetchOrganizations()
    }
  }, [session, isPending, router])

  const fetchOrganizations = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/org/list", {
        method: "GET",
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        // Handle new API response format: { success: true, data: { organizations: [...] } }
        const organizations = data.success && data.data?.organizations 
          ? data.data.organizations 
          : data.organizations || []
        setOrganizations(organizations)
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || errorData.error || "Failed to fetch organizations",
          variant: "destructive",
        })
        setOrganizations([]) // Set empty array on error to prevent undefined
      }
    } catch (error) {
      console.error("Error fetching organizations:", error)
      toast({
        title: "Error",
        description: "An error occurred while fetching organizations",
        variant: "destructive",
      })
      setOrganizations([]) // Set empty array on error to prevent undefined
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) {
      toast({
        title: "Error",
        description: "Organization name is required",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch("/api/org/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName }),
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        // Handle new API response format: { success: true, data: { organization: {...} } }
        const organization = data.success && data.data?.organization 
          ? data.data.organization 
          : data.organization
        
        if (!organization) {
          throw new Error("Organization data not found in response")
        }
        
        const newOrg: Organization = {
          ...organization,
          role: "owner",
        }
        setOrganizations([...organizations, newOrg])
        setNewOrgName("")
        setIsCreateDialogOpen(false)
        toast({
          title: "Success",
          description: data.message || "Organization created successfully",
        })
        // Optionally navigate to the new organization
        router.push(`/workspace/${organization.id}`)
      } else {
        const error = await response.json()
        throw new Error(error.message || error.error || "Failed to create organization")
      }
    } catch (error) {
      console.error("Error creating organization:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create organization",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinOrganization = async () => {
    if (!joinOrgSlug.trim()) {
      toast({
        title: "Error",
        description: "Organization slug is required",
        variant: "destructive",
      })
      return
    }

    setIsJoining(true)
    try {
      const response = await fetch("/api/org/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: joinOrgSlug }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Handle new API response format: { success: true, data: { organization: {...} }, message: "..." }
        const organization = data.success && data.data?.organization 
          ? data.data.organization 
          : data.organization
        
        if (data.pending) {
          toast({
            title: "Request Pending",
            description: data.message || "Your join request has been sent. The organization owner will be notified.",
          })
        } else if (data.success) {
          toast({
            title: "Request Sent",
            description: data.message || "Join request sent. The organization owner will be notified.",
          })
        } else if (organization) {
          // Direct join (if owner accepts immediately)
          const newOrg: Organization = {
            ...organization,
            role: "member",
          }
          setOrganizations([...organizations, newOrg])
          toast({
            title: "Success",
            description: "Successfully joined organization",
          })
          router.push(`/workspace/${organization.id}`)
        }
        
        setJoinOrgSlug("")
        setIsJoinDialogOpen(false)
      } else {
        const error = await response.json()
        throw new Error(error.message || error.error || "Failed to join organization")
      }
    } catch (error) {
      console.error("Error joining organization:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join organization",
        variant: "destructive",
      })
    } finally {
      setIsJoining(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch("/api/auth/sign-out", { method: "POST" })
      router.push("/auth/signin")
    } catch (error) {
      console.error("Error logging out:", error)
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      })
      setIsLoggingOut(false)
    }
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div className="text-lg font-medium">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <EmailVerificationBanner />
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Workspaces
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">Manage your organizations and teams</p>
          </div>
          <div className="flex items-center gap-3">
            <Notifications />
            <ThemeToggle />
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border">
              <span className="text-sm font-medium">{session?.user.email}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout} 
              disabled={isLoggingOut}
              className="shadow-sm"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing Out...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-8">
          <Button 
            onClick={() => setIsCreateDialogOpen(true)} 
            size="lg"
            className="shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Organization
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsJoinDialogOpen(true)}
            size="lg"
            className="shadow-sm hover:shadow-md transition-all duration-200"
          >
            <Users className="w-4 h-4 mr-2" />
            Join Organization
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Loading organizations...</p>
            </div>
          </div>
        ) : !organizations || organizations.length === 0 ? (
          <Card className="border-2 shadow-xl">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 rounded-full bg-primary/10 mb-4">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No organizations yet</h3>
              <p className="text-muted-foreground mb-6 text-center max-w-md">
                Get started by creating your first organization or joining an existing one
              </p>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                size="lg"
                className="shadow-lg hover:shadow-xl transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Organization
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => (
              <Link key={org.id} href={`/workspace/${org.id}`}>
                <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20 h-full group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        org.role === "owner" 
                          ? "bg-primary/10 text-primary border border-primary/20" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {org.role === "owner" ? "Owner" : "Member"}
                      </span>
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {org.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs font-mono">{org.slug}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" className="w-full group-hover:bg-primary/10 transition-colors">
                      Open Workspace
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Organization Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-2xl">Create Organization</DialogTitle>
            </div>
            <DialogDescription className="text-base">
              Create a new organization to collaborate with your team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Organization Name</label>
              <Input
                placeholder="My Organization"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                disabled={isCreating}
                className="h-11"
              />
            </div>
            <Button 
              onClick={handleCreateOrganization} 
              disabled={isCreating} 
              className="w-full h-11 shadow-lg hover:shadow-xl transition-all"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Organization
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Organization Dialog */}
      <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-2xl">Join Organization</DialogTitle>
            </div>
            <DialogDescription className="text-base">
              Enter the slug of the organization you want to join
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Organization Slug</label>
              <Input
                placeholder="organization-slug"
                value={joinOrgSlug}
                onChange={(e) => setJoinOrgSlug(e.target.value)}
                disabled={isJoining}
                className="h-11"
              />
            </div>
            <Button 
              onClick={handleJoinOrganization} 
              disabled={isJoining} 
              className="w-full h-11 shadow-lg hover:shadow-xl transition-all"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Join Organization
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
