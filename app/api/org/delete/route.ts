import { getSessionUser } from "@/lib/auth"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { compare } from "bcryptjs"
import { z } from "zod"
import {
  unauthorizedResponse,
  badRequestResponse,
  forbiddenResponse,
  notFoundResponse,
  successResponse,
  handleApiError,
} from "@/lib/api-response"

const deleteOrgSchema = z.object({
  orgId: z.string().min(1, "Organization ID is required"),
  password: z.string().min(1, "Password is required"),
})

// DELETE /api/org/delete
export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const data = deleteOrgSchema.parse(body)

    // Find the organization
    const org = await prisma.organization.findUnique({
      where: { id: data.orgId },
    })

    if (!org) {
      return notFoundResponse("Organization")
    }

    // Verify user is the owner
    if (org.ownerId !== user.id) {
      return forbiddenResponse("Only the organization owner can delete the organization")
    }

    // Get owner's email and account for password verification
    const owner = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
      },
    })

    if (!owner) {
      return notFoundResponse("User")
    }

    // Get account with password (better-auth stores password in Account table)
    const account = await prisma.account.findFirst({
      where: {
        userId: user.id,
        providerId: "credential",
      },
      select: {
        password: true,
      },
    })

    if (!account || !account.password) {
      return badRequestResponse(
        "Password verification failed. Please ensure your account has a password set.",
        "NO_PASSWORD"
      )
    }

    // Verify password using better-auth's signInEmail API
    // This ensures we use the same password verification method as the auth system
    try {
      // Create headers without cookies to avoid affecting current session
      const testHeaders = new Headers()
      testHeaders.set("Content-Type", "application/json")
      
      // Use better-auth's signInEmail to verify password
      const signInResult = await auth.api.signInEmail({
        body: {
          email: owner.email,
          password: data.password,
        },
        headers: testHeaders,
      })

      // If signIn fails or has error, password is incorrect
      if (signInResult?.error) {
        const errorMessage = signInResult.error.message || ""
        if (errorMessage.toLowerCase().includes("password") || 
            errorMessage.toLowerCase().includes("invalid") || 
            errorMessage.toLowerCase().includes("incorrect") ||
            errorMessage.toLowerCase().includes("credentials")) {
          return badRequestResponse("Incorrect password. Please try again.", "INVALID_PASSWORD")
        }
        return badRequestResponse("Incorrect password. Please try again.", "INVALID_PASSWORD")
      }

      // If no result or no user in result, password is incorrect
      if (!signInResult || !signInResult.user) {
        return badRequestResponse("Incorrect password. Please try again.", "INVALID_PASSWORD")
      }
    } catch (error: any) {
      // If there's an error, it means password verification failed
      console.error("Password verification error:", error)
      const errorMessage = error?.message || ""
      if (errorMessage.toLowerCase().includes("password") || 
          errorMessage.toLowerCase().includes("invalid") || 
          errorMessage.toLowerCase().includes("incorrect") ||
          errorMessage.toLowerCase().includes("credentials")) {
        return badRequestResponse("Incorrect password. Please try again.", "INVALID_PASSWORD")
      }
      // For other errors, still return invalid password
      return badRequestResponse("Incorrect password. Please try again.", "INVALID_PASSWORD")
    }

    // Delete the organization (cascade will handle related records)
    await prisma.organization.delete({
      where: { id: data.orgId },
    })

    return successResponse(
      undefined,
      `Organization "${org.name}" has been deleted successfully`
    )
  } catch (error) {
    return handleApiError(error)
  }
}

