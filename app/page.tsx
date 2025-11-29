"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"

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
