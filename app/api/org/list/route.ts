import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { unauthorizedResponse, successResponse, handleApiError } from "@/lib/api-response"

// GET /api/org/list
export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Get all organizations where user is a member
    const organizations = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            createdAt: true,
            updatedAt: true,
            ownerId: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return successResponse({
      organizations: organizations.map((m) => ({
        ...m.organization,
        role: m.role,
      })),
    })
  } catch (error) {
    return handleApiError(error)
  }
}
