"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ThemeToggle } from "@/components/theme-toggle"
import { Mail, Loader2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsSent(true)
        toast({
          title: "Email Sent",
          description: data.message || "Password reset link has been sent to your email address.",
        })
      } else {
        // Show specific error message based on error code
        let errorTitle = "Error"
        let errorDescription = data.error || "Failed to send reset email"

        if (data.errorCode === "INVALID_FORMAT" || data.errorCode === "INVALID_DOMAIN") {
          errorTitle = "Invalid Email Address"
          errorDescription = data.error || "The email address you entered is not valid. Please check and try again."
        } else if (data.errorCode === "USER_NOT_FOUND") {
          errorTitle = "Account Not Found"
          errorDescription = data.error || "No account found with this email address. Please check your email and try again."
        } else if (data.errorCode === "EMAIL_SEND_FAILED" || data.errorCode === "SMTP_CONNECTION_ERROR") {
          errorTitle = "Email Service Error"
          errorDescription = data.error || "We were unable to send the email. Please try again later or contact support."
        } else if (data.errorCode === "INVALID_EMAIL_DELIVERY") {
          errorTitle = "Email Cannot Receive Messages"
          errorDescription = data.error || "The email address you provided cannot receive emails. Please use a valid email address."
        }

        toast({
          title: errorTitle,
          description: errorDescription,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
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
              <Mail className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Reset Password
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {isSent 
              ? "Check your email for a password reset link" 
              : "Enter your email address and we'll send you a link to reset your password"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSent ? (
            <div className="space-y-5">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
                <p className="text-sm text-muted-foreground">
                  We've sent a password reset link to <strong>{email}</strong>. Please check your inbox and click the link to reset your password.
                </p>
              </div>
              <Button 
                onClick={() => router.push("/auth/signin")}
                className="w-full h-11 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Back to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
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
              <Button 
                type="submit" 
                className="w-full h-11 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
          )}
          <p className="text-sm text-muted-foreground text-center mt-6">
            Remember your password?{" "}
            <Link href="/auth/signin" className="text-primary hover:underline font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

