import { getSessionUser } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { randomBytes } from "crypto"
import { sendEmail } from "@/lib/email"
import { getEmailVerificationTemplate } from "@/lib/email-templates"
import { validateEmailFormat, canReceiveEmails, getEmailErrorMessage } from "@/lib/email-validation"

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if already verified
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    })

    if (!dbUser) {
      return Response.json({ error: "User not found" }, { status: 404 })
    }

    // Validate email format before sending
    const emailValidation = validateEmailFormat(dbUser.email)
    if (!emailValidation.valid) {
      return Response.json({
        error: "Email is not valid",
        errorCode: emailValidation.errorCode,
        success: false,
        message: `Your email address "${dbUser.email}" is not valid. ${getEmailErrorMessage(emailValidation)} Please update your email address in your account settings.`,
      }, { status: 400 })
    }

    // Check if email can receive emails
    const emailReceivable = canReceiveEmails(dbUser.email)
    if (!emailReceivable.valid) {
      return Response.json({
        error: "Email cannot receive messages",
        errorCode: emailReceivable.errorCode,
        success: false,
        message: `Your email address "${dbUser.email}" cannot receive emails. ${getEmailErrorMessage(emailReceivable)} Please update your email address to a valid one.`,
      }, { status: 400 })
    }

    if (dbUser.emailVerified) {
      return Response.json({ error: "Email is already verified" }, { status: 400 })
    }

    // Generate verification token
    const verificationToken = randomBytes(32).toString("hex")
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 7) // Token expires in 7 hours

    // Store verification token
    await prisma.verification.upsert({
      where: {
        identifier_value: {
          identifier: "email-verification",
          value: verificationToken,
        },
      },
      update: {
        userId: user.id,
        expiresAt,
      },
      create: {
        id: randomBytes(16).toString("hex"),
        identifier: "email-verification",
        value: verificationToken,
        userId: user.id,
        expiresAt,
      },
    })

    // Send email
        const verificationLink = `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/auth/verify-email?token=${verificationToken}`

        const subject = "Verify Your Email Address"
        const text = `Hi,

Please verify your email address by clicking the link below:

${verificationLink}

This link will expire in 7 hours.

If you didn't create an account, please ignore this email.

Thanks.`

        try {
          await sendEmail({
            to: dbUser.email,
            subject,
            text,
            html: getEmailVerificationTemplate(verificationLink, "7 hours"),
          })
      
      return Response.json({ success: true, message: "Verification email sent" })
    } catch (emailError: any) {
      console.error("❌ Failed to send verification email to:", dbUser.email, {
        error: emailError.message,
        code: emailError.code,
      })
      
      // Check error type and provide specific message
      let errorMessage = "Failed to send verification email"
      let errorCode = "EMAIL_SEND_FAILED"
      let userMessage = "We were unable to send the verification email. Please verify your email address is correct and try again."

      // Check if it's an invalid email error (from validation)
      if (emailError.message?.includes("Invalid email address") || emailError.message?.includes("Email cannot receive")) {
        errorMessage = "Email is not valid"
        errorCode = "INVALID_EMAIL"
        userMessage = `Your email address "${dbUser.email}" is not valid. ${emailError.message.replace("Invalid email address: ", "").replace("Email cannot receive messages: ", "")} I cannot send email to this address.`
      } else if (emailError.message?.includes("authentication") || emailError.code === "EAUTH") {
        errorMessage = "Email service authentication failed. Please contact support."
        errorCode = "SMTP_AUTH_ERROR"
        userMessage = "Email service configuration error. Please contact support."
      } else if (emailError.message?.includes("timeout") || emailError.message?.includes("connection") || emailError.code === "ETIMEDOUT" || emailError.code === "ECONNECTION") {
        errorMessage = "Unable to connect to email server. Please try again later."
        errorCode = "SMTP_CONNECTION_ERROR"
        userMessage = "Unable to connect to email server. Please try again in a few minutes."
      } else if (emailError.message?.includes("invalid") || emailError.message?.includes("not valid") || emailError.code === "EENVELOPE") {
        errorMessage = "Your email address is invalid and cannot receive emails."
        errorCode = "INVALID_EMAIL_DELIVERY"
        userMessage = `Your email address "${dbUser.email}" appears to be invalid or cannot receive emails. Please update your email address.`
      }

      return Response.json({
        error: errorMessage,
        errorCode,
        success: false,
        retryable: true,
        message: userMessage,
      }, { status: 500 })
    }
  } catch (error) {
    console.error("POST /api/auth/send-verification error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

