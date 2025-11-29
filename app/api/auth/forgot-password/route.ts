import { getSessionUser } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"
import { randomBytes } from "crypto"
import { sendEmail } from "@/lib/email"
import { getPasswordResetTemplate } from "@/lib/email-templates"
import { validateEmailFormat, canReceiveEmails, getEmailErrorMessage } from "@/lib/email-validation"

const prisma = new PrismaClient()

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate email format first
    const emailValidation = validateEmailFormat(body.email)
    if (!emailValidation.valid) {
      return Response.json({
        error: "Email is not valid",
        errorCode: emailValidation.errorCode,
        success: false,
        message: `The email address "${body.email}" is not valid. ${getEmailErrorMessage(emailValidation)} I cannot send email to this address.`,
      }, { status: 400 })
    }

    // Check if email can receive emails
    const emailReceivable = canReceiveEmails(body.email)
    if (!emailReceivable.valid) {
      return Response.json({
        error: "Email cannot receive messages",
        errorCode: emailReceivable.errorCode,
        success: false,
        message: `The email address "${body.email}" cannot receive emails. ${getEmailErrorMessage(emailReceivable)} I cannot send email to this address.`,
      }, { status: 400 })
    }

    const data = forgotPasswordSchema.parse(body)

    // Check if email exists first
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (!user) {
      return Response.json({ 
        error: "No account found with this email address. Please check your email and try again.",
        success: false,
        errorCode: "USER_NOT_FOUND",
      }, { status: 404 })
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString("hex")
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1) // Token expires in 1 hour

    // Store reset token in verification table
    await prisma.verification.upsert({
      where: {
        identifier_value: {
          identifier: "password-reset",
          value: resetToken,
        },
      },
      update: {
        userId: user.id,
        expiresAt,
      },
      create: {
        id: randomBytes(16).toString("hex"),
        identifier: "password-reset",
        value: resetToken,
        userId: user.id,
        expiresAt,
      },
    })

    // Send email
    const resetLink = `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/auth/reset-password?token=${resetToken}`

    const subject = "Reset Your Password"
    const text = `Hi,

You requested to reset your password. Click the link below to reset it:

${resetLink}

This link will expire in 7 hours.

If you didn't request this, please ignore this email.

Thanks.`

    try {
      await sendEmail({
        to: user.email,
        subject,
        text,
        html: getPasswordResetTemplate(resetLink, "7 hours"),
      })
      
      return Response.json({ 
        success: true,
        message: "Password reset link has been sent to your email address." 
      })
    } catch (emailError: any) {
      console.error("Failed to send password reset email:", emailError)
      
      // Check error type and provide specific message
      let errorMessage = "Failed to send password reset email"
      let errorCode = "EMAIL_SEND_FAILED"

      if (emailError.message?.includes("authentication")) {
        errorMessage = "Email service authentication failed. Please contact support."
        errorCode = "SMTP_AUTH_ERROR"
      } else if (emailError.message?.includes("timeout") || emailError.message?.includes("connection")) {
        errorMessage = "Unable to connect to email server. Please try again later."
        errorCode = "SMTP_CONNECTION_ERROR"
      } else if (emailError.message?.includes("invalid") || emailError.message?.includes("not valid")) {
        errorMessage = "The email address is invalid and cannot receive emails. Please use a valid email address."
        errorCode = "INVALID_EMAIL_DELIVERY"
      }

      return Response.json({
        error: errorMessage,
        errorCode,
        success: false,
        message: "We were unable to send the password reset email. Please verify your email address is correct and try again.",
      }, { status: 500 })
    }
  } catch (error) {
    console.error("POST /api/auth/forgot-password error:", error)
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

