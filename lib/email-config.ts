/**
 * Email Service Configuration
 * 
 * Controls whether email functionality is enabled or disabled.
 * When disabled, the app will use notifications instead of emails.
 * 
 * Environment Variables:
 * - ENABLE_EMAIL_SERVICE: Server-side flag (supports quoted/unquoted values)
 * - NEXT_PUBLIC_ENABLE_EMAIL_SERVICE: Client-side flag (embedded at build time)
 * 
 * Important Notes:
 * - Default: true (email service enabled) if environment variable is not set
 * - Set to "false" (with or without quotes) to disable email service
 * - NEXT_PUBLIC_* variables are embedded at build time - changes require rebuild/restart
 * - In development: Restart dev server after changing NEXT_PUBLIC_* variables
 * - In production: Rebuild the app after changing NEXT_PUBLIC_* variables
 * 
 * Supported formats:
 * - ENABLE_EMAIL_SERVICE=true
 * - ENABLE_EMAIL_SERVICE="true"
 * - ENABLE_EMAIL_SERVICE='true'
 * - ENABLE_EMAIL_SERVICE=false
 * - ENABLE_EMAIL_SERVICE="false"
 */

/**
 * Check if email service is enabled
 * @returns true if email service is enabled, false otherwise
 * Default: true (enabled) if environment variable is not set or invalid
 * 
 * Behavior:
 * - Missing env var → true (enabled by default)
 * - Empty env var → true (enabled by default)
 * - Invalid value → true (enabled by default)
 * - "false" → false (disabled)
 * - "true" or any other value → true (enabled)
 */
export function isEmailServiceEnabled(): boolean {
  const envValue = process.env.ENABLE_EMAIL_SERVICE
  
  // Default to true if env var is not set or is empty
  if (!envValue || envValue.trim() === "") {
    return true // Default: enabled when env var doesn't exist or is empty
  }
  
  // Normalize the value (strip quotes, trim, lowercase)
  const normalizedValue = normalizeEnvValue(envValue)
  
  // If normalized value is empty (shouldn't happen, but safety check)
  if (normalizedValue === "") {
    return true // Default to enabled for invalid/empty values
  }
  
  // Only return false if explicitly set to "false"
  // All other values (including invalid ones) default to true
  return !isEmailServiceDisabled(normalizedValue)
}

/**
 * Helper function to normalize and check env value
 * Handles quoted values, whitespace, and case-insensitive comparison
 * @returns normalized value or empty string if missing/invalid
 */
function normalizeEnvValue(value: string | undefined): string {
  if (!value || value.trim() === "") {
    return "" // Missing or empty - will default to true
  }
  // Strip quotes (both single and double) and normalize
  return value.trim().replace(/^["']|["']$/g, "").toLowerCase()
}

/**
 * Check if a normalized env value indicates email service should be disabled
 * Only returns true if value is explicitly "false"
 * All other values (missing, empty, invalid, "true", etc.) default to enabled (true)
 */
function isEmailServiceDisabled(normalizedValue: string): boolean {
  // Only disable if explicitly set to "false"
  // All other values (missing, empty, invalid, "true", etc.) default to enabled
  return normalizedValue === "false"
}

/**
 * Check if email service is enabled (client-side)
 * This reads from a public environment variable
 * @returns true if email service is enabled, false otherwise
 * Default: true (enabled) if environment variable is not set or invalid
 * 
 * Behavior:
 * - Missing env var → true (enabled by default)
 * - Empty env var → true (enabled by default)
 * - Invalid value → true (enabled by default)
 * - "false" → false (disabled)
 * - "true" or any other value → true (enabled)
 */
export function isEmailServiceEnabledClient(): boolean {
  // During SSR, check the server-side env var first, then fall back to public env var
  if (typeof window === "undefined") {
    // Check server-side env var first (for SSR)
    const serverEnvValue = normalizeEnvValue(process.env.ENABLE_EMAIL_SERVICE)
    if (serverEnvValue !== "") {
      // Only disable if explicitly "false", otherwise default to enabled
      return !isEmailServiceDisabled(serverEnvValue)
    }
    // Fall back to public env var
    const publicEnvValue = normalizeEnvValue(process.env.NEXT_PUBLIC_ENABLE_EMAIL_SERVICE)
    if (publicEnvValue !== "") {
      // Only disable if explicitly "false", otherwise default to enabled
      return !isEmailServiceDisabled(publicEnvValue)
    }
    // Default to true if neither is set or both are empty/invalid
    return true
  }
  
  // Client-side: Check public env var (must be prefixed with NEXT_PUBLIC_)
  // Note: NEXT_PUBLIC_ vars are embedded at build time, so changes require rebuild
  const envValue = normalizeEnvValue(process.env.NEXT_PUBLIC_ENABLE_EMAIL_SERVICE)
  
  // Default to true if env var is missing, empty, or invalid
  if (envValue === "") {
    return true // Default: enabled when env var doesn't exist or is empty
  }
  
  // Only return false if explicitly set to "false"
  // All other values (including invalid ones) default to true
  return !isEmailServiceDisabled(envValue)
}

