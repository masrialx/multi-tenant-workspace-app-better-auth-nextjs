import { prisma } from "@/lib/prisma"
import { resetPasswordSchema } from "@/lib/validation"
import { hash } from "bcryptjs"
import { badRequestResponse, successResponse, handleApiError } from "@/lib/api-response"

export async function POST(request: Request) {
  try {
    const data = resetPasswordSchema.parse(await request.json())

    // Find verification token
    const verification = await prisma.verification.findUnique({
      where: {
        identifier_value: {
          identifier: "password-reset",
          value: data.token,
        },
      },
      include: {
        user: true,
      },
    })

    if (!verification) {
      return badRequestResponse("Invalid or expired reset token", "INVALID_TOKEN")
    }

    // Check if token is expired
    if (verification.expiresAt < new Date()) {
      await prisma.verification.delete({
        where: { id: verification.id },
      })
      return badRequestResponse("Reset token has expired. Please request a new password reset.", "TOKEN_EXPIRED")
    }

    // Hash new password
    const hashedPassword = await hash(data.password, 10)

    // Update user password
    await prisma.user.update({
      where: { id: verification.userId },
      data: {
        password: hashedPassword,
      },
    })

    // Delete used token
    await prisma.verification.delete({
      where: { id: verification.id },
    })

    return successResponse(undefined, "Password reset successfully")
  } catch (error) {
    return handleApiError(error)
  }
}

