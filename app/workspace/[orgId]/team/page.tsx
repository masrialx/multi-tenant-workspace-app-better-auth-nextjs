"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Plus, Crown, Loader2, Users } from "lucide-react"

interface TeamMember {
  id: string
  role: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

interface Organization {
  id: string
  name: string
  ownerId: string
}

export default function TeamPage() {
  const params = useParams()
  const router = useRouter()
  const orgIdParam = params.orgId as string | undefined
  // Validate orgId - ensure it's not undefined, null, or the string "undefined"
  const orgId = orgIdParam && orgIdParam !== "undefined" ? orgIdParam : undefined
  const { data: session } = useSession()
  const { toast } = useToast()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [isInviting, setIsInviting] = useState(false)
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)

  const isOrgOwner = session && organization && session.user.id === organization.ownerId

  useEffect(() => {
    if (!orgId) {
      router.push("/workspace")
      return
    }
    fetchTeamData()
  }, [orgId, router])

  // Validate organization access
  useEffect(() => {
    const validateOrg = async () => {
      if (!orgId || !session) return
      
      try {
        const response = await fetch(`/api/org/members?orgId=${orgId}`)
        if (response.status === 403 || response.status === 404) {
          // Organization doesn't exist or user doesn't have access
          router.push(`/workspace/${orgId}/not-found`)
        }
      } catch (error) {
        console.error("Error validating organization:", error)
      }
    }
    
    if (orgId && session) {
      validateOrg()
    }
  }, [orgId, session, router])

