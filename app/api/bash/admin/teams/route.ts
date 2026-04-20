import { NextResponse } from "next/server"
import { db, schema } from "@/lib/db"
import { asc } from "drizzle-orm"
import { getSession } from "@/lib/admin-session"

export async function GET() {
  const isAuthenticated = await getSession()
  if (!isAuthenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const allTeams = await db.select().from(schema.teams).orderBy(asc(schema.teams.name))
  return NextResponse.json({ teams: allTeams })
}

export async function POST(request: Request) {
  const isAuthenticated = await getSession()
  if (!isAuthenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const data = await request.json()
    const { slug, name } = data

    if (!slug || !name || typeof slug !== "string" || typeof name !== "string") {
      return NextResponse.json({ error: "Slug and Name are required" }, { status: 400 })
    }

    const [team] = await db
      .insert(schema.teams)
      .values({ slug: slug.trim().toLowerCase(), name: name.trim() })
      .returning()

    return NextResponse.json({ team })
  } catch (error) {
    console.error("Failed to create team:", error)
    return NextResponse.json({ error: "Internal Server Error. Slug may already exist." }, { status: 500 })
  }
}
