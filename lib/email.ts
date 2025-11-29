import nodemailer from "nodemailer"
import type { EmailTemplateOptions } from "./email-templates"
import { generateEmailTemplate } from "./email-templates"
import { validateEmailFormat, canReceiveEmails, getEmailErrorMessage } from "./email-validation"

export function createEmailTransporter() {
  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP configuration is missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.")
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Increased timeouts for slow connections
    connectionTimeout: 30000, // 30 seconds
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 30000, // 30 seconds
    // Retry configuration
    pool: true,
    maxConnections: 1,
    maxMessages: 3,
  })
}

export async function verifyEmailConnection() {
  try {
    const transporter = createEmailTransporter()
    // Use a shorter timeout for verification
    await Promise.race([
      transporter.verify(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Connection timeout")), 15000)
      )
    ])
    console.log("✅ SMTP server connection verified")
    return true
  } catch (error: any) {
    console.error("⚠️ SMTP verification failed (will still attempt to send):", {
      error: error.message,
      code: error.code,
    })
    // Don't throw - let the actual send attempt handle it
    // Some servers don't support verify() but can still send emails
    return false
  }
}

export function getEmailFrom() {
  return process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@example.com"
}

export interface SendEmailOptions {
  to: string
  subject: string
  text: string
  html?: string
  template?: EmailTemplateOptions
}

export async function sendEmail(options: SendEmailOptions) {
  // Validate email format before attempting to send
  const emailValidation = validateEmailFormat(options.to)
  if (!emailValidation.valid) {
    const errorMessage = getEmailErrorMessage(emailValidation)
    console.error("❌ Email validation failed:", {
      email: options.to,
      reason: emailValidation.reason,
      errorCode: emailValidation.errorCode,
    })
    throw new Error(`Invalid email address: ${errorMessage}`)
  }

  // Check if email can receive emails
  const emailReceivable = canReceiveEmails(options.to)
  if (!emailReceivable.valid) {
    const errorMessage = getEmailErrorMessage(emailReceivable)
    console.error("❌ Email cannot receive messages:", {
      email: options.to,
      reason: emailReceivable.reason,
      errorCode: emailReceivable.errorCode,
    })
    throw new Error(`Email cannot receive messages: ${errorMessage}`)
  }

  const transporter = createEmailTransporter()
  
  // Try to verify connection, but don't fail if it times out
  // Some SMTP servers don't support verify() but can still send emails
  const isVerified = await verifyEmailConnection()
  if (!isVerified) {
    console.warn("⚠️ SMTP verification failed, but will attempt to send email anyway")
  }

  // Use template if provided, otherwise use html or generate from text
  let htmlContent = options.html
  if (options.template) {
    htmlContent = generateEmailTemplate(options.template)
  } else if (!htmlContent) {
    // Convert plain text to simple HTML if no HTML provided
    htmlContent = options.text
      .split('\n')
      .map(line => `<p>${line || '&nbsp;'}</p>`)
      .join('')
    htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        ${htmlContent}
      </div>
    `
  }

  const mailOptions = {
    from: getEmailFrom(),
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: htmlContent,
  }

  try {
    // Add timeout wrapper for sendMail
    const sendPromise = transporter.sendMail(mailOptions)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Email send timeout after 30 seconds")), 30000)
    )
    
    const info = await Promise.race([sendPromise, timeoutPromise]) as any
    console.log("✅ Email sent successfully:", {
      messageId: info.messageId,
      to: mailOptions.to,
      subject: mailOptions.subject,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    })
    return { success: true, messageId: info.messageId }
  } catch (emailError: any) {
    console.error("❌ Failed to send email:", {
      to: mailOptions.to,
      subject: mailOptions.subject,
      error: emailError.message,
      code: emailError.code,
      command: emailError.command,
      response: emailError.response,
      responseCode: emailError.responseCode,
      stack: emailError.stack,
    })
    
    // Provide more specific error messages
    if (emailError.code === "EAUTH") {
      throw new Error("Email authentication failed. Please check SMTP credentials.")
    } else if (emailError.code === "ECONNECTION" || emailError.code === "ETIMEDOUT") {
      throw new Error("Failed to connect to email server. Please check SMTP configuration and network connection.")
    } else if (emailError.message?.includes("timeout")) {
      throw new Error("Email server connection timed out. Please check your SMTP settings and try again.")
    } else {
      throw new Error(`Failed to send email: ${emailError.message || "Unknown error"}`)
    }
  }
}

