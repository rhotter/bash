import { NextResponse } from "next/server"
import { getSession } from "@/lib/admin-session"
import { mergeDuplicatePlayers } from "@/lib/merge-duplicates"

export async function POST() {
  const isAuthenticated = await getSession()
  if (!isAuthenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const result = await mergeDuplicatePlayers()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Failed to merge duplicate players:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
