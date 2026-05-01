import { NextRequest, NextResponse } from "next/server"
import { db, schema } from "@/lib/db"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/admin-session"

interface RouteContext {
  params: Promise<{ id: string }>
}

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

    if (body.code !== undefined) updates.code = String(body.code).trim()
    if (body.reason !== undefined) updates.reason = body.reason || null
    if (body.amountOff !== undefined) {
      if (typeof body.amountOff !== "number" || body.amountOff < 0) {
        return NextResponse.json({ error: "amountOff must be a non-negative number (cents)" }, { status: 400 })
      }
      updates.amountOff = body.amountOff
    }
    if (body.limitation !== undefined) {
      if (!["unlimited", "once_per_family", "once_per_registrant"].includes(body.limitation)) {
        return NextResponse.json({ error: "Invalid limitation value" }, { status: 400 })
      }
      updates.limitation = body.limitation
    }
    if (body.maxUses !== undefined) {
      updates.maxUses = typeof body.maxUses === "number" ? body.maxUses : null
    }
    if (body.expiresAt !== undefined) {
      updates.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
    }
    if (body.active !== undefined) updates.active = !!body.active

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const [updated] = await db
      .update(schema.discountCodes)
      .set(updates)
      .where(eq(schema.discountCodes.id, numericId))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error("Failed to update discount code:", err)
    return NextResponse.json({ error: "Failed to update discount code" }, { status: 500 })
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
    await db.delete(schema.discountCodes).where(eq(schema.discountCodes.id, numericId))
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Failed to delete discount code:", err)
    return NextResponse.json({ error: "Failed to delete discount code" }, { status: 500 })
  }
}
