"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Edit2, Plus, Loader2 } from "lucide-react"

interface Outline {
  id: string
  header: string
  sectionType: string
  status: string
  target: number
  limit: number
  reviewer: string
}

const SECTION_TYPES = [
  "Table of Contents",
  "Executive Summary",
  "Technical Approach",
  "Design",
  "Capabilities",
  "Focus Document",
  "Narrative",
]

const STATUS_OPTIONS = ["Pending", "In-Progress", "Completed"]
const REVIEWER_OPTIONS = ["Assim", "Bini", "Mami"]

export default function OutlineTablePage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params.orgId as string
  const { data: session } = useSession()
  const { toast } = useToast()
  const [outlines, setOutlines] = useState<Outline[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isOrgOwner, setIsOrgOwner] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    header: "",
    sectionType: SECTION_TYPES[0],
    status: STATUS_OPTIONS[0],
    target: 0,
    limit: 0,
    reviewer: REVIEWER_OPTIONS[0],
  })

  useEffect(() => {
    if (orgId) {
      fetchOutlines()
    }
  }, [orgId])

  // Validate organization access and check owner status
  useEffect(() => {
    const validateOrg = async () => {
      if (!orgId || !session) return
      
      try {
        const response = await fetch(`/api/org/members?orgId=${orgId}`)
        if (response.status === 403 || response.status === 404) {
          // Organization doesn't exist or user doesn't have access
          router.push(`/workspace/${orgId}/not-found`)
          return
        }
        
        if (response.ok) {
          const data = await response.json()
          // Handle new API response format: { success: true, data: { members: [...], organization: {...} } }
          const responseData = data.success && data.data ? data.data : data
          const members = responseData.members || []
          const organization = responseData.organization
          
          // Check if current user is the owner
          if (organization && organization.ownerId) {
            // Use organization.ownerId if available
            setIsOrgOwner(session.user.id === organization.ownerId)
          } else {
            // Fallback: Find the owner from the members list
            const ownerMember = members.find((m: { role: string; user: { id: string } }) => m.role === "owner")
            const ownerId = ownerMember?.user.id || ""
            setIsOrgOwner(session.user.id === ownerId)
          }
        }
      } catch (error) {
        console.error("Error validating organization:", error)
      }
    }
    
    if (orgId && session) {
      validateOrg()
    }
  }, [orgId, session, router])

  const fetchOutlines = async () => {
    if (!orgId) {
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch(`/api/outlines?orgId=${orgId}`)
      if (response.ok) {
        const data = await response.json()
        // Handle new API response format: { success: true, data: { outlines: [...] } }
        const outlines = data.success && data.data?.outlines 
          ? data.data.outlines 
          : data.outlines || []
        setOutlines(outlines)
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || errorData.error || "Failed to fetch outlines",
          variant: "destructive",
        })
        setOutlines([]) // Set empty array on error
      }
    } catch (error) {
      console.error("Error fetching outlines:", error)
      toast({
        title: "Error",
        description: "An error occurred while fetching outlines",
        variant: "destructive",
      })
      setOutlines([]) // Set empty array on error
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenSheet = (outline?: Outline) => {
    if (outline) {
      setEditingId(outline.id)
      setFormData({
        header: outline.header,
        sectionType: outline.sectionType,
        status: outline.status,
        target: outline.target,
        limit: outline.limit,
        reviewer: outline.reviewer,
      })
    } else {
      setEditingId(null)
      setFormData({
        header: "",
        sectionType: SECTION_TYPES[0],
        status: STATUS_OPTIONS[0],
        target: 0,
        limit: 0,
        reviewer: REVIEWER_OPTIONS[0],
      })
    }
    setIsOpen(true)
  }

  const handleSaveOutline = async () => {
    if (!orgId) {
      toast({
        title: "Error",
        description: "Organization ID is missing",
        variant: "destructive",
      })
      return
    }

    if (!formData.header.trim()) {
      toast({
        title: "Error",
        description: "Header is required",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      if (editingId) {
        // Update
        const response = await fetch(`/api/outlines/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId,
            ...formData,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          // Handle new API response format: { success: true, data: { outline: {...} } }
          const outline = data.success && data.data?.outline 
            ? data.data.outline 
            : data.outline
          
          if (outline) {
            setOutlines(outlines.map((o) => (o.id === editingId ? outline : o)))
            toast({
              title: "Success",
              description: data.message || "Outline updated successfully",
            })
          } else {
            throw new Error("Outline data not found in response")
          }
        } else {
          const errorData = await response.json()
          throw new Error(errorData.message || errorData.error || "Failed to update outline")
        }
      } else {
        // Create
        const response = await fetch("/api/outlines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId,
            ...formData,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          // Handle new API response format: { success: true, data: { outline: {...} } }
          const outline = data.success && data.data?.outline 
            ? data.data.outline 
            : data.outline
          
          if (outline) {
            setOutlines([...outlines, outline])
            toast({
              title: "Success",
              description: data.message || "Outline created successfully",
            })
          } else {
            throw new Error("Outline data not found in response")
          }
        } else {
          const errorData = await response.json()
          throw new Error(errorData.message || errorData.error || "Failed to create outline")
        }
      }

      setIsOpen(false)
    } catch (error) {
      console.error("Error saving outline:", error)
      toast({
        title: "Error",
        description: "Failed to save outline",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteOutline = async (id: string) => {
    if (!orgId) {
      toast({
        title: "Error",
        description: "Organization ID is missing",
        variant: "destructive",
      })
      return
    }

    if (!confirm("Are you sure you want to delete this outline?")) return

    setDeletingId(id)
    try {
      const response = await fetch(`/api/outlines/${id}?orgId=${orgId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setOutlines(outlines.filter((o) => o.id !== id))
        toast({
          title: "Success",
          description: "Outline deleted successfully",
        })
      } else {
        throw new Error("Failed to delete outline")
      }
    } catch (error) {
      console.error("Error deleting outline:", error)
      toast({
        title: "Error",
        description: "Failed to delete outline",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
      case "In-Progress":
        return "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
      default:
        return "text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800"
    }
  }

  return (
    <div className="flex-1 p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Outlines
          </h1>
          <p className="text-muted-foreground">Manage your project outlines and track progress</p>
        </div>
        {isOrgOwner && (
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button onClick={() => handleOpenSheet()} className="shadow-lg hover:shadow-xl transition-all">
                <Plus className="w-4 h-4 mr-2" />
                Add Outline
              </Button>
            </SheetTrigger>
          <SheetContent className="w-[400px] px-4 sm:w-[500px] sm:px-6">
            <SheetHeader>
              <SheetTitle>{editingId ? "Edit Outline" : "Add New Outline"}</SheetTitle>
              <SheetDescription>
                {editingId ? "Update the outline details" : "Create a new outline for your project"}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Header</label>
                <Input
                  placeholder="Outline title"
                  value={formData.header}
                  onChange={(e) => setFormData({ ...formData, header: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Section Type</label>
                <Select
                  value={formData.sectionType}
                  onValueChange={(value) => setFormData({ ...formData, sectionType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target</label>
                  <Input
                    type="number"
                    value={formData.target}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        target: Number.parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Limit</label>
                  <Input
                    type="number"
                    value={formData.limit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limit: Number.parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Reviewer</label>
                <Select
                  value={formData.reviewer}
                  onValueChange={(value) => setFormData({ ...formData, reviewer: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REVIEWER_OPTIONS.map((reviewer) => (
                      <SelectItem key={reviewer} value={reviewer}>
                        {reviewer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSaveOutline} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingId ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  editingId ? "Update Outline" : "Create Outline"
                )}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Loading outlines...</p>
          </div>
        </div>
      ) : outlines.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed p-16 text-center bg-muted/20">
          <div className="max-w-md mx-auto space-y-4">
            <div className="inline-block p-4 rounded-full bg-primary/10">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">No outlines yet</h3>
            <p className="text-muted-foreground">Get started by creating your first outline</p>
            {isOrgOwner && (
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button onClick={() => handleOpenSheet()} className="mt-4 shadow-lg hover:shadow-xl transition-all">
                    Create your first outline
                  </Button>
                </SheetTrigger>
              </Sheet>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border-2 shadow-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Header</TableHead>
                <TableHead>Section Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Limit</TableHead>
                <TableHead>Reviewer</TableHead>
                {isOrgOwner && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {outlines.map((outline) => (
                <TableRow key={outline.id}>
                  <TableCell className="font-medium">{outline.header}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{outline.sectionType}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(outline.status)}`}>
                      {outline.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{outline.target}</TableCell>
                  <TableCell className="text-right">{outline.limit}</TableCell>
                  <TableCell className="text-sm">{outline.reviewer}</TableCell>
                  {isOrgOwner && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleOpenSheet(outline)}
                          disabled={isSaving || deletingId !== null}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteOutline(outline.id)}
                          disabled={isSaving || deletingId !== null}
                        >
                          {deletingId === outline.id ? (
                            <Loader2 className="w-4 h-4 text-destructive animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
