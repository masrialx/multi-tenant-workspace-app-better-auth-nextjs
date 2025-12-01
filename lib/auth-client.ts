import { createAuthClient } from "better-auth/react"
import { organizationClient } from "better-auth/client/plugins"

// Get base URL - use window.location.origin in browser, env var in server
const getBaseURL = () => {
  if (typeof window !== "undefined") {
    return window.location.origin
  }
  return process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000"
}

export const authClient = createAuthClient({
  plugins: [organizationClient()],
  basePath: "/api/auth",
  baseURL: getBaseURL(),
})

export const { signUp, signIn, signOut, useSession, organization } = authClient