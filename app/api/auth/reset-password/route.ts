import { getSessionUser } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

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
      return Response.json({ error: "Invalid or expired reset token" }, { status: 400 })
    }

    // Check if token is expired
    if (verification.expiresAt < new Date()) {
      await prisma.verification.delete({
        where: { id: verification.id },
      })
      return Response.json({ error: "Reset token has expired" }, { status: 400 })
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

    return Response.json({ success: true, message: "Password reset successfully" })
  } catch (error) {
    console.error("POST /api/auth/reset-password error:", error)
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

