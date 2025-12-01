import nodemailer from "nodemailer"
import type { Transporter } from "nodemailer"
import type { EmailTemplateOptions } from "./email-templates"
import { generateEmailTemplate } from "./email-templates"
import { validateEmailFormat, canReceiveEmails, getEmailErrorMessage } from "./email-validation"

// Configuration constants
const CONNECTION_TIMEOUT = Number(process.env.SMTP_CONNECTION_TIMEOUT) || 60000 // 60 seconds
const SEND_TIMEOUT = Number(process.env.SMTP_SEND_TIMEOUT) || 60000 // 60 seconds
const MAX_RETRIES = Number(process.env.SMTP_MAX_RETRIES) || 3
const RETRY_DELAY_BASE = 1000 // 1 second base delay
const RETRY_DELAY_MAX = 10000 // 10 seconds max delay

// Cached transporter instance for connection reuse
let cachedTransporter: Transporter | null = null

/**
 * Creates or returns a cached email transporter instance
 * This allows connection reuse and better performance
 */
function getEmailTransporter(): Transporter {
  // Return cached transporter if available and not closed
  if (cachedTransporter && !cachedTransporter.isIdle()) {
    return cachedTransporter
  }

  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP configuration is missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.")
  }

  // Create new transporter with optimized settings
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Optimized timeout settings
    connectionTimeout: CONNECTION_TIMEOUT,
    greetingTimeout: CONNECTION_TIMEOUT,
    socketTimeout: CONNECTION_TIMEOUT,
    // Connection pooling for better performance
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    // Rate limiting
    rateDelta: 1000, // 1 second
    rateLimit: 5, // 5 messages per second
    // Keep connections alive
    logger: process.env.NODE_ENV === "development",
    debug: process.env.NODE_ENV === "development",
  })

  // Handle connection errors and reset cache
  cachedTransporter.on("error", (error) => {
    console.error("❌ Transporter error:", error)
    cachedTransporter = null
  })

  return cachedTransporter
}

/**
 * Verifies SMTP connection (optional, can be called separately)
 * This is not called during sendEmail to reduce overhead
 */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    const transporter = getEmailTransporter()
    const verifyPromise = transporter.verify()
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Connection timeout")), 10000)
    )
    
    await Promise.race([verifyPromise, timeoutPromise])
    console.log("✅ SMTP server connection verified")
    return true
  } catch (error: any) {
    console.error("⚠️ SMTP verification failed:", {
      error: error.message,
      code: error.code,
    })
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

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculates exponential backoff delay for retries
 */
function getRetryDelay(attempt: number): number {
  const delay = Math.min(RETRY_DELAY_BASE * Math.pow(2, attempt), RETRY_DELAY_MAX)
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay
  return delay + jitter
}

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: any): boolean {
  // Retry on network/timeout errors, but not on auth errors
  if (error.code === "EAUTH") {
    return false
  }
  
  // Retry on connection and timeout errors
  if (
    error.code === "ECONNECTION" ||
    error.code === "ETIMEDOUT" ||
    error.message?.includes("timeout") ||
    error.message?.includes("Connection")
  ) {
    return true
  }
  
  // Retry on temporary server errors (5xx)
  if (error.responseCode && error.responseCode >= 500 && error.responseCode < 600) {
    return true
  }
  
  return false
}

/**
 * Sends an email with retry logic and improved error handling
 */
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

  let lastError: any = null

  // Retry loop with exponential backoff
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const transporter = getEmailTransporter()
      
      // Create send promise with timeout
      const sendPromise = transporter.sendMail(mailOptions)
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Email send timeout after ${SEND_TIMEOUT / 1000} seconds`)), SEND_TIMEOUT)
      )
      
      const info = await Promise.race([sendPromise, timeoutPromise]) as any
      
      if (attempt > 0) {
        console.log(`✅ Email sent successfully after ${attempt} retry(ies):`, {
          messageId: info.messageId,
          to: mailOptions.to,
          subject: mailOptions.subject,
        })
      } else {
        console.log("✅ Email sent successfully:", {
          messageId: info.messageId,
          to: mailOptions.to,
          subject: mailOptions.subject,
          accepted: info.accepted,
          rejected: info.rejected,
        })
      }
      
      return { success: true, messageId: info.messageId }
    } catch (emailError: any) {
      lastError = emailError
      
      // Log error details
      const errorDetails = {
        attempt: attempt + 1,
        maxRetries: MAX_RETRIES + 1,
        to: mailOptions.to,
        subject: mailOptions.subject,
        error: emailError.message,
        code: emailError.code,
        responseCode: emailError.responseCode,
      }
      
      // Check if error is retryable
      if (!isRetryableError(emailError) || attempt >= MAX_RETRIES) {
        console.error("❌ Failed to send email (non-retryable or max retries reached):", errorDetails)
        break
      }
      
      // Calculate delay and retry
      const delay = getRetryDelay(attempt)
      console.warn(`⚠️ Email send failed, retrying in ${Math.round(delay)}ms:`, {
        ...errorDetails,
        retryDelay: delay,
      })
      
      await sleep(delay)
    }
  }
  
  // All retries exhausted, throw error with helpful message
  if (lastError) {
    let errorMessage = "Failed to send email"
    
    if (lastError.code === "EAUTH") {
      errorMessage = "Email authentication failed. Please check SMTP credentials."
    } else if (lastError.code === "ECONNECTION" || lastError.code === "ETIMEDOUT") {
      errorMessage = "Failed to connect to email server. Please check SMTP configuration and network connection."
    } else if (lastError.message?.includes("timeout")) {
      errorMessage = `Email server connection timed out after ${MAX_RETRIES + 1} attempts. Please check your SMTP settings and try again.`
    } else {
      errorMessage = `Failed to send email after ${MAX_RETRIES + 1} attempts: ${lastError.message || "Unknown error"}`
    }
    
    throw new Error(errorMessage)
  }
  
  throw new Error("Failed to send email: Unknown error")
}

