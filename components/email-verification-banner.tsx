"use client"

import { useState, useEffect } from "react"
import { useSession } from "@/lib/auth-client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Mail, Loader2, CheckCircle2 } from "lucide-react"

export function EmailVerificationBanner() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [isEmailVerified, setIsEmailVerified] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isSent, setIsSent] = useState(false)

  useEffect(() => {
    const checkVerificationStatus = async () => {
      if (!session?.user) return

      try {
        const response = await fetch(`/api/user/verification-status`)
        if (response.ok) {
          const data = await response.json()
          setIsEmailVerified(data.emailVerified || false)
          if (data.emailVerified) {
            setIsSent(false) // Reset sent state if verified
          }
        }
      } catch (error) {
        console.error("Error checking verification status:", error)
      }
    }

    checkVerificationStatus()
    
    // Poll for verification status every 5 seconds if not verified
    if (!isEmailVerified) {
      const interval = setInterval(checkVerificationStatus, 5000)
      return () => clearInterval(interval)
    }
  }, [session, isEmailVerified])

  const handleSendVerification = async () => {
    setIsSending(true)
    try {
      const response = await fetch("/api/auth/send-verification", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        setIsSent(true)
        toast({
          title: "Email Sent",
          description: "Verification email sent! Please check your inbox.",
        })
      } else {
        // Show specific error message based on error code
        let errorTitle = "Error"
        let errorDescription = data.error || "Failed to send verification email"

        if (data.errorCode === "INVALID_FORMAT" || data.errorCode === "INVALID_DOMAIN") {
          errorTitle = "Invalid Email Address"
          errorDescription = "Your email address is invalid. Please update your email address in your account settings."
        } else if (data.errorCode === "INVALID_EMAIL_DELIVERY") {
          errorTitle = "Email Cannot Receive Messages"
          errorDescription = "Your email address cannot receive emails. Please update your email address to a valid one."
        } else if (data.errorCode === "SMTP_CONNECTION_ERROR" || data.errorCode === "EMAIL_SEND_FAILED") {
          errorTitle = "Email Service Error"
          errorDescription = "We were unable to send the verification email. Please try again later."
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
      setIsSending(false)
    }
  }

  if (!session?.user || isEmailVerified) {
    return null
  }

  return (
    <Card className="mb-6 border-2 border-yellow-500/20 bg-yellow-500/5 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-full bg-yellow-500/10 flex-shrink-0">
            <Mail className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1 text-foreground">
              Verify Your Email Address
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Your email address hasn't been verified yet. Please verify your email to access all features.
            </p>
            {isSent ? (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Verification email sent! Check your inbox.</span>
              </div>
            ) : (
              <Button
                onClick={handleSendVerification}
                disabled={isSending}
                size="sm"
                variant="outline"
                className="bg-background hover:bg-accent"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Verify Email
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

