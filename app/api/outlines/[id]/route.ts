import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkOrgAccess, checkOrgOwner } from "@/lib/auth-utils"
import { updateOutlineSchema } from "@/lib/validation"
import {
  unauthorizedResponse,
  badRequestResponse,
  forbiddenResponse,
  notFoundResponse,
  successResponse,
  handleApiError,
} from "@/lib/api-response"

// PATCH /api/outlines/[id]
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const { id } = await params
    const body = await request.json()
    const data = updateOutlineSchema.parse(body)

    // Verify outline exists and get its organization
    const existingOutline = await prisma.outline.findUnique({
      where: { id },
      select: { organizationId: true },
    })

    if (!existingOutline) {
      return notFoundResponse("Outline")
    }

    // Verify the orgId in request matches the outline's organization
    if (data.orgId !== existingOutline.organizationId) {
      return badRequestResponse("Organization ID mismatch", "ORG_ID_MISMATCH")
    }

    const access = await checkOrgAccess(user.id, data.orgId)
    if (!access.hasAccess) {
      return forbiddenResponse("You do not have access to this organization")
    }

    // Only organization owners can update outlines
    if (!access.isOwner) {
      return forbiddenResponse("Only organization owners can update outlines")
    }

    // Build update data object
    const updateData: {
      header?: string
      sectionType?: string
      status?: string
      target?: number
      limit?: number
      reviewer?: string
    } = {}

    if (data.header !== undefined) updateData.header = data.header
    if (data.sectionType !== undefined) updateData.sectionType = data.sectionType
    if (data.status !== undefined) updateData.status = data.status
    if (data.target !== undefined) updateData.target = data.target
    if (data.limit !== undefined) updateData.limit = data.limit
    if (data.reviewer !== undefined) updateData.reviewer = data.reviewer

    if (Object.keys(updateData).length === 0) {
      return badRequestResponse("No fields to update", "NO_UPDATE_FIELDS")
    }

    const outline = await prisma.outline.update({
      where: { id },
      data: updateData,
    })

    return successResponse({ outline }, "Outline updated successfully")
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/outlines/[id]
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get("orgId")

    if (!orgId) {
      return badRequestResponse("orgId is required", "MISSING_ORG_ID")
    }

    const { id } = await params

    // Verify outline exists and get its organization
    const existingOutline = await prisma.outline.findUnique({
      where: { id },
      select: { organizationId: true },
    })

    if (!existingOutline) {
      return notFoundResponse("Outline")
    }

    // Verify the orgId in request matches the outline's organization
    if (orgId !== existingOutline.organizationId) {
      return badRequestResponse("Organization ID mismatch", "ORG_ID_MISMATCH")
    }

    const access = await checkOrgAccess(user.id, orgId)
    if (!access.hasAccess) {
      return forbiddenResponse("You do not have access to this organization")
    }

    // Only organization owners can delete outlines
    if (!access.isOwner) {
      return forbiddenResponse("Only organization owners can delete outlines")
    }

    await prisma.outline.delete({
      where: { id },
    })

    return successResponse(undefined, "Outline deleted successfully")
  } catch (error) {
    return handleApiError(error)
  }
}
