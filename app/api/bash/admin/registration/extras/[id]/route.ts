import { NextRequest, NextResponse } from "next/server"
import { db, schema } from "@/lib/db"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/admin-session"

interface RouteContext {
  params: Promise<{ id: string }>
}

const VALID_DETAIL_TYPES = [null, "text", "size_dropdown"] as const

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
    const updates: Record<string, unknown> = {}

    if (body.name !== undefined) updates.name = String(body.name).trim()
    if (body.description !== undefined) updates.description = body.description || null
    if (body.price !== undefined) {
      if (typeof body.price !== "number" || body.price < 0) {
        return NextResponse.json({ error: "price must be a non-negative number (cents)" }, { status: 400 })
      }
      updates.price = body.price
    }
    if (body.detailType !== undefined) {
      const dt = body.detailType || null
      if (!VALID_DETAIL_TYPES.includes(dt)) {
        return NextResponse.json({ error: "Invalid detailType" }, { status: 400 })
      }
      updates.detailType = dt
    }
    if (body.detailLabel !== undefined) updates.detailLabel = body.detailLabel || null
    if (body.active !== undefined) updates.active = !!body.active

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const [updated] = await db
      .update(schema.extras)
      .set(updates)
      .where(eq(schema.extras.id, numericId))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error("Failed to update extra:", err)
    return NextResponse.json({ error: "Failed to update extra" }, { status: 500 })
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
    await db.delete(schema.extras).where(eq(schema.extras.id, numericId))
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Failed to delete extra:", err)
    return NextResponse.json({ error: "Failed to delete extra" }, { status: 500 })
  }
}
