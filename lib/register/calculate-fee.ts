import { db, schema } from "@/lib/db"
import { and, eq, inArray } from "drizzle-orm"

export interface FeeBreakdown {
  baseFeeCents: number
  extrasCents: number
  discountCents: number
  totalCents: number
  // Returned for tx tracking
  appliedDiscountId: number | null
  appliedExtraIds: number[]
}

/**
 * Compute the final fee for a registration.
 *
 * Inputs are the period config + the user's selections (extras + an
 * optional discount code). All amounts in cents.
 *
 * Discount code validation:
 *   - must be `active`
 *   - must not be expired
 *   - must not have hit `maxUses`
 *   - must be assigned to this period
 *   - `limitation` rules (once_per_registrant) checked at submit time, not here
 */
export async function calculateFee(opts: {
  periodId: string
  selectedExtraIds: number[]
  discountCode: string | null
}): Promise<{ ok: true; fee: FeeBreakdown } | { ok: false; error: string }> {
  const { periodId, selectedExtraIds, discountCode } = opts

  const [period] = await db
    .select()
    .from(schema.registrationPeriods)
    .where(eq(schema.registrationPeriods.id, periodId))
    .limit(1)
  if (!period) return { ok: false, error: "Unknown period" }

  // Resolve assigned extras
  const baseFeeCents = period.baseFee ?? 0
  let extrasCents = 0
  const appliedExtraIds: number[] = []

  if (selectedExtraIds.length > 0) {
    const assigned = await db
      .select({ extraId: schema.registrationPeriodExtras.extraId })
      .from(schema.registrationPeriodExtras)
      .where(eq(schema.registrationPeriodExtras.periodId, periodId))
    const assignedSet = new Set(assigned.map((a) => a.extraId))

    const validExtraIds = selectedExtraIds.filter((id) => assignedSet.has(id))
    if (validExtraIds.length > 0) {
      const rows = await db
        .select({ id: schema.extras.id, price: schema.extras.price, active: schema.extras.active })
        .from(schema.extras)
        .where(inArray(schema.extras.id, validExtraIds))
      for (const r of rows) {
        if (!r.active) continue
        extrasCents += r.price
        appliedExtraIds.push(r.id)
      }
    }
  }

  // Resolve discount
  let discountCents = 0
  let appliedDiscountId: number | null = null
  if (discountCode && discountCode.trim()) {
    const code = discountCode.trim()
    const [dc] = await db
      .select()
      .from(schema.discountCodes)
      .where(eq(schema.discountCodes.code, code))
      .limit(1)
    if (!dc) return { ok: false, error: "Discount code not found" }
    if (!dc.active) return { ok: false, error: "Discount code is inactive" }
    if (dc.expiresAt && dc.expiresAt < new Date()) {
      return { ok: false, error: "Discount code has expired" }
    }
    if (dc.maxUses !== null && dc.usedCount >= dc.maxUses) {
      return { ok: false, error: "Discount code has reached its usage limit" }
    }

    // Must be assigned to this period
    const [assigned] = await db
      .select()
      .from(schema.registrationPeriodDiscounts)
      .where(
        and(
          eq(schema.registrationPeriodDiscounts.periodId, periodId),
          eq(schema.registrationPeriodDiscounts.discountId, dc.id)
        )
      )
      .limit(1)
    if (!assigned) return { ok: false, error: "Discount code not valid for this registration" }

    discountCents = dc.amountOff
    appliedDiscountId = dc.id
  }

  const total = Math.max(0, baseFeeCents + extrasCents - discountCents)

  return {
    ok: true,
    fee: {
      baseFeeCents,
      extrasCents,
      discountCents,
      totalCents: total,
      appliedDiscountId,
      appliedExtraIds,
    },
  }
}
