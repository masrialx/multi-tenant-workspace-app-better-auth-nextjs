/**
 * API Response Utilities
 * 
 * Standardized response formatting for consistent API contracts
 */

export interface ApiSuccessResponse<T = unknown> {
  success: true
  data?: T
  message?: string
}

export interface ApiErrorResponse {
  success: false
  error: string
  errorCode?: string
  message?: string
  details?: unknown
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Create a successful API response
 */
export function successResponse<T>(
  data?: T,
  message?: string
): Response {
  return Response.json(
    {
      success: true as const,
      ...(data !== undefined && { data }),
      ...(message && { message }),
    },
    { status: 200 }
  )
}

/**
 * Create an error API response
 */
export function errorResponse(
  error: string,
  status: number = 500,
  options?: {
    errorCode?: string
    message?: string
    details?: unknown
  }
): Response {
  return Response.json(
    {
      success: false as const,
      error,
      ...(options?.errorCode && { errorCode: options.errorCode }),
      ...(options?.message && { message: options.message }),
      ...(options?.details && { details: options.details }),
    },
    { status }
  )
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(message: string = "Unauthorized"): Response {
  return errorResponse(message, 401, {
    errorCode: "UNAUTHORIZED",
    message,
  })
}

/**
 * Create a forbidden response
 */
export function forbiddenResponse(message: string = "Access denied"): Response {
  return errorResponse(message, 403, {
    errorCode: "FORBIDDEN",
    message,
  })
}

/**
 * Create a not found response
 */
export function notFoundResponse(resource: string = "Resource"): Response {
  return errorResponse(`${resource} not found`, 404, {
    errorCode: "NOT_FOUND",
    message: `${resource} not found`,
  })
}

/**
 * Create a bad request response
 */
export function badRequestResponse(
  message: string,
  errorCode?: string,
  details?: unknown
): Response {
  return errorResponse(message, 400, {
    errorCode: errorCode || "BAD_REQUEST",
    message,
    details,
  })
}

/**
 * Create an internal server error response
 */
export function internalErrorResponse(
  message: string = "Internal server error",
  details?: unknown
): Response {
  return errorResponse(message, 500, {
    errorCode: "INTERNAL_ERROR",
    message,
    ...(process.env.NODE_ENV === "development" && details && { details }),
  })
}

/**
 * Handle API route errors consistently
 */
export function handleApiError(error: unknown): Response {
  if (error instanceof Error) {
    // Zod validation errors
    if (error.name === "ZodError") {
      const zodError = error as { errors: Array<{ message: string; path: string[] }> }
      return badRequestResponse(
        zodError.errors[0]?.message || "Validation error",
        "VALIDATION_ERROR",
        zodError.errors
      )
    }

    // Known error types
    if (error.message.includes("Unauthorized") || error.message.includes("unauthorized")) {
      return unauthorizedResponse(error.message)
    }

    if (error.message.includes("Forbidden") || error.message.includes("forbidden")) {
      return forbiddenResponse(error.message)
    }

    if (error.message.includes("not found")) {
      return notFoundResponse(error.message)
    }

    // Generic error
    console.error("API Error:", error)
    return internalErrorResponse(error.message)
  }

  // Unknown error type
  console.error("Unknown API Error:", error)
  return internalErrorResponse("An unexpected error occurred")
}

