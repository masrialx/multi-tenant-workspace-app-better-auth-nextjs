import { getSessionUser } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"
const prisma = new PrismaClient()


const createOrgSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
})

// POST /api/org/create
export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = createOrgSchema.parse(await request.json())

    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

    // Check if slug already exists
    const existingOrg = await prisma.organization.findUnique({
      where: { slug },
    })

    if (existingOrg) {
      return Response.json({ error: "Organization slug already exists" }, { status: 400 })
    }

    // Create organization
    const org = await prisma.organization.create({
      data: {
        name: data.name,
        slug,
        ownerId: user.id,
      },
    })

    // Add owner as member
    await prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: "owner",
      },
    })

    return Response.json({ organization: org })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 })
    }

    console.error("POST /api/org/create error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
