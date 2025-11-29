import { prisma } from "@/lib/prisma"
import { verifyEmailSchema } from "@/lib/validation"
import { badRequestResponse, successResponse, handleApiError } from "@/lib/api-response"

export async function POST(request: Request) {
  try {
    const data = verifyEmailSchema.parse(await request.json())

    // Find verification token
    const verification = await prisma.verification.findUnique({
      where: {
        identifier_value: {
          identifier: "email-verification",
          value: data.token,
        },
      },
      include: {
        user: true,
      },
    })

    if (!verification) {
      return badRequestResponse("Invalid or expired verification token", "INVALID_TOKEN")
    }

    // Check if token is expired
    if (verification.expiresAt < new Date()) {
      await prisma.verification.delete({
        where: { id: verification.id },
      })
      return badRequestResponse("Verification token has expired. Please request a new verification email.", "TOKEN_EXPIRED")
    }

    // Update user email as verified
    await prisma.user.update({
      where: { id: verification.userId },
      data: {
        emailVerified: true,
      },
    })

    // Delete used token
    await prisma.verification.delete({
      where: { id: verification.id },
    })

    return successResponse(undefined, "Email verified successfully")
  } catch (error) {
    return handleApiError(error)
  }
}

