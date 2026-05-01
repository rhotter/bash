import { NextRequest, NextResponse } from "next/server"
import { db, schema } from "@/lib/db"
import { desc } from "drizzle-orm"
import { getSession } from "@/lib/admin-session"

const VALID_DETAIL_TYPES = [null, "text", "size_dropdown"] as const

export async function GET() {
  const isAuthenticated = await getSession()
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rows = await db
    .select()
    .from(schema.extras)
    .orderBy(desc(schema.extras.id))

  return NextResponse.json({ extras: rows })
}

export async function POST(request: NextRequest) {
  const isAuthenticated = await getSession()
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, description, price, detailType, detailLabel, active } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    if (typeof price !== "number" || price < 0) {
      return NextResponse.json({ error: "price must be a non-negative number (cents)" }, { status: 400 })
    }
    const normalizedDetailType = detailType || null
    if (!VALID_DETAIL_TYPES.includes(normalizedDetailType)) {
      return NextResponse.json({ error: "Invalid detailType" }, { status: 400 })
    }

    const [created] = await db
      .insert(schema.extras)
      .values({
        name: name.trim(),
        description: description || null,
        price,
        detailType: normalizedDetailType,
        detailLabel: detailLabel || null,
        active: active !== false,
      })
      .returning()

    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    console.error("Failed to create extra:", err)
    return NextResponse.json({ error: "Failed to create extra" }, { status: 500 })
  }
}
