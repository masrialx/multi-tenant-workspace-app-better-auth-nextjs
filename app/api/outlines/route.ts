import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkOrgAccess, checkOrgOwner } from "@/lib/auth-utils"
import { createOutlineSchema } from "@/lib/validation"
import {
  unauthorizedResponse,
  badRequestResponse,
  forbiddenResponse,
  successResponse,
  handleApiError,
} from "@/lib/api-response"

// GET /api/outlines?orgId=...
export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get("orgId")

    if (!orgId || orgId === "undefined" || orgId === "null") {
      return badRequestResponse("orgId is required", "MISSING_ORG_ID")
    }

    const access = await checkOrgAccess(user.id, orgId)
    if (!access.hasAccess) {
      return forbiddenResponse("You do not have access to this organization")
    }

    const outlines = await prisma.outline.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    })

    return successResponse({ outlines })
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/outlines
export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const data = createOutlineSchema.parse(body)

    const access = await checkOrgAccess(user.id, data.orgId)
    if (!access.hasAccess) {
      return forbiddenResponse("You do not have access to this organization")
    }

    // Only organization owners can create outlines
    if (!access.isOwner) {
      return forbiddenResponse("Only organization owners can create outlines")
    }

    const outline = await prisma.outline.create({
      data: {
        organizationId: data.orgId,
        header: data.header,
        sectionType: data.sectionType,
        status: data.status,
        target: data.target,
        limit: data.limit,
        reviewer: data.reviewer,
      },
    })

    return successResponse({ outline }, "Outline created successfully")
  } catch (error) {
    return handleApiError(error)
  }
}
