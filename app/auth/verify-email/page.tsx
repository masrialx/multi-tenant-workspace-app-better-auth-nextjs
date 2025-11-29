"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ThemeToggle } from "@/components/theme-toggle"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isVerifying, setIsVerifying] = useState(true)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get("token")
      if (!token) {
        setError("No verification token provided")
        setIsVerifying(false)
        return
      }

      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })

        const data = await response.json()

        if (response.ok) {
          setIsVerified(true)
          toast({
            title: "Success",
            description: "Email verified successfully!",
          })
          setTimeout(() => {
            router.push("/workspace")
          }, 2000)
        } else {
          setError(data.error || "Failed to verify email")
          toast({
            title: "Error",
            description: data.error || "Failed to verify email",
            variant: "destructive",
          })
        }
      } catch (error) {
        setError("An unexpected error occurred")
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        })
      } finally {
        setIsVerifying(false)
      }
    }

    verifyEmail()
  }, [searchParams, router, toast])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      
      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-2 backdrop-blur-sm bg-card/95">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="flex items-center justify-center mb-2">
            <div className={`p-3 rounded-full ${isVerified ? "bg-green-500/10" : error ? "bg-destructive/10" : "bg-primary/10"}`}>
              {isVerifying ? (
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              ) : isVerified ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-destructive" />
              )}
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {isVerifying 
              ? "Verifying Email..." 
              : isVerified 
                ? "Email Verified!" 
                : "Verification Failed"}
          </CardTitle>
          <CardDescription className="text-base">
            {isVerifying 
              ? "Please wait while we verify your email address" 
              : isVerified 
                ? "Your email has been successfully verified. Redirecting..." 
                : error || "Something went wrong"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isVerifying && !isVerified && (
            <div className="space-y-4">
              <Button 
                onClick={() => router.push("/workspace")}
                className="w-full h-11 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Go to Workspace
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

