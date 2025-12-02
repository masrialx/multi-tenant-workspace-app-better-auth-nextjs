"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { signUp } from "@/lib/auth-client"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserPlus, AlertTriangle } from "lucide-react"

// Force dynamic rendering to prevent build-time prerendering issues
export const dynamic = 'force-dynamic'

export default function SignUpPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showInvalidEmailDialog, setShowInvalidEmailDialog] = useState(false)
  const [shouldProceedWithInvalidEmail, setShouldProceedWithInvalidEmail] = useState(false)

  // Email validation function - basic format check
  const isValidEmailFormat = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // More comprehensive email validation
  const validateEmail = async (email: string): Promise<{ valid: boolean; reason?: string }> => {
    // Basic format check
    if (!isValidEmailFormat(email)) {
      return { valid: false, reason: "Invalid email format" }
    }

    // Check for common invalid patterns
    const parts = email.split("@")
    if (parts.length !== 2) {
      return { valid: false, reason: "Invalid email format" }
    }

    const [localPart, domain] = parts

    // Check local part
    if (localPart.length === 0 || localPart.length > 64) {
      return { valid: false, reason: "Invalid email format" }
    }

    // Check domain
    if (domain.length === 0 || !domain.includes(".")) {
      return { valid: false, reason: "Invalid domain" }
    }

    // Check for common fake/invalid domains
    const invalidDomains = ["example.com", "test.com", "invalid.com", "fake.com"]
    if (invalidDomains.includes(domain.toLowerCase())) {
      return { valid: false, reason: "Invalid email domain" }
    }

    // Check domain format
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/
    if (!domainRegex.test(domain)) {
      return { valid: false, reason: "Invalid domain format" }
    }

    return { valid: true }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate email
    const emailValidation = await validateEmail(email)
    
    if (!emailValidation.valid) {
      // Show warning dialog but allow user to proceed
      setShowInvalidEmailDialog(true)
      return
    }

    // If user previously chose to proceed with invalid email, continue
    if (shouldProceedWithInvalidEmail) {
      setShouldProceedWithInvalidEmail(false)
    }

    await proceedWithSignup()
  }

  const proceedWithSignup = async () => {
    setIsLoading(true)

    try {
      const result = await signUp.email({
        email,
        password,
        name,
        callbackURL: "/workspace",
      })

      if (result?.error) {
        toast({
          title: "Error",
          description: result.error.message || "Failed to sign up",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Get user ID from result
      // better-auth signUp returns the user in the result
      const userId = result?.data?.user?.id || null

      if (!userId) {
        // Try to get user ID from session as fallback
        try {
          const sessionResponse = await fetch("/api/auth/session", {
            credentials: "include",
          })
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json()
            const sessionUserId = sessionData?.user?.id || null
            if (sessionUserId) {
              // Use session user ID
              const verificationResponse = await fetch("/api/auth/send-verification-signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId: sessionUserId,
                  email,
                }),
              })

              const verificationData = await verificationResponse.json()

              if (!verificationResponse.ok || !verificationData.success) {
                // Show detailed error message
                let errorTitle = "Email Verification Warning"
                let errorDescription = verificationData.message || verificationData.error || "Failed to send verification email. Your account was created, but you may need to verify your email later."
                
                // Provide more specific guidance
                if (verificationData.errorCode === "INVALID_EMAIL_DELIVERY" || verificationData.errorCode === "INVALID_FORMAT") {
                  errorTitle = "Invalid Email Address"
                  errorDescription = `The email address "${email}" appears to be invalid. Your account was created, but you won't receive verification emails. Please update your email address in your account settings.`
                } else if (verificationData.errorCode === "SMTP_CONNECTION_ERROR") {
                  errorTitle = "Email Service Temporarily Unavailable"
                  errorDescription = "We couldn't send the verification email right now. Your account was created successfully. Please try requesting a verification email again from your workspace."
                }

                toast({
                  title: errorTitle,
                  description: errorDescription,
                  variant: "destructive",
                })
                // Still proceed to workspace
                router.push("/workspace")
                return
              }

              toast({
                title: "Account Created",
                description: "Verification email sent! Please check your inbox (and spam folder) for the verification link.",
              })
              router.push("/workspace")
              return
            }
          }
        } catch (error) {
          console.error("Error fetching session:", error)
        }

        toast({
          title: "Error",
          description: "Failed to create account. Please try again.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Send verification email after successful signup
      const verificationResponse = await fetch("/api/auth/send-verification-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          email,
        }),
      })

      const verificationData = await verificationResponse.json()

      if (!verificationResponse.ok || !verificationData.success) {
        // Show detailed error message
        let errorTitle = "Email Verification Warning"
        let errorDescription = verificationData.message || verificationData.error || "Failed to send verification email. Your account was created, but you may need to verify your email later."
        
        // Provide more specific guidance
        if (verificationData.errorCode === "INVALID_EMAIL_DELIVERY" || verificationData.errorCode === "INVALID_FORMAT") {
          errorTitle = "Invalid Email Address"
          errorDescription = `The email address "${email}" appears to be invalid. Your account was created, but you won't receive verification emails. Please update your email address in your account settings.`
        } else if (verificationData.errorCode === "SMTP_CONNECTION_ERROR") {
          errorTitle = "Email Service Temporarily Unavailable"
          errorDescription = "We couldn't send the verification email right now. Your account was created successfully. Please try requesting a verification email again from your workspace."
        }

        toast({
          title: errorTitle,
          description: errorDescription,
          variant: "destructive",
        })
        // Still proceed to workspace
        router.push("/workspace")
        return
      }

      toast({
        title: "Account Created",
        description: "Verification email sent! Please check your inbox (and spam folder) for the verification link.",
      })
      router.push("/workspace")
    } catch (error) {
      console.error("Sign up error:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleProceedWithInvalidEmail = () => {
    setShowInvalidEmailDialog(false)
    setShouldProceedWithInvalidEmail(true)
    proceedWithSignup()
  }

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
            <div className="p-3 rounded-full bg-primary/10">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Create Account
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Sign up to get started with your workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-semibold">
                Full Name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
                className="h-11 transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-11 transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-semibold">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-11 transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200" 
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground text-center mt-6">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-primary hover:underline font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>

      {/* Invalid Email Warning Dialog */}
      <AlertDialog open={showInvalidEmailDialog} onOpenChange={setShowInvalidEmailDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-500/10">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
              </div>
              <AlertDialogTitle>Email Not Valid</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              The email address you entered appears to be invalid or may not exist.
              <br /><br />
              <strong>Note:</strong> This is a test project, so you can still proceed with signup.
              However, you may not receive verification emails if the email is invalid.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowInvalidEmailDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleProceedWithInvalidEmail}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Continue Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
