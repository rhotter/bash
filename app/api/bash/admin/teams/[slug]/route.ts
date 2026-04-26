import { NextResponse } from "next/server"
import { db, schema } from "@/lib/db"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/admin-session"

export async function PUT(request: Request, props: { params: Promise<{ slug: string }> }) {
  const isAuthenticated = await getSession()
  if (!isAuthenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const params = await props.params
  const slug = params.slug

  if (!slug) {
    return NextResponse.json({ error: "Invalid team slug" }, { status: 400 })
  }

  try {
    const data = await request.json()
    const { name } = data

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const [team] = await db
      .update(schema.teams)
      .set({ name: name.trim() })
      .where(eq(schema.teams.slug, slug))
      .returning()

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    return NextResponse.json({ team })
  } catch (error) {
    console.error("Failed to update team:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
