import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createOrgSchema, generateSlug } from "@/lib/validation"
import { unauthorizedResponse, badRequestResponse, successResponse, handleApiError } from "@/lib/api-response"

// Type helper for Prisma transaction client
type PrismaTransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

// POST /api/org/create
export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return unauthorizedResponse("You must be logged in to create an organization")
    }

    const body = await request.json()
    const data = createOrgSchema.parse(body)

    // Check if the current user already has an organization with the same name
    // Same user cannot create duplicate organization names, but different users can
    const userExistingOrg = await prisma.organization.findFirst({
      where: {
        ownerId: user.id,
        name: data.name.trim(),
      },
    })

    if (userExistingOrg) {
      return badRequestResponse(
        "You already have an organization with this name. Please choose a different name.",
        "DUPLICATE_ORG_NAME"
      )
    }

    // Generate base slug from name
    const baseSlug = generateSlug(data.name)

    if (!baseSlug) {
      return badRequestResponse("Unable to generate a valid organization slug from the provided name")
    }

    // Generate a unique slug by appending a suffix if needed
    // This allows different users to have organizations with the same name
    // (but same user cannot, as checked above)
    let slug = baseSlug
    let attempts = 0
    const maxAttempts = 20

    while (attempts < maxAttempts) {
      const existingOrg = await prisma.organization.findUnique({
        where: { slug },
      })

      if (!existingOrg) {
        // Slug is available, use it
        break
      }

      // Slug exists (from another user), generate a new one with a random suffix
      const timestamp = Date.now().toString(36).slice(-6) // Last 6 chars of timestamp in base36
      const randomSuffix = Math.random().toString(36).substring(2, 6) // 4 random alphanumeric characters
      slug = `${baseSlug}-${timestamp}-${randomSuffix}`
      attempts++
    }

    if (attempts >= maxAttempts) {
      return badRequestResponse(
        "Unable to generate a unique organization slug. Please try again with a different name.",
        "SLUG_GENERATION_FAILED"
      )
    }

    // Create organization and add owner as member in a transaction
    const result = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
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
