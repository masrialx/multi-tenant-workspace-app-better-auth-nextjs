import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { organization } from "better-auth/plugins"
import { headers } from "next/headers"
import type { NextRequest } from "next/server"
import { prisma } from "./prisma"
import { sendEmail } from "./email"
import { getOrganizationInvitationTemplate } from "./email-templates"
import { hash, compare } from "bcryptjs"


export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
    // Configure password hasher to use bcryptjs
    password: {
      hash: async (password: string) => {
        return await hash(password, 10)
      },
      verify: async ({ password, hash: storedHash }: { password: string; hash: string }) => {
        try {
          return await compare(password, storedHash)
        } catch (error) {
          console.error("Password verification error:", error)
          return false
        }
      },
    },
  },
  plugins: [
    organization({
      async sendInvitationEmail(data) {
        const to = data.email
        const organizationName = data.organization.name
        const invitationLink = `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/auth/invite/${data.invitation.id}`

        const subject = `You've been invited to join ${organizationName}`
        const text = `Hi,

You have been invited to join the organization "${organizationName}".

Click the link below to accept the invitation:
${invitationLink}

If you did not expect this email, you can safely ignore it.

Thanks.`

        try {
          await sendEmail({
            to,
            subject,
            text,
            html: getOrganizationInvitationTemplate(organizationName, invitationLink),
          })
        } catch (error) {
          console.error("Failed to send invitation email:", error)
          // Don't throw - let better-auth handle the error gracefully
        }
      },
    }),
  ],

  session: {
    expirationTime: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update age: 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  callbacks: {
    async authorized(request: NextRequest) {
      const pathname = new URL(request.url).pathname

      // Public routes
      if (pathname.startsWith("/auth") || pathname.startsWith("/api/auth") || pathname === "/") {
        return true
      }

      // Protected routes - check for valid session
      const headersList = await headers()
      const cookieHeader = headersList.get("cookie")

      if (!cookieHeader) {
        console.log("No cookies header")
        return false
      }

      return true
    },
  },
})

export async function getSessionUser(request: Request) {
  const headersList = await headers()
  const cookieHeader = headersList.get("cookie")

  if (!cookieHeader) {
    return null
  }

  const sessionToken = cookieHeader
    .split("; ")
    .find((c) => c.startsWith("better-auth.session_token="))
    ?.split("=")[1]

  if (!sessionToken) {
    return null
  }

     const session = await auth.api.getSession({ headers: request.headers })


  return session?.user || null
}
export type Session = typeof auth.$Infer.Session
