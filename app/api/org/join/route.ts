import { getSessionUser } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"

const prisma = new PrismaClient()


const joinOrgSchema = z.object({
  slug: z.string().min(1, "Organization slug is required"),
})

// POST /api/org/join
export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const data = joinOrgSchema.parse(body)

    // Normalize slug (same as in create route)
    const normalizedSlug = data.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

    if (!normalizedSlug) {
      return Response.json({ error: "Invalid organization slug" }, { status: 400 })
    }

    // Find organization by slug
    const org = await prisma.organization.findUnique({
      where: { slug: normalizedSlug },
    })

    if (!org) {
      console.log(`Organization not found for slug: "${normalizedSlug}" (original: "${data.slug}")`)
      return Response.json({ 
        error: `Organization with slug "${normalizedSlug}" not found. Please check the slug and try again.` 
      }, { status: 404 })
    }

    // Check if already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: user.id,
        },
      },
    })

    if (existingMember) {
      return Response.json({ error: "You are already a member of this organization" }, { status: 400 })
    }

    // Check if there's already a pending join request
    const existingRequest = await prisma.notification.findFirst({
      where: {
        type: "join_request",
        userId: org.ownerId,
        read: false,
        metadata: {
          contains: `"requestingUserId":"${user.id}"`,
        },
      },
    })

    if (existingRequest) {
      return Response.json({ 
        error: "You already have a pending join request for this organization",
        pending: true 
      }, { status: 400 })
    }

    // Create notification for organization owner
    await prisma.notification.create({
      data: {
        type: "join_request",
        title: "New Join Request",
        message: `${user.name || user.email} wants to join "${org.name}"`,
        userId: org.ownerId,
        metadata: JSON.stringify({
          organizationId: org.id,
          organizationName: org.name,
          requestingUserId: user.id,
          requestingUserName: user.name || user.email,
          requestingUserEmail: user.email,
        }),
      },
    })

    return Response.json({ 
      success: true,
      message: "Join request sent. The organization owner will be notified.",
      organization: org 
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 })
    }

    console.error("POST /api/org/join error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
