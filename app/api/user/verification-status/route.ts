import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  unauthorizedResponse,
  notFoundResponse,
  successResponse,
  handleApiError,
} from "@/lib/api-response"

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        emailVerified: true,
      },
    })

    if (!dbUser) {
      return notFoundResponse("User")
    }

    return successResponse({ emailVerified: dbUser.emailVerified })
  } catch (error) {
    return handleApiError(error)
  }
}

