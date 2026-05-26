"use client"

import { useEffect } from "react"

export function AutoPrint() {
  useEffect(() => {
    // Small delay to ensure the page is fully rendered before triggering print
    const timer = setTimeout(() => {
      window.print()
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return null
}
