import { getSessionUser } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        emailVerified: true,
      },
    })

    if (!dbUser) {
      return Response.json({ error: "User not found" }, { status: 404 })
    }

    return Response.json({ emailVerified: dbUser.emailVerified })
  } catch (error) {
    console.error("GET /api/user/verification-status error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

