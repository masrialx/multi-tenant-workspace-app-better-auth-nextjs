import { getSessionUser } from "@/lib/auth"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { compare } from "bcryptjs"
import { z } from "zod"
import {
  unauthorizedResponse,
  badRequestResponse,
  forbiddenResponse,
  notFoundResponse,
  successResponse,
  handleApiError,
} from "@/lib/api-response"

const deleteOrgSchema = z.object({
  orgId: z.string().min(1, "Organization ID is required"),
  password: z.string().min(1, "Password is required"),
})

// DELETE /api/org/delete
export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const data = deleteOrgSchema.parse(body)

    // Find the organization
    const org = await prisma.organization.findUnique({
      where: { id: data.orgId },
    })

    if (!org) {
      return notFoundResponse("Organization")
    }

    // Verify user is the owner
    if (org.ownerId !== user.id) {
      return forbiddenResponse("Only the organization owner can delete the organization")
    }

    // Get owner's email and account for password verification
    const owner = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
      },
    })

    if (!owner) {
      return notFoundResponse("User")
    }

    // Get account with password (better-auth stores password in Account table)
    const account = await prisma.account.findFirst({
      where: {
        userId: user.id,
        providerId: "credential",
      },
      select: {
        password: true,
      },
    })

    if (!account || !account.password) {
      return badRequestResponse(
        "Password verification failed. Please ensure your account has a password set.",
        "NO_PASSWORD"
      )
    }

    // Verify password using better-auth's signInEmail API
    // This ensures we use the same password verification method as the auth system
    try {
      // Create headers without cookies to avoid affecting current session
      const testHeaders = new Headers()
      testHeaders.set("Content-Type", "application/json")
      
      // Use better-auth's signInEmail to verify password
      const signInResult = await auth.api.signInEmail({
        body: {
          email: owner.email,
          password: data.password,
        },
        headers: testHeaders,
      })

      // If signIn fails or has error, password is incorrect
      if (signInResult?.error) {
        const errorMessage = signInResult.error.message || ""
        if (errorMessage.toLowerCase().includes("password") || 
            errorMessage.toLowerCase().includes("invalid") || 
            errorMessage.toLowerCase().includes("incorrect") ||
            errorMessage.toLowerCase().includes("credentials")) {
          return badRequestResponse("Incorrect password. Please try again.", "INVALID_PASSWORD")
        }
        return badRequestResponse("Incorrect password. Please try again.", "INVALID_PASSWORD")
      }

      // If no result or no user in result, password is incorrect
      if (!signInResult || !signInResult.user) {
        return badRequestResponse("Incorrect password. Please try again.", "INVALID_PASSWORD")
      }
    } catch (error: any) {
      // If there's an error, it means password verification failed
      console.error("Password verification error:", error)
      const errorMessage = error?.message || ""
      if (errorMessage.toLowerCase().includes("password") || 
          errorMessage.toLowerCase().includes("invalid") || 
          errorMessage.toLowerCase().includes("incorrect") ||
          errorMessage.toLowerCase().includes("credentials")) {
        return badRequestResponse("Incorrect password. Please try again.", "INVALID_PASSWORD")
      }
      // For other errors, still return invalid password
      return badRequestResponse("Incorrect password. Please try again.", "INVALID_PASSWORD")
    }

    // Get all organization members (including owner) before deletion
    const allMembers = await prisma.organizationMember.findMany({
      where: { organizationId: data.orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    })

    // Get owner details
    const ownerUser = await prisma.user.findUnique({
      where: { id: org.ownerId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    // Create notifications for all members (including owner)
    const userIdsToNotify = new Set<string>()
    
    // Add owner
    if (ownerUser) {
      userIdsToNotify.add(ownerUser.id)
    }
    
    // Add all members
    allMembers.forEach((member) => {
      userIdsToNotify.add(member.userId)
    })

    // Create notifications for each user
    const notificationPromises = Array.from(userIdsToNotify).map((userId) =>
      prisma.notification.create({
        data: {
          type: "organization_deleted",
          title: "Organization Deleted",
          message: `The organization "${org.name}" has been deleted.`,
          userId: userId,
          metadata: JSON.stringify({
            organizationId: org.id,
            organizationName: org.name,
            deletedBy: user.id,
            deletedByName: user.name || user.email,
          }),
        },
      })
    )

    await Promise.all(notificationPromises)

    // Send email notifications to all members and owner
    const { sendEmail } = await import("@/lib/email")
    const emailPromises: Promise<void>[] = []

    // Email to owner
    if (ownerUser && ownerUser.email) {
      emailPromises.push(
        sendEmail({
          to: ownerUser.email,
          subject: `Organization "${org.name}" Deleted`,
          text: `The organization "${org.name}" has been deleted successfully.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Organization Deleted</h2>
              <p>The organization <strong>"${org.name}"</strong> has been deleted successfully.</p>
              <p>All associated data, members, and content have been removed.</p>
            </div>
          `,
        }).catch((error) => {
          console.error(`Failed to send deletion email to owner ${ownerUser.email}:`, error)
        })
      )
    }

    // Email to all members
    allMembers.forEach((member) => {
      if (member.user.email && member.userId !== org.ownerId) {
        emailPromises.push(
          sendEmail({
            to: member.user.email,
            subject: `Organization "${org.name}" Deleted`,
            text: `The organization "${org.name}" that you were a member of has been deleted.`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Organization Deleted</h2>
                <p>The organization <strong>"${org.name}"</strong> that you were a member of has been deleted by the owner.</p>
                <p>You no longer have access to this organization or its content.</p>
              </div>
            `,
          }).catch((error) => {
            console.error(`Failed to send deletion email to member ${member.user.email}:`, error)
          })
        )
      }
    })

    // Send emails in background (don't wait for them)
    Promise.all(emailPromises).catch((error) => {
      console.error("Error sending deletion emails:", error)
    })

    // Delete the organization (cascade will handle related records)
    await prisma.organization.delete({
      where: { id: data.orgId },
    })

    return successResponse(
      undefined,
      `Organization "${org.name}" has been deleted successfully`
    )
  } catch (error) {
    return handleApiError(error)
  }
}

