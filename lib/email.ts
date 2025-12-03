import nodemailer from "nodemailer"
import type { Transporter } from "nodemailer"
import type { EmailTemplateOptions } from "./email-templates"
import { generateEmailTemplate } from "./email-templates"
import { validateEmailFormat, canReceiveEmails, getEmailErrorMessage } from "./email-validation"
import { isEmailServiceEnabled } from "./email-config"

// Detect if we're in a serverless/production environment (Render, Vercel, etc.)
const isServerless = 
  process.env.RENDER === "true" || 
  process.env.VERCEL === "1" || 
  process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined ||
  process.env.NODE_ENV === "production"

// Configuration constants - adaptive based on environment
// Production/serverless environments need longer timeouts due to network latency
const CONNECTION_TIMEOUT = Number(process.env.SMTP_CONNECTION_TIMEOUT) || (isServerless ? 30000 : 10000) // 30s for production, 10s for dev
const SEND_TIMEOUT = Number(process.env.SMTP_SEND_TIMEOUT) || (isServerless ? 30000 : 15000) // 30s for production, 15s for dev
const MAX_RETRIES = Number(process.env.SMTP_MAX_RETRIES) || (isServerless ? 2 : 1) // More retries for production
const RETRY_DELAY_BASE = 1000 // 1 second base delay
const RETRY_DELAY_MAX = isServerless ? 5000 : 3000 // 5s max for production, 3s for dev

// Cached transporter instance for connection reuse
// In serverless environments, we'll create fresh connections more often
let cachedTransporter: Transporter | null = null
let transporterCreatedAt: number = 0
const TRANSPORTER_MAX_AGE = isServerless ? 60000 : 300000 // 1 min for serverless, 5 min for regular

/**
 * Creates or returns a cached email transporter instance
 * In serverless environments, creates fresh connections more frequently
 */
function getEmailTransporter(): Transporter {
  const now = Date.now()
  
  // In serverless environments, check if transporter is too old and reset it
  if (isServerless && cachedTransporter && (now - transporterCreatedAt) > TRANSPORTER_MAX_AGE) {
    console.log("🔄 Resetting transporter cache (serverless environment)")
    try {
      cachedTransporter.close()
    } catch {
      // Ignore errors when closing
    }
    cachedTransporter = null
    transporterCreatedAt = 0
  }
  
  // Return cached transporter if available and still valid
  if (cachedTransporter) {
    try {
      return cachedTransporter
    } catch {
      // If transporter is invalid, reset it
      cachedTransporter = null
      transporterCreatedAt = 0
    }
  }

  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP configuration is missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.")
  }

  const port = Number(process.env.SMTP_PORT) || 587
  const secure = process.env.SMTP_SECURE === "true"
  
  // For port 587, we use STARTTLS (secure: false, but requireTLS: true)
  // For port 465, we use direct TLS (secure: true)
  const requireTLS = port === 587 && !secure

  // Create transporter with environment-appropriate settings
  const transporterConfig: any = {
    host: process.env.SMTP_HOST,
    port: port,
    secure: secure, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Timeout settings - longer for production/serverless
    connectionTimeout: CONNECTION_TIMEOUT,
    greetingTimeout: isServerless ? 30000 : 15000, // 30s for production, 15s for dev
    socketTimeout: CONNECTION_TIMEOUT,
    // TLS/STARTTLS configuration
    requireTLS: requireTLS, // Require TLS upgrade for STARTTLS
    tls: {
      // Don't reject unauthorized certificates (some providers use self-signed)
      // Set SMTP_REJECT_UNAUTHORIZED=false if you have certificate issues
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== "false",
      // Use modern TLS - let Node.js choose appropriate ciphers
      minVersion: "TLSv1.2",
    },
    // Connection pooling - disabled for serverless environments
    // Pooling doesn't work well in serverless/container environments
    pool: !isServerless, // Only use pooling in non-serverless environments
    maxConnections: isServerless ? 1 : 5,
    maxMessages: isServerless ? 1 : 100,
    // Rate limiting
    rateDelta: 1000, // 1 second
    rateLimit: isServerless ? 5 : 10, // Lower rate for serverless
    // Logging
    logger: process.env.NODE_ENV === "development",
    debug: process.env.NODE_ENV === "development",
    // DNS timeout
    dnsTimeout: isServerless ? 10000 : 5000, // Longer for production
  }

  cachedTransporter = nodemailer.createTransport(transporterConfig)
  transporterCreatedAt = now

  // Handle connection errors and reset cache
  cachedTransporter.on("error", (error) => {
    console.error("❌ Transporter error:", {
      message: error.message,
      code: (error as any).code,
      host: process.env.SMTP_HOST,
    })
    cachedTransporter = null
    transporterCreatedAt = 0
  })

  // Log transporter creation
  if (process.env.NODE_ENV === "development") {
    console.log("📧 Email transporter created:", {
      host: process.env.SMTP_HOST,
      port: port,
      secure: secure,
      requireTLS: requireTLS,
      pooling: !isServerless,
      serverless: isServerless,
    })
  }

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
      setTimeout(() => reject(new Error("Connection timeout")), CONNECTION_TIMEOUT)
    )
    
    await Promise.race([verifyPromise, timeoutPromise])
    console.log("✅ SMTP server connection verified")
    return true
  } catch (error: any) {
    console.error("⚠️ SMTP verification failed:", {
      error: error.message,
      code: error.code,
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
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
  // Check if email service is enabled
  if (!isEmailServiceEnabled()) {
    console.log("📧 Email service is disabled. Skipping email send:", {
      to: options.to,
      subject: options.subject,
    })
    // Return success but don't actually send email
    return { success: true, messageId: null, skipped: true }
  }

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

