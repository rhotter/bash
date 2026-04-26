import { NextResponse } from "next/server"
import { db, schema } from "@/lib/db"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/admin-session"

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const isAuthenticated = await getSession()
  if (!isAuthenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const params = await props.params
  const idStr = params.id
  const id = parseInt(idStr, 10)

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid player ID" }, { status: 400 })
  }

  try {
    const data = await request.json()
    const { name } = data

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const [player] = await db
      .update(schema.players)
      .set({ name: name.trim() })
      .where(eq(schema.players.id, id))
      .returning()

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }

    return NextResponse.json({ player })
  } catch (error) {
    console.error("Failed to update player:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
