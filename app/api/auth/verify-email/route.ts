import { PrismaClient } from "@prisma/client"
import { z } from "zod"

const prisma = new PrismaClient()

const verifyEmailSchema = z.object({
  token: z.string(),
})

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
      return Response.json({ error: "Invalid or expired verification token" }, { status: 400 })
    }

    // Check if token is expired
    if (verification.expiresAt < new Date()) {
      await prisma.verification.delete({
        where: { id: verification.id },
      })
      return Response.json({ error: "Verification token has expired" }, { status: 400 })
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

    return Response.json({ success: true, message: "Email verified successfully" })
  } catch (error) {
    console.error("POST /api/auth/verify-email error:", error)
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