  const fetchTeamData = async () => {
    if (!orgId) {
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch(`/api/org/members?orgId=${orgId}`)
      if (response.ok) {
        const data = await response.json()
        // Handle new API response format: { success: true, data: { members: [...], organization: {...} } }
        const responseData = data.success && data.data ? data.data : data
        const membersList = responseData.members || []
        setMembers(membersList)
        
        // Set organization from API response
        if (responseData.organization) {
          setOrganization({
            id: responseData.organization.id,
            name: responseData.organization.name,
            ownerId: responseData.organization.ownerId,
          })
        } else {
          // Fallback: Find the owner from the members list
          const ownerMember = membersList.find((m: TeamMember) => m.role === "owner")
          const ownerId = ownerMember?.user.id || ""
          
          setOrganization({
            id: orgId,
            name: "Organization",
            ownerId: ownerId,
          })
        }
      } else if (response.status === 403 || response.status === 404) {
        // Organization doesn't exist or user doesn't have access
        router.push(`/workspace/${orgId}/not-found`)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch team members",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching team:", error)
      toast({
        title: "Error",
        description: "An error occurred while fetching team members",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInviteMember = async () => {
    if (!orgId) {
      toast({
        title: "Error",
        description: "Organization ID is missing",
        variant: "destructive",
      })
      return
    }

    if (!inviteEmail.trim()) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      })
      return
    }

    setIsInviting(true)
    try {
      const response = await fetch("/api/org/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          email: inviteEmail,
          role: "member",
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // Handle new API response format: { success: true, data: { invitation: {...} } }
        const invitation = data.success && data.data?.invitation 
          ? data.data.invitation 
          : data.invitation
        
        if (invitation) {
          setInviteEmail("")
          setIsOpen(false)
          toast({
            title: "Success",
            description: data.message || "Invitation sent successfully",
          })
          // Refresh team data to show updated list
          fetchTeamData()
        } else {
          throw new Error("Invitation data not found in response")
        }
      } else {
        const error = await response.json()
        throw new Error(error.message || error.error || "Failed to invite member")
      }
    } catch (error) {
      console.error("Error inviting member:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to invite member",
        variant: "destructive",
      })
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!orgId) {
      toast({
        title: "Error",
        description: "Organization ID is missing",
        variant: "destructive",
      })
      return
    }

    // Double-check: Only owners can remove members
    if (!isOrgOwner) {
      toast({
        title: "Error",
        description: "Only organization owners can remove members",
        variant: "destructive",
      })
      return
    }

    if (!confirm("Are you sure you want to remove this member?")) return

    setRemovingUserId(userId)
    try {
      const response = await fetch(`/api/org/members?orgId=${orgId}&userId=${userId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setMembers(members.filter((m) => m.user.id !== userId))
        toast({
          title: "Success",
          description: "Member removed successfully",
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to remove member")
      }
    } catch (error) {
      console.error("Error removing member:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove member",
        variant: "destructive",
      })
    } finally {
      setRemovingUserId(null)
    }
  }

  return (
    <div className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div className="space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Team
            </h1>
            {organization && (
              <div className="px-3 sm:px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 inline-block">
                <span className="text-xs sm:text-sm font-semibold text-primary">{organization.name}</span>
              </div>
            )}
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">
            {organization 
              ? `Manage members and permissions for ${organization.name}`
              : "Manage your organization members and permissions"}
          </p>
        </div>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button 
              className="shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
              disabled={!isOrgOwner}
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Invite Member</span>
              <span className="sm:hidden">Invite</span>
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[calc(100vw-2rem)] sm:w-[400px] px-4 sm:px-6">
            <SheetHeader>
              <SheetTitle>Invite Team Member</SheetTitle>
              <SheetDescription>Invite a new member to your organization</SheetDescription>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="member@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={isInviting}
                />
              </div>
              <Button onClick={handleInviteMember} disabled={isInviting} className="w-full">
                {isInviting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Inviting...
                  </>
                ) : (
                  "Send Invite"
                )}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Loading team members...</p>
          </div>
        </div>
      ) : !members || members.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed p-16 text-center bg-muted/20">
          <div className="max-w-md mx-auto space-y-4">
            <div className="inline-block p-4 rounded-full bg-primary/10">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">No team members yet</h3>
            <p className="text-muted-foreground">Start building your team by inviting members</p>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block rounded-xl border-2 shadow-lg overflow-hidden bg-card w-full">
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="min-w-[150px]">Name</TableHead>
                    <TableHead className="min-w-[200px]">Email</TableHead>
                    <TableHead className="min-w-[100px]">Role</TableHead>
                    {isOrgOwner && <TableHead className="text-right min-w-[100px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium max-w-[200px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate" title={member.user.name || undefined}>{member.user.name}</span>
                          {member.role === "owner" && <Crown className="w-4 h-4 text-yellow-600 flex-shrink-0" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate" title={member.user.email}>{member.user.email}</TableCell>
                      <TableCell>
                        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                          member.role === "owner" 
                            ? "bg-primary/10 text-primary border border-primary/20" 
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {member.role === "owner" ? "Owner" : "Member"}
                        </span>
                      </TableCell>
                      {isOrgOwner && (
                        <TableCell className="text-right">
                          {member.role !== "owner" && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleRemoveMember(member.user.id)}
                              disabled={removingUserId !== null}
                            >
                              {removingUserId === member.user.id ? (
                                <Loader2 className="w-4 h-4 text-destructive animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4 text-destructive" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4 w-full">
            {members.map((member) => (
              <Card key={member.id} className="border-2 shadow-lg w-full overflow-hidden">
                <CardHeader className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <CardTitle className="text-lg mb-2 flex items-center gap-2">
                        <span className="truncate" title={member.user.name || undefined}>{member.user.name}</span>
                        {member.role === "owner" && <Crown className="w-4 h-4 text-yellow-600 flex-shrink-0" />}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground truncate" title={member.user.email}>{member.user.email}</p>
                    </div>
                    {isOrgOwner && member.role !== "owner" && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleRemoveMember(member.user.id)}
                        disabled={removingUserId !== null}
                        className="h-8 w-8 p-0"
                      >
                        {removingUserId === member.user.id ? (
                          <Loader2 className="w-4 h-4 text-destructive animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-destructive" />
                        )}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                    member.role === "owner" 
                      ? "bg-primary/10 text-primary border border-primary/20" 
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {member.role === "owner" ? "Owner" : "Member"}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
