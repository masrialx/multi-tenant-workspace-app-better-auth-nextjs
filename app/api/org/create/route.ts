import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createOrgSchema, generateSlug } from "@/lib/validation"
import { unauthorizedResponse, badRequestResponse, successResponse, handleApiError } from "@/lib/api-response"

// POST /api/org/create
export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return unauthorizedResponse("You must be logged in to create an organization")
    }

    const body = await request.json()
    const data = createOrgSchema.parse(body)

    // Generate slug from name
    const slug = generateSlug(data.name)

    if (!slug) {
      return badRequestResponse("Unable to generate a valid organization slug from the provided name")
    }

    // Check if slug already exists
    const existingOrg = await prisma.organization.findUnique({
      where: { slug },
    })

    if (existingOrg) {
      return badRequestResponse(
        "An organization with this name already exists. Please choose a different name.",
        "SLUG_EXISTS"
      )
    }

    // Create organization and add owner as member in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create organization
      const org = await tx.organization.create({
        data: {
          name: data.name,
          slug,
          ownerId: user.id,
        },
      })

      // Add owner as member
      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: "owner",
        },
      })

      return org
    })

    return successResponse({ organization: result }, "Organization created successfully")
  } catch (error) {
    return handleApiError(error)
  }
}
