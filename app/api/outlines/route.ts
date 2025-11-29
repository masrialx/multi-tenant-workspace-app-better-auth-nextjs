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

// GET /api/outlines?orgId=...
export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get("orgId")

    if (!orgId || orgId === "undefined" || orgId === "null") {
      return Response.json({ error: "orgId is required" }, { status: 400 })
    }

    const access = await checkOrgAccess(user.id, orgId)
    if (!access) {
      return Response.json({ error: "Access denied" }, { status: 403 })
    }

    const outlines = await prisma.outline.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    })

    return Response.json({ outlines })
  } catch (error) {
    console.error("GET /api/outlines error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/outlines
const outlineSchema = z.object({
  orgId: z.string(),
  header: z.string().min(1),
  sectionType: z.enum([
    "Table of Contents",
    "Executive Summary",
    "Technical Approach",
    "Design",
    "Capabilities",
    "Focus Document",
    "Narrative",
  ]),
  status: z.enum(["Pending", "In-Progress", "Completed"]).default("Pending"),
  target: z.number().default(0),
  limit: z.number().default(0),
  reviewer: z.enum(["Assim", "Bini", "Mami"]).default("Assim"),
})

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = outlineSchema.parse(await request.json())

    const access = await checkOrgAccess(user.id, data.orgId)
    if (!access) {
      return Response.json({ error: "Access denied" }, { status: 403 })
    }

    // Only organization owners can create outlines
    const isOwner = await checkOrgOwner(user.id, data.orgId)
    if (!isOwner) {
      return Response.json({ error: "Only organization owners can create outlines" }, { status: 403 })
    }

    const outline = await prisma.outline.create({
      data: {
        organizationId: data.orgId,
        header: data.header,
        sectionType: data.sectionType,
        status: data.status,
        target: data.target,
        limit: data.limit,
        reviewer: data.reviewer,
      },
    })

    return Response.json({ outline })
  } catch (error) {
    console.error("POST /api/outlines error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
