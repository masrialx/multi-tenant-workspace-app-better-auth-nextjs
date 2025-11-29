import { z } from "zod"

/**
 * Validation Schemas
 * 
 * Centralized validation schemas for consistent input validation
 */

// Organization schemas
export const createOrgSchema = z.object({
  name: z
    .string()
    .min(1, "Organization name is required")
    .max(100, "Organization name must be less than 100 characters")
    .trim(),
})

export const joinOrgSchema = z.object({
  slug: z
    .string()
    .min(1, "Organization slug is required")
    .max(100, "Organization slug must be less than 100 characters")
    .trim(),
})

// Member invitation schema
export const inviteMemberSchema = z.object({
  orgId: z.string().min(1, "Organization ID is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["owner", "member"]).default("member"),
})

// Outline schemas
export const outlineSectionTypes = [
  "Table of Contents",
  "Executive Summary",
  "Technical Approach",
  "Design",
  "Capabilities",
  "Focus Document",
  "Narrative",
] as const

export const outlineStatuses = ["Pending", "In-Progress", "Completed"] as const

export const outlineReviewers = ["Assim", "Bini", "Mami"] as const

export const createOutlineSchema = z.object({
  orgId: z.string().min(1, "Organization ID is required"),
  header: z
    .string()
    .min(1, "Header is required")
    .max(500, "Header must be less than 500 characters")
    .trim(),
  sectionType: z.enum(outlineSectionTypes),
  status: z.enum(outlineStatuses).default("Pending"),
  target: z.number().int().min(0).default(0),
  limit: z.number().int().min(0).default(0),
  reviewer: z.enum(outlineReviewers).default("Assim"),
})

export const updateOutlineSchema = z.object({
  orgId: z.string().min(1, "Organization ID is required"),
  header: z
    .string()
    .min(1, "Header is required")
    .max(500, "Header must be less than 500 characters")
    .trim()
    .optional(),
  sectionType: z.enum(outlineSectionTypes).optional(),
  status: z.enum(outlineStatuses).optional(),
  target: z.number().int().min(0).optional(),
  limit: z.number().int().min(0).optional(),
  reviewer: z.enum(outlineReviewers).optional(),
})

// Auth schemas
export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
})

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
})

export const sendVerificationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  email: z.string().email("Invalid email address"),
})

// Notification schemas
export const updateNotificationSchema = z.object({
  notificationId: z.string().optional(),
  markAllAsRead: z.boolean().optional(),
})

export const joinRequestSchema = z.object({
  notificationId: z.string().min(1, "Notification ID is required"),
  action: z.enum(["accept", "reject"]),
})

/**
 * Generate a URL-safe slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Validate organization slug format
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 1 && slug.length <= 100
}

