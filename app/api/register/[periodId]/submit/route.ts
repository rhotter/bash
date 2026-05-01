import { NextRequest, NextResponse } from "next/server"
import { db, schema } from "@/lib/db"
import { and, eq } from "drizzle-orm"
import { auth } from "@/auth"
import { calculateFee } from "@/lib/register/calculate-fee"
import { deriveRookieForUser } from "@/lib/register/derive-rookie"
import { createCheckoutSession } from "@/lib/register/stripe"
import { sendConfirmationEmail } from "@/lib/register/email"
import { randomUUID } from "crypto"

interface RouteContext {
  params: Promise<{ periodId: string }>
}

/**
 * POST /api/register/[periodId]/submit — finalize a draft registration.
 *
 * Body:
 *   selectedExtraIds: number[]
 *   extraDetails: Record<extraId, string>   // optional per-extra detail (text/size)
 *   noticeAcks: number[]                    // notice IDs the user has acknowledged
 *   discountCode?: string
 *   selfReportedRookie?: boolean           // hint from new-player gating step
 *
 * Returns either:
 *   { ok: true, redirect: string }   — redirect to Stripe Checkout
 *   { ok: true, paid: true, redirect: string }  — $0 short-circuit, status set to paid
 *   { error: string }                — validation failure
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { periodId } = await context.params
  const userId = (session.user as { id?: string }).id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const selectedExtraIds: number[] = Array.isArray(body.selectedExtraIds) ? body.selectedExtraIds : []
    const extraDetails: Record<string, string> =
      body.extraDetails && typeof body.extraDetails === "object" ? body.extraDetails : {}
    const noticeAcks: number[] = Array.isArray(body.noticeAcks) ? body.noticeAcks : []
    const discountCode: string | null = body.discountCode ? String(body.discountCode).trim() : null
    const selfReportedRookie = !!body.selfReportedRookie

    // Resolve the period & required notices
    const [period] = await db
      .select()
      .from(schema.registrationPeriods)
      .where(eq(schema.registrationPeriods.id, periodId))
      .limit(1)
    if (!period) return NextResponse.json({ error: "Period not found" }, { status: 404 })
    if (period.status !== "open") {
      return NextResponse.json({ error: "Registration is not open" }, { status: 400 })
    }

    const requiredNotices = await db
      .select()
      .from(schema.registrationPeriodNotices)
      .where(eq(schema.registrationPeriodNotices.periodId, periodId))
    const requiredIds = new Set(requiredNotices.map((n) => n.noticeId))
    for (const id of requiredIds) {
      if (!noticeAcks.includes(id)) {
        return NextResponse.json({ error: "All required notices must be acknowledged" }, { status: 400 })
      }
    }

    // Capacity check
    if (period.maxPlayers !== null) {
      const filled = await db
        .select({ id: schema.registrations.id })
        .from(schema.registrations)
        .where(
          and(
            eq(schema.registrations.periodId, periodId),
            eq(schema.registrations.status, "paid")
          )
        )
      if (filled.length >= period.maxPlayers) {
        return NextResponse.json({ error: "Registration is full" }, { status: 400 })
      }
    }

    // Resolve the user's draft (created earlier via /api/register/[periodId])
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
    if (!draft) return NextResponse.json({ error: "No draft found. Save your form first." }, { status: 400 })
    if (draft.status === "paid") {
      return NextResponse.json({ error: "Already paid" }, { status: 400 })
    }

    // Compute fee
    const feeResult = await calculateFee({ periodId, selectedExtraIds, discountCode })
    if (!feeResult.ok) return NextResponse.json({ error: feeResult.error }, { status: 400 })
    const fee = feeResult.fee

    // Persist extras + acknowledgements
    await db.delete(schema.registrationExtras).where(eq(schema.registrationExtras.registrationId, draft.id))
    if (fee.appliedExtraIds.length > 0) {
      await db.insert(schema.registrationExtras).values(
        fee.appliedExtraIds.map((extraId) => ({
          registrationId: draft.id,
          extraId,
          detail: extraDetails[String(extraId)] ?? null,
        }))
      )
    }

    // Notice acks: insert any not yet recorded for this user/notice/version pair
    for (const noticeId of noticeAcks) {
      const [notice] = await db
        .select({ id: schema.legalNotices.id, version: schema.legalNotices.version })
        .from(schema.legalNotices)
        .where(eq(schema.legalNotices.id, noticeId))
        .limit(1)
      if (!notice) continue
      await db.insert(schema.noticeAcknowledgements).values({
        userId,
        noticeId,
        noticeVersion: notice.version,
        registrationId: draft.id,
      })
    }

    // Rookie inference (used only for status decision below)
    const isRookie = selfReportedRookie || (await deriveRookieForUser(userId, period.seasonId))

    // $0 short-circuit (full discount or rookie comp)
    if (fee.totalCents === 0) {
      const [updated] = await db
        .update(schema.registrations)
        .set({
          status: "paid",
          amountPaid: 0,
          paidAt: new Date(),
          discountCodeId: fee.appliedDiscountId,
          updatedAt: new Date(),
        })
        .where(eq(schema.registrations.id, draft.id))
        .returning()

      if (fee.appliedDiscountId !== null) {
        await db
          .update(schema.discountCodes)
          .set({ usedCount: (await getUsedCount(fee.appliedDiscountId)) + 1 })
          .where(eq(schema.discountCodes.id, fee.appliedDiscountId))
      }

      // Fire-and-forget confirmation email
      sendConfirmationEmail({ registration: updated, periodId }).catch((e) =>
        console.error("Confirmation email failed:", e)
      )

      return NextResponse.json({
        ok: true,
        paid: true,
        redirect: `/register/${periodId}/confirmation?reg=${draft.id}`,
      })
    }

    // Rookie deferred: a real Stripe session is still created — rookies who genuinely
    // want to pay later use the special discount code that brings totalCents to 0
    // and short-circuits above.
    void isRookie

    // Stripe Checkout: real session if keys are configured, otherwise stub.
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
    const checkout = await createCheckoutSession({
      registrationId: draft.id,
      periodId,
      seasonId: period.seasonId,
      userId,
      totalCents: fee.totalCents,
      successUrl: `${baseUrl}/register/${periodId}/confirmation?reg=${draft.id}`,
      cancelUrl: `${baseUrl}/register/${periodId}?canceled=1`,
    })

    if (!checkout.ok) {
      return NextResponse.json({ error: checkout.error }, { status: 500 })
    }

    // Mark draft as pending_payment + stash the Stripe session ID so the webhook can match
    await db
      .update(schema.registrations)
      .set({
        status: "pending_payment",
        stripeSessionId: checkout.sessionId,
        discountCodeId: fee.appliedDiscountId,
        amountPaid: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.registrations.id, draft.id))

    return NextResponse.json({ ok: true, redirect: checkout.url })
  } catch (err) {
    console.error("Submit failed:", err)
    return NextResponse.json({ error: "Submit failed" }, { status: 500 })
  }
}

async function getUsedCount(discountId: number): Promise<number> {
  const [r] = await db
    .select({ usedCount: schema.discountCodes.usedCount })
    .from(schema.discountCodes)
    .where(eq(schema.discountCodes.id, discountId))
    .limit(1)
  return r?.usedCount ?? 0
}

export const runtime = "nodejs"
