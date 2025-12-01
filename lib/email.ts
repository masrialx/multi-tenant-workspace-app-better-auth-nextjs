import nodemailer from "nodemailer"
import type { Transporter } from "nodemailer"
import type { EmailTemplateOptions } from "./email-templates"
import { generateEmailTemplate } from "./email-templates"
import { validateEmailFormat, canReceiveEmails, getEmailErrorMessage } from "./email-validation"

// Configuration constants - optimized for faster response times
const CONNECTION_TIMEOUT = Number(process.env.SMTP_CONNECTION_TIMEOUT) || 15000 // 15 seconds (reduced from 60)
const SEND_TIMEOUT = Number(process.env.SMTP_SEND_TIMEOUT) || 20000 // 20 seconds (reduced from 60)
const MAX_RETRIES = Number(process.env.SMTP_MAX_RETRIES) || 1 // Reduced to 1 retry (was 3)
const RETRY_DELAY_BASE = 500 // 0.5 second base delay (reduced from 1s)
const RETRY_DELAY_MAX = 2000 // 2 seconds max delay (reduced from 10s)

// Cached transporter instance for connection reuse
let cachedTransporter: Transporter | null = null

/**
 * Creates or returns a cached email transporter instance
 * This allows connection reuse and better performance
 */
function getEmailTransporter(): Transporter {
  // Return cached transporter if available
  // Check if transporter exists and is still valid
  if (cachedTransporter) {
    try {
      // Quick check - if transporter exists, reuse it
      return cachedTransporter
    } catch {
      // If transporter is invalid, reset it
      cachedTransporter = null
    }
  }

  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP configuration is missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.")
  }

  // Create new transporter with optimized settings for speed
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Reduced timeout settings for faster failure detection
    connectionTimeout: CONNECTION_TIMEOUT,
    greetingTimeout: 10000, // 10 seconds for greeting (faster)
    socketTimeout: CONNECTION_TIMEOUT,
    // Connection pooling for better performance
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    // Faster rate limiting
    rateDelta: 500, // 0.5 second
    rateLimit: 10, // 10 messages per second (increased)
    // Keep connections alive
    logger: process.env.NODE_ENV === "development",
    debug: process.env.NODE_ENV === "development",
    // Disable DNS lookup timeout to speed up connection
    dnsTimeout: 5000, // 5 seconds
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
 * Sends an email asynchronously without blocking (fire and forget)
 * Use this when you want to return API response immediately
 */
export function sendEmailAsync(options: SendEmailOptions): void {
  // Fire and forget - don't await, just start the process
  sendEmail(options).catch((error) => {
    // Log error but don't throw - email sending happens in background
    console.error("❌ Background email send failed:", {
      to: options.to,
      subject: options.subject,
      error: error.message,
    })
  })
}

/**
 * Sends an email with retry logic and improved error handling
 * This version waits for the email to be sent (use for critical emails)
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

