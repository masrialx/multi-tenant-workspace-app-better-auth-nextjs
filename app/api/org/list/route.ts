import {  getSessionUser } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()


// GET /api/org/list
export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    console.log("@@User", user)
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all organizations where user is a member
    const organizations = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      include: {
        organization: true,
      },
    })

    return Response.json({
      organizations: organizations.map((m) => ({
        ...m.organization,
        role: m.role,
      })),
    })
  } catch (error) {
    console.error("GET /api/org/list error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
