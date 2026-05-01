import { NextRequest, NextResponse } from "next/server"
import { db, schema } from "@/lib/db"
import { desc, eq } from "drizzle-orm"
import { getSession } from "@/lib/admin-session"

export async function GET() {
  const isAuthenticated = await getSession()
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rows = await db
    .select()
    .from(schema.discountCodes)
    .orderBy(desc(schema.discountCodes.id))

  return NextResponse.json({ codes: rows })
}

export async function POST(request: NextRequest) {
  const isAuthenticated = await getSession()
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { code, reason, amountOff, limitation, maxUses, expiresAt, active } = body

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 })
    }
    if (typeof amountOff !== "number" || amountOff < 0) {
      return NextResponse.json({ error: "amountOff must be a non-negative number (cents)" }, { status: 400 })
    }
    if (limitation && !["unlimited", "once_per_family", "once_per_registrant"].includes(limitation)) {
      return NextResponse.json({ error: "Invalid limitation value" }, { status: 400 })
    }

    const existing = await db
      .select({ id: schema.discountCodes.id })
      .from(schema.discountCodes)
      .where(eq(schema.discountCodes.code, code.trim()))
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json({ error: "A code with this name already exists" }, { status: 409 })
    }

    const [created] = await db
      .insert(schema.discountCodes)
      .values({
        code: code.trim(),
        reason: reason || null,
        amountOff,
        limitation: limitation || "unlimited",
        maxUses: typeof maxUses === "number" ? maxUses : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        active: active !== false,
      })
      .returning()

    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    console.error("Failed to create discount code:", err)
    return NextResponse.json({ error: "Failed to create discount code" }, { status: 500 })
  }
}
