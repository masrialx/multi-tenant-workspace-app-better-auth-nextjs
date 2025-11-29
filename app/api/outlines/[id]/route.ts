import { getSessionUser } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"

const prisma = new PrismaClient()

async function checkOrgAccess(userId: string, orgId: string) {
  return prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: orgId,
        userId,
      },
    },
  })
}

async function checkOrgOwner(userId: string, orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  })

  return org?.ownerId === userId
}

// PATCH /api/outlines/[id]
const updateSchema = z.object({
  orgId: z.string(),
  header: z.string().min(1).optional(),
  sectionType: z
    .enum([
      "Table of Contents",
      "Executive Summary",
      "Technical Approach",
      "Design",
      "Capabilities",
      "Focus Document",
      "Narrative",
    ])
    .optional(),
  status: z.enum(["Pending", "In-Progress", "Completed"]).optional(),
  target: z.number().optional(),
  limit: z.number().optional(),
  reviewer: z.enum(["Assim", "Bini", "Mami"]).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = updateSchema.parse(await request.json())

    const access = await checkOrgAccess(user.id, data.orgId)
    if (!access) {
      return Response.json({ error: "Access denied" }, { status: 403 })
    }

    // Only organization owners can update outlines
    const isOwner = await checkOrgOwner(user.id, data.orgId)
    if (!isOwner) {
      return Response.json({ error: "Only organization owners can update outlines" }, { status: 403 })
    }

    const { id } = await params
    const outline = await prisma.outline.update({
      where: { id },
      data: {
        ...(data.header && { header: data.header }),
        ...(data.sectionType && { sectionType: data.sectionType }),
        ...(data.status && { status: data.status }),
        ...(data.target !== undefined && { target: data.target }),
        ...(data.limit !== undefined && { limit: data.limit }),
        ...(data.reviewer && { reviewer: data.reviewer }),
      },
    })

    return Response.json({ outline })
  } catch (error) {
    console.error("PATCH /api/outlines/[id] error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/outlines/[id]
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get("orgId")

    if (!orgId) {
      return Response.json({ error: "orgId is required" }, { status: 400 })
    }

    const access = await checkOrgAccess(user.id, orgId)
    if (!access) {
      return Response.json({ error: "Access denied" }, { status: 403 })
    }

    // Only organization owners can delete outlines
    const isOwner = await checkOrgOwner(user.id, orgId)
    if (!isOwner) {
      return Response.json({ error: "Only organization owners can delete outlines" }, { status: 403 })
    }

    const { id } = await params
    await prisma.outline.delete({
      where: { id },
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/outlines/[id] error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
