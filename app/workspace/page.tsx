"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { LogOut, Building2, Plus, Users, Sparkles, Loader2, Trash2 } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { EmailVerificationBanner } from "@/components/email-verification-banner"
import { Notifications } from "@/components/notifications"

interface Organization {
  id: string
  name: string
  slug: string
  role: string
}

function WorkspaceContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const [isProcessingInvitation, setIsProcessingInvitation] = useState(false)
  const [deleteOrgId, setDeleteOrgId] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [orgNameExists, setOrgNameExists] = useState(false)
  const [isCheckingOrgName, setIsCheckingOrgName] = useState(false)

  // Handle invitation from email link
  useEffect(() => {
    if (!searchParams || !session || isPending || isProcessingInvitation) return
    
    const invitationId = searchParams.get("invitation")
    if (invitationId) {
      handleInvitationFromEmail(invitationId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isPending, searchParams])

  // Handle error and success messages from query parameters (e.g., from join request redirects)
  useEffect(() => {
    if (!searchParams) return
    
    const error = searchParams.get("error")
    const message = searchParams.get("message")
    
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      })
      // Clean up URL by removing error parameter
      const newSearchParams = new URLSearchParams(searchParams.toString())
      newSearchParams.delete("error")
      const newUrl = newSearchParams.toString() 
        ? `${window.location.pathname}?${newSearchParams.toString()}`
        : window.location.pathname
      router.replace(newUrl)
    } else if (message) {
      toast({
        title: "Success",
        description: message,
      })
      // Clean up URL by removing message parameter
      const newSearchParams = new URLSearchParams(searchParams.toString())
      newSearchParams.delete("message")
      const newUrl = newSearchParams.toString() 
        ? `${window.location.pathname}?${newSearchParams.toString()}`
        : window.location.pathname
      router.replace(newUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin")
    } else if (session) {
      fetchOrganizations()
    }
  }, [session, isPending, router])

  // Real-time org name validation with debouncing
  useEffect(() => {
    if (!isCreateDialogOpen) {
      setOrgNameExists(false)
      setIsCheckingOrgName(false)
      return
    }

    const trimmedName = newOrgName.trim()
    
    // Reset state if input is empty
    if (!trimmedName) {
      setOrgNameExists(false)
      setIsCheckingOrgName(false)
      return
    }

    // Minimum length check before validating
    if (trimmedName.length < 1) {
      setOrgNameExists(false)
      setIsCheckingOrgName(false)
      return
    }

    // Debounce the check
    const timeoutId = setTimeout(async () => {
      setIsCheckingOrgName(true)
      try {
        const response = await fetch(
          `/api/org/check-name?name=${encodeURIComponent(trimmedName)}`,
          {
            method: "GET",
            credentials: "include",
          }
        )

        if (response.ok) {
          const data = await response.json()
          setOrgNameExists(data.data?.exists || false)
        } else {
          // On error, assume it doesn't exist to allow creation attempt
          setOrgNameExists(false)
        }
      } catch (error) {
        console.error("Error checking org name:", error)
        setOrgNameExists(false)
      } finally {
        setIsCheckingOrgName(false)
      }
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [newOrgName, isCreateDialogOpen])

  const handleInvitationFromEmail = async (invitationId: string) => {
    setIsProcessingInvitation(true)
    try {
      const response = await fetch("/api/org/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Invitation Accepted",
          description: data.message || "You have successfully joined the organization",
        })
        // Remove invitation parameter from URL
        router.replace("/workspace")
        // Refresh organizations list
        await fetchOrganizations()
        // Navigate to the organization if available
        if (data.data?.organization?.id) {
          setTimeout(() => {
            router.push(`/workspace/${data.data.organization.id}`)
          }, 1000)
        }
      } else {
        toast({
          title: "Error",
          description: data.error || data.message || "Failed to accept invitation",
          variant: "destructive",
        })
        // Remove invitation parameter from URL even on error
        router.replace("/workspace")
      }
    } catch (error) {
      console.error("Error accepting invitation:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while processing the invitation",
        variant: "destructive",
      })
      router.replace("/workspace")
    } finally {
      setIsProcessingInvitation(false)
    }
  }

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

    // Prevent creation if org name exists
    if (orgNameExists) {
      toast({
        title: "Error",
        description: "An organization with this name already exists. Please choose a different name.",
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
        setOrgNameExists(false)
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

  const handleDeleteClick = (orgId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDeleteOrgId(orgId)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteOrgId || !deletePassword.trim()) {
      toast({
        title: "Error",
        description: "Password is required",
        variant: "destructive",
      })
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch("/api/org/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: deleteOrgId,
          password: deletePassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: data.message || "Organization deleted successfully",
        })
        setIsDeleteDialogOpen(false)
        setDeleteOrgId(null)
        setDeletePassword("")
        // Refresh organizations list
        fetchOrganizations()
      } else {
        toast({
          title: "Error",
          description: data.error || data.message || "Failed to delete organization",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting organization:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false)
    setDeleteOrgId(null)
    setDeletePassword("")
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
      
      <div className="w-full max-w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 relative z-10 overflow-x-hidden">
        <EmailVerificationBanner />
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Workspaces
              </h1>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">Manage your organizations and teams</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Notifications />
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-card border">
              <span className="text-xs sm:text-sm font-medium truncate max-w-[150px] lg:max-w-none">{session?.user.email}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout} 
              disabled={isLoggingOut}
              className="shadow-sm text-xs sm:text-sm"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                  <span className="hidden sm:inline">Signing Out...</span>
                  <span className="sm:hidden">Out...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Sign Out</span>
                  <span className="sm:hidden">Out</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 sm:mb-8">
          <Button 
            onClick={() => setIsCreateDialogOpen(true)} 
            size="lg"
            className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Create Organization</span>
            <span className="sm:hidden">Create</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsJoinDialogOpen(true)}
            size="lg"
            className="w-full sm:w-auto shadow-sm hover:shadow-md transition-all duration-200"
          >
            <Users className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Join Organization</span>
            <span className="sm:hidden">Join</span>
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
          <Card className="border-2 shadow-xl w-full overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
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
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => (
              <Card key={org.id} className="hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20 h-full group relative overflow-hidden">
                <CardHeader className="pb-3 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                      {org.role === "owner" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDeleteClick(org.id, e)}
                          title="Delete Organization"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        org.role === "owner" 
                          ? "bg-primary/10 text-primary border border-primary/20" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {org.role === "owner" ? "Owner" : "Member"}
                      </span>
                    </div>
                  </div>
                  <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors truncate" title={org.name}>
                    {org.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1.5 mt-1">
                    <span className="text-xs font-mono truncate" title={org.slug}>{org.slug}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={`/workspace/${org.id}`}>
                    <Button variant="ghost" className="w-full group-hover:bg-primary/10 transition-colors">
                      Open Workspace
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Organization Dialog */}
      <Dialog 
        open={isCreateDialogOpen} 
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open)
          if (!open) {
            setNewOrgName("")
            setOrgNameExists(false)
            setIsCheckingOrgName(false)
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md mx-4 sm:mx-auto">
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
                className={`h-11 ${orgNameExists ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {isCheckingOrgName && newOrgName.trim() && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Checking availability...
                </p>
              )}
              {!isCheckingOrgName && orgNameExists && newOrgName.trim() && (
                <p className="text-xs text-destructive font-medium">
                  This organization name already exists
                </p>
              )}
              {!isCheckingOrgName && !orgNameExists && newOrgName.trim() && (
                <p className="text-xs text-green-600 dark:text-green-500 font-medium">
                  Organization name is available
                </p>
              )}
            </div>
            <Button 
              onClick={handleCreateOrganization} 
              disabled={isCreating || orgNameExists || isCheckingOrgName || !newOrgName.trim()} 
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
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md mx-4 sm:mx-auto">
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

      {/* Delete Organization Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this organization? This action cannot be undone. All data, members, and content associated with this organization will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-password">Enter your password to confirm</Label>
              <Input
                id="delete-password"
                type="password"
                placeholder="Enter your password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                disabled={isDeleting}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && deletePassword.trim()) {
                    handleDeleteConfirm()
                  }
                }}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel} disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting || !deletePassword.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Organization"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div className="text-lg font-medium">Loading...</div>
        </div>
      </div>
    }>
      <WorkspaceContent />
    </Suspense>
  )
}
