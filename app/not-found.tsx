"use client"

// Force dynamic rendering to prevent build-time prerendering issues
// Note: route segment config is limited for client components
export const dynamic = 'force-dynamic'

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Home, ArrowLeft, FileQuestion } from "lucide-react"
import Link from "next/link"
import dynamicImport from "next/dynamic"

// Dynamically import ThemeToggle to avoid SSR issues during static export
const ThemeToggle = dynamicImport(() => import("@/components/theme-toggle").then(mod => ({ default: mod.ThemeToggle })), {
  ssr: false,
  loading: () => (
    <div className="h-9 w-9" />
  ),
})

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/10 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Theme toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="text-center space-y-8 px-4 max-w-2xl">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="p-6 rounded-full bg-primary/10">
              <FileQuestion className="h-16 w-16 text-primary" />
            </div>
          </div>
          <h1 className="text-9xl font-bold bg-gradient-to-r from-muted-foreground to-muted-foreground/50 bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-4xl font-bold">Page Not Found</h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved to a different location.
          </p>
        </div>
        
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button onClick={() => router.back()} variant="outline" size="lg" className="shadow-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          <Button asChild size="lg" className="shadow-lg hover:shadow-xl transition-all">
            <Link href="/workspace">
              <Home className="w-4 h-4 mr-2" />
              Go to Workspace
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}


