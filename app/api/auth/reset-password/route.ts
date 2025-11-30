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

    // Hash new password using bcryptjs (matching better-auth configuration)
    const hashedPassword = await hash(data.password, 10)

    // Find the user's account (better-auth stores password in Account table, not User table)
    const account = await prisma.account.findFirst({
      where: {
        userId: verification.userId,
        providerId: "credential", // better-auth uses "credential" for email/password accounts
      },
    })

    if (!account) {
      return badRequestResponse(
        "Account not found. Please contact support.",
        "ACCOUNT_NOT_FOUND"
      )
    }

    // Update password in Account table (this is what better-auth uses for authentication)
    await prisma.account.update({
      where: { id: account.id },
      data: {
        password: hashedPassword,
      },
    })

    // Also update User.password for consistency (optional, but good for data integrity)
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

