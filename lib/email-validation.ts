/**
 * Email validation utility
 * Provides comprehensive email validation and error messages
 */

export interface EmailValidationResult {
  valid: boolean
  reason?: string
  errorCode?: string
}

/**
 * Validates email format and structure
 */
export function validateEmailFormat(email: string): EmailValidationResult {
  if (!email || typeof email !== "string") {
    return {
      valid: false,
      reason: "Email address is required",
      errorCode: "EMAIL_REQUIRED",
    }
  }

  const trimmedEmail = email.trim().toLowerCase()

  if (trimmedEmail.length === 0) {
    return {
      valid: false,
      reason: "Email address cannot be empty",
      errorCode: "EMAIL_EMPTY",
    }
  }

  // Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmedEmail)) {
    return {
      valid: false,
      reason: "Invalid email format. Please enter a valid email address (e.g., user@example.com)",
      errorCode: "INVALID_FORMAT",
    }
  }

  const parts = trimmedEmail.split("@")
  if (parts.length !== 2) {
    return {
      valid: false,
      reason: "Invalid email format",
      errorCode: "INVALID_FORMAT",
    }
  }

  const [localPart, domain] = parts

  // Check local part
  if (localPart.length === 0) {
    return {
      valid: false,
      reason: "Email address must have a username before the @ symbol",
      errorCode: "INVALID_LOCAL",
    }
  }

  if (localPart.length > 64) {
    return {
      valid: false,
      reason: "Email username is too long (maximum 64 characters)",
      errorCode: "LOCAL_TOO_LONG",
    }
  }

  // Check domain
  if (domain.length === 0) {
    return {
      valid: false,
      reason: "Email address must have a domain after the @ symbol",
      errorCode: "INVALID_DOMAIN",
    }
  }

  if (!domain.includes(".")) {
    return {
      valid: false,
      reason: "Email domain must include a top-level domain (e.g., .com, .org)",
      errorCode: "INVALID_DOMAIN",
    }
  }

  // Check domain format
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/
  if (!domainRegex.test(domain)) {
    return {
      valid: false,
      reason: "Invalid email domain format",
      errorCode: "INVALID_DOMAIN_FORMAT",
    }
  }

  // Check for common invalid/test domains
  const invalidDomains = ["example.com", "test.com", "invalid.com", "fake.com", "localhost"]
  if (invalidDomains.includes(domain)) {
    return {
      valid: false,
      reason: "This email domain is not valid for sending emails",
      errorCode: "INVALID_DOMAIN_TYPE",
    }
  }

  return { valid: true }
}

/**
 * Gets user-friendly error message for email validation
 */
export function getEmailErrorMessage(result: EmailValidationResult): string {
  if (result.valid) {
    return ""
  }

  return result.reason || "Invalid email address"
}

/**
 * Checks if email can receive emails (for sending purposes)
 */
export function canReceiveEmails(email: string): EmailValidationResult {
  const formatCheck = validateEmailFormat(email)
  if (!formatCheck.valid) {
    return formatCheck
  }

  // Additional checks for email deliverability
  const domain = email.split("@")[1]?.toLowerCase()

  // Check for disposable email domains (common ones)
  const disposableDomains = [
    "tempmail.com",
    "10minutemail.com",
    "guerrillamail.com",
    "mailinator.com",
    "throwaway.email",
  ]

  if (disposableDomains.includes(domain || "")) {
    return {
      valid: false,
      reason: "Disposable email addresses are not allowed",
      errorCode: "DISPOSABLE_EMAIL",
    }
  }

  return { valid: true }
}

