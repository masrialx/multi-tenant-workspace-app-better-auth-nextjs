import { prisma } from "@/lib/prisma"
import { unauthorizedResponse, badRequestResponse, successResponse, handleApiError } from "@/lib/api-response"
import { getSessionUser } from "@/lib/auth"
import { z } from "zod"

const checkNameSchema = z.object({
  name: z
    .string()
    .min(1, "Organization name is required")
    .max(100, "Organization name must be less than 100 characters")
    .trim(),
})

// GET /api/org/check-name?name=OrganizationName
export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return unauthorizedResponse("You must be logged in to check organization name")
    }

    const { searchParams } = new URL(request.url)
    const name = searchParams.get("name")

    if (!name) {
      return badRequestResponse("Organization name is required")
    }

    const data = checkNameSchema.parse({ name })

    // Check if any organization with this name exists globally
    const existingOrg = await prisma.organization.findFirst({
      where: {
        name: data.name,
      },
    })

    return successResponse(
      { exists: !!existingOrg },
      existingOrg ? "Organization name already exists" : "Organization name is available"
    )
  } catch (error) {
    return handleApiError(error)
  }
}

