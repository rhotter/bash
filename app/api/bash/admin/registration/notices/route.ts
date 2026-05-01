import { NextRequest, NextResponse } from "next/server"
import { db, schema } from "@/lib/db"
import { desc } from "drizzle-orm"
import { getSession } from "@/lib/admin-session"

const VALID_ACK_TYPES = ["basic", "legal"] as const

export async function GET() {
  const isAuthenticated = await getSession()
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rows = await db
    .select()
    .from(schema.legalNotices)
    .orderBy(desc(schema.legalNotices.id))

  return NextResponse.json({ notices: rows })
}

export async function POST(request: NextRequest) {
  const isAuthenticated = await getSession()
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, body: noticeBody, ackType } = body

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }
    if (!noticeBody || typeof noticeBody !== "string" || noticeBody.trim().length === 0) {
      return NextResponse.json({ error: "Body is required" }, { status: 400 })
    }
    const ack = ackType || "basic"
    if (!VALID_ACK_TYPES.includes(ack)) {
      return NextResponse.json({ error: "Invalid ackType" }, { status: 400 })
    }

    const [created] = await db
      .insert(schema.legalNotices)
      .values({
        title: title.trim(),
        body: noticeBody,
        ackType: ack,
        version: 1,
      })
      .returning()

    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    console.error("Failed to create notice:", err)
    return NextResponse.json({ error: "Failed to create notice" }, { status: 500 })
  }
}
