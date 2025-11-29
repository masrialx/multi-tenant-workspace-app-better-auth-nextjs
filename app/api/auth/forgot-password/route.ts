import { prisma } from "@/lib/prisma"
import { forgotPasswordSchema } from "@/lib/validation"
import { randomBytes } from "crypto"
import { sendEmail } from "@/lib/email"
import { getPasswordResetTemplate } from "@/lib/email-templates"
import { validateEmailFormat, canReceiveEmails, getEmailErrorMessage } from "@/lib/email-validation"
import { badRequestResponse, notFoundResponse, successResponse, handleApiError } from "@/lib/api-response"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate email format first
    const emailValidation = validateEmailFormat(body.email)
    if (!emailValidation.valid) {
      return badRequestResponse(
        `The email address "${body.email}" is not valid. ${getEmailErrorMessage(emailValidation)}`,
        emailValidation.errorCode
      )
    }

    // Check if email can receive emails
    const emailReceivable = canReceiveEmails(body.email)
    if (!emailReceivable.valid) {
      return badRequestResponse(
        `The email address "${body.email}" cannot receive emails. ${getEmailErrorMessage(emailReceivable)}`,
        emailReceivable.errorCode
      )
    }

    const data = forgotPasswordSchema.parse(body)

    // Check if email exists first
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (!user) {
      // Don't reveal if user exists for security (prevent email enumeration)
      // Still send success response to prevent user enumeration attacks
      return successResponse(
        undefined,
        "If an account exists with this email, a password reset link has been sent."
      )
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString("hex")
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 7) // Token expires in 7 hours (matches email message)

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
      
      // Don't reveal if user exists for security (prevent email enumeration)
      return successResponse(
        undefined,
        "If an account exists with this email, a password reset link has been sent."
      )
    } catch (emailError: any) {
      console.error("Failed to send password reset email:", emailError)
      
      // Don't reveal email send failures to prevent user enumeration
      // Log error but return generic success message
      return successResponse(
        undefined,
        "If an account exists with this email, a password reset link has been sent."
      )
    }
  } catch (error) {
    return handleApiError(error)
  }
}

