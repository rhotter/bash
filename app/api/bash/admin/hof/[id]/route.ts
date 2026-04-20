import { NextResponse } from "next/server"
import { db, schema } from "@/lib/db"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/admin-session"

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const isAuthenticated = await getSession()
  if (!isAuthenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const params = await props.params
  const idStr = params.id
  const id = parseInt(idStr, 10)

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid HOF entry ID" }, { status: 400 })
  }

  try {
    await db.delete(schema.hallOfFame).where(eq(schema.hallOfFame.id, id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete HOF entry:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
