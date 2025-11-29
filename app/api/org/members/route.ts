import { getSessionUser } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { headers } from "next/headers"
import { z } from "zod"

const prisma = new PrismaClient()


async function checkOrgAccess(userId: string, orgId: string) {
  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: orgId,
        userId,
      },
    },
  })

  return member
}

async function checkOrgOwner(userId: string, orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  })

  return org?.ownerId === userId
}

// GET /api/org/members?orgId=...
export async function GET(request: Request) {
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

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    // Get organization details
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        ownerId: true,
      },
    })

    return Response.json({ 
      members,
      organization: organization || null
    })
  } catch (error) {
    console.error("GET /api/org/members error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/org/members (invite)
const inviteSchema = z.object({
  orgId: z.string(),
  email: z.string().email(),
  role: z.enum(["owner", "member"]).default("member"),
})

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Read request body once
    const body = await request.json()
    const data = inviteSchema.parse(body)

    const isOwner = await checkOrgOwner(user.id, data.orgId)
    if (!isOwner) {
      return Response.json({ error: "Only organization owner can invite members" }, { status: 403 })
    }

    // Check if user exists
    const invitedUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (!invitedUser) {
      return Response.json({ error: "User not found. The email address does not exist in our system." }, { status: 404 })
    }

    // Check if already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: data.orgId,
          userId: invitedUser.id,
        },
      },
    })

    if (existingMember) {
      return Response.json({ error: "User is already a member" }, { status: 400 })
    }

    // Add member
    const member = await prisma.organizationMember.create({
      data: {
        organizationId: data.orgId,
        userId: invitedUser.id,
        role: data.role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    return Response.json({ member })
  } catch (error) {
    console.error("POST /api/org/members error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/org/members?orgId=...&userId=...
export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get("orgId")
    const userId = searchParams.get("userId")

    if (!orgId || !userId) {
      return Response.json({ error: "orgId and userId are required" }, { status: 400 })
    }

    const isOwner = await checkOrgOwner(user.id, orgId)
    if (!isOwner) {
      return Response.json({ error: "Only organization owner can remove members" }, { status: 403 })
    }

    // Check if trying to remove the owner
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    })

    if (org?.ownerId === userId) {
      return Response.json({ error: "Cannot remove the organization owner" }, { status: 400 })
    }

    await prisma.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/org/members error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
