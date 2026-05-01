import { NextRequest, NextResponse } from "next/server"
import { db, schema } from "@/lib/db"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/admin-session"

interface RouteContext {
  params: Promise<{ id: string }>
}

const VALID_ACK_TYPES = ["basic", "legal"] as const

export async function PUT(request: NextRequest, context: RouteContext) {
  const isAuthenticated = await getSession()
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const numericId = Number.parseInt(id, 10)
  if (Number.isNaN(numericId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  }

  try {
    const body = await request.json()

    // Need the existing row to know whether to bump version (body changed = new version).
    const [existing] = await db
      .select()
      .from(schema.legalNotices)
      .where(eq(schema.legalNotices.id, numericId))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (body.title !== undefined) updates.title = String(body.title).trim()
    if (body.body !== undefined) {
      updates.body = body.body
      // bump version if body actually changed
      if (body.body !== existing.body) {
        updates.version = existing.version + 1
      }
    }
    if (body.ackType !== undefined) {
      if (!VALID_ACK_TYPES.includes(body.ackType)) {
        return NextResponse.json({ error: "Invalid ackType" }, { status: 400 })
      }
      updates.ackType = body.ackType
    }

    if (Object.keys(updates).length === 1) {
      // only updatedAt
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const [updated] = await db
      .update(schema.legalNotices)
      .set(updates)
      .where(eq(schema.legalNotices.id, numericId))
      .returning()

    return NextResponse.json(updated)
  } catch (err) {
    console.error("Failed to update notice:", err)
    return NextResponse.json({ error: "Failed to update notice" }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const isAuthenticated = await getSession()
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const numericId = Number.parseInt(id, 10)
  if (Number.isNaN(numericId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  }

  try {
    await db.delete(schema.legalNotices).where(eq(schema.legalNotices.id, numericId))
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Failed to delete notice:", err)
    return NextResponse.json({ error: "Failed to delete notice" }, { status: 500 })
  }
}
