import { NextRequest, NextResponse } from "next/server"
import { db, schema } from "@/lib/db"
import { and, eq } from "drizzle-orm"
import { auth } from "@/auth"
import { randomUUID } from "crypto"

interface RouteContext {
  params: Promise<{ periodId: string }>
}

/**
 * GET /api/register/[periodId] — return the period, the user's draft (if any),
 * and resolved assignments. Requires auth.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { periodId } = await context.params
  const userId = (session.user as { id?: string }).id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [period] = await db
    .select()
    .from(schema.registrationPeriods)
    .where(eq(schema.registrationPeriods.id, periodId))
    .limit(1)
  if (!period) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const [draft] = await db
    .select()
    .from(schema.registrations)
    .where(
      and(
        eq(schema.registrations.userId, userId),
        eq(schema.registrations.periodId, periodId)
      )
    )
    .limit(1)

  // Resolve assignments
  const [questions, noticeIds, extraRows, discountRows] = await Promise.all([
    db.select().from(schema.registrationQuestions)
      .where(eq(schema.registrationQuestions.periodId, periodId)),
    db.select().from(schema.registrationPeriodNotices)
      .where(eq(schema.registrationPeriodNotices.periodId, periodId)),
    db.select().from(schema.registrationPeriodExtras)
      .where(eq(schema.registrationPeriodExtras.periodId, periodId)),
    db.select().from(schema.registrationPeriodDiscounts)
      .where(eq(schema.registrationPeriodDiscounts.periodId, periodId)),
  ])

  return NextResponse.json({
    period,
    draft: draft ?? null,
    questions,
    noticeIds: noticeIds.map((n) => n.noticeId),
    extraIds: extraRows.map((e) => e.extraId),
    discountIds: discountRows.map((d) => d.discountId),
  })
}

/**
 * POST /api/register/[periodId] — upsert a draft registration. Auto-save target.
 * Body: any subset of registration fields.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { periodId } = await context.params
  const userId = (session.user as { id?: string }).id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()

    const [existing] = await db
      .select({ id: schema.registrations.id, status: schema.registrations.status })
      .from(schema.registrations)
      .where(
        and(
          eq(schema.registrations.userId, userId),
          eq(schema.registrations.periodId, periodId)
        )
      )
      .limit(1)

    // Don't allow overwriting a finalized registration via auto-save.
    if (existing && existing.status !== "draft") {
      return NextResponse.json({ error: "Registration is no longer editable" }, { status: 400 })
    }

    const fields = pickRegistrationFields(body)

    if (existing) {
      await db
        .update(schema.registrations)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(schema.registrations.id, existing.id))
      return NextResponse.json({ id: existing.id, status: "draft" })
    } else {
      const id = `reg-${randomUUID().slice(0, 8)}`
      await db.insert(schema.registrations).values({
        id,
        userId,
        periodId,
        status: "draft",
        ...fields,
      })
      return NextResponse.json({ id, status: "draft" }, { status: 201 })
    }
  } catch (err) {
    console.error("Failed to save draft registration:", err)
    return NextResponse.json({ error: "Save failed" }, { status: 500 })
  }
}

function pickRegistrationFields(body: Record<string, unknown>): Record<string, unknown> {
  const allowed = new Set([
    "phone", "address",
    "birthdate", "gender", "tshirtSize",
    "emergencyName", "emergencyPhone",
    "healthPlan", "healthPlanId",
    "doctorName", "doctorPhone", "medicalNotes",
    "yearsPlayed", "skillLevel", "positions",
    "lastLeague", "lastTeam",
    "miscNotes",
    "teamSlug",
  ])
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(body)) {
    if (allowed.has(k)) out[k] = body[k]
  }
  return out
}

export const runtime = "nodejs"
