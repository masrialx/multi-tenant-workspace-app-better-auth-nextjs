/**
 * Email Service Configuration
 * 
 * Controls whether email functionality is enabled or disabled.
 * When disabled, the app will use notifications instead of emails.
 * 
 * Environment Variable: ENABLE_EMAIL_SERVICE
 * - Default: true (email service enabled)
 * - Set to "false" to disable email service
 */

/**
 * Check if email service is enabled
 * @returns true if email service is enabled, false otherwise
 * Default: true (enabled) if environment variable is not set
 */
export function isEmailServiceEnabled(): boolean {
  // Default to true if env var is not set or is empty
  const envValue = process.env.ENABLE_EMAIL_SERVICE
  if (!envValue || envValue.trim() === "") {
    return true // Default: enabled when env var doesn't exist or is empty
  }
  // Only return false if explicitly set to "false" (case-insensitive)
  return envValue.toLowerCase().trim() !== "false"
}

/**
 * Check if email service is enabled (client-side)
 * This reads from a public environment variable
 * @returns true if email service is enabled, false otherwise
 * Default: true (enabled) if environment variable is not set
 */
export function isEmailServiceEnabledClient(): boolean {
  // Default to true for SSR
  if (typeof window === "undefined") {
    return true
  }
  // Check public env var (must be prefixed with NEXT_PUBLIC_)
  const envValue = process.env.NEXT_PUBLIC_ENABLE_EMAIL_SERVICE
  if (!envValue || envValue.trim() === "") {
    return true // Default: enabled when env var doesn't exist or is empty
  }
  // Only return false if explicitly set to "false" (case-insensitive)
  return envValue.toLowerCase().trim() !== "false"
}

