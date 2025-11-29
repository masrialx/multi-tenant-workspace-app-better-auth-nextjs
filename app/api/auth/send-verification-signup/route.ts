import { PrismaClient } from "@prisma/client"
import { randomBytes } from "crypto"
import { sendEmail } from "@/lib/email"
import { getEmailVerificationTemplate } from "@/lib/email-templates"
import { validateEmailFormat, canReceiveEmails, getEmailErrorMessage } from "@/lib/email-validation"
import { z } from "zod"

const prisma = new PrismaClient()

const sendVerificationSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
})

export async function POST(request: Request) {
  try {
    const data = sendVerificationSchema.parse(await request.json())

    // Check if user exists
    const dbUser = await prisma.user.findUnique({
      where: { id: data.userId },
    })

    if (!dbUser) {
      return Response.json({ error: "User not found" }, { status: 404 })
    }

    if (dbUser.email !== data.email) {
      return Response.json({ error: "Email mismatch" }, { status: 400 })
    }

    // Email validation is now done in sendEmail() function
    // But we can still do a quick check here for better error messages
    const emailValidation = validateEmailFormat(data.email)
    if (!emailValidation.valid) {
      return Response.json({
        error: "Email is not valid",
        errorCode: emailValidation.errorCode,
        success: false,
        message: `The email address "${data.email}" is not valid. ${getEmailErrorMessage(emailValidation)} Please use a valid email address.`,
      }, { status: 400 })
    }

    const emailReceivable = canReceiveEmails(data.email)
    if (!emailReceivable.valid) {
      return Response.json({
        error: "Email cannot receive messages",
        errorCode: emailReceivable.errorCode,
        success: false,
        message: `The email address "${data.email}" cannot receive emails. ${getEmailErrorMessage(emailReceivable)} Please use a valid email address.`,
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
        userId: data.userId,
        expiresAt,
      },
      create: {
        id: randomBytes(16).toString("hex"),
        identifier: "email-verification",
        value: verificationToken,
        userId: data.userId,
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
          console.log("📧 Attempting to send verification email to:", data.email)
          const emailResult = await sendEmail({
            to: data.email,
            subject,
            text,
            html: getEmailVerificationTemplate(verificationLink, "7 hours"),
          })
          
          console.log("✅ Verification email sent successfully:", emailResult)
          return Response.json({ 
            success: true, 
            message: "Verification email sent successfully. Please check your inbox (and spam folder).",
            emailResult,
          })
    } catch (emailError: any) {
      console.error("❌ Failed to send verification email to:", data.email, {
        error: emailError.message,
        code: emailError.code,
        stack: emailError.stack,
      })
      
      // Check error type and provide specific message
      let errorMessage = "Failed to send verification email"
      let errorCode = "EMAIL_SEND_FAILED"
      let userMessage = "We were unable to send the verification email. Please verify your email address is correct and try again."

      // Check if it's an invalid email error (from validation)
      if (emailError.message?.includes("Invalid email address") || emailError.message?.includes("Email cannot receive")) {
        errorMessage = "Email is not valid"
        errorCode = "INVALID_EMAIL"
        userMessage = `The email address "${data.email}" is not valid. ${emailError.message.replace("Invalid email address: ", "").replace("Email cannot receive messages: ", "")} I cannot send email to this address.`
      } else if (emailError.message?.includes("authentication") || emailError.code === "EAUTH") {
        errorMessage = "Email service authentication failed. Please contact support."
        errorCode = "SMTP_AUTH_ERROR"
        userMessage = "Email service configuration error. Please contact support."
      } else if (emailError.message?.includes("timeout") || emailError.message?.includes("connection") || emailError.code === "ETIMEDOUT" || emailError.code === "ECONNECTION") {
        errorMessage = "Unable to connect to email server. Please try again later."
        errorCode = "SMTP_CONNECTION_ERROR"
        userMessage = "Unable to connect to email server. Please try again in a few minutes."
      } else if (emailError.message?.includes("invalid") || emailError.message?.includes("not valid") || emailError.code === "EENVELOPE") {
        errorMessage = "The email address is invalid and cannot receive emails."
        errorCode = "INVALID_EMAIL_DELIVERY"
        userMessage = `The email address "${data.email}" appears to be invalid or cannot receive emails. Please check the email address and try again.`
      } else if (emailError.response) {
        errorMessage = `Email server rejected the message: ${emailError.response}`
        errorCode = "SMTP_REJECTED"
        userMessage = `The email server rejected the message. This might mean the email address "${data.email}" is invalid or the server is blocking it. Please check your email address.`
      }

      return Response.json({
        error: errorMessage,
        errorCode,
        success: false,
        retryable: true,
        message: userMessage,
        details: process.env.NODE_ENV === "development" ? emailError.message : undefined,
      }, { status: 500 })
    }
  } catch (error) {
    console.error("POST /api/auth/send-verification-signup error:", error)
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

