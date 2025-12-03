"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"

// Force dynamic rendering to prevent build-time prerendering issues
export const dynamic = 'force-dynamic'

export default function Home() {
  const router = useRouter()
  const { data: session } = useSession()

  useEffect(() => {
    if (session) {
      router.push("/workspace")
    } else {
      router.push("/auth/signin")
    }
  }, [session, router])

  return null
}
