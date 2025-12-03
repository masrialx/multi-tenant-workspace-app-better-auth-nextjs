"use client"

// Force dynamic rendering to prevent build-time prerendering issues
export const dynamic = 'force-dynamic'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/10 p-4">
          <div className="text-center space-y-4 max-w-md">
            <h1 className="text-4xl font-bold">Something went wrong!</h1>
            <p className="text-muted-foreground">
              {error.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={reset}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}

