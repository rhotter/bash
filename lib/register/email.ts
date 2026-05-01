/**
 * Confirmation email after a successful registration.
 *
 * Skips actual sending if RESEND_API_KEY (or AUTH_RESEND_KEY) isn't set —
 * useful for local dev. In stub mode we just log the would-be email.
 */

import { Resend } from "resend"
import { db, schema } from "@/lib/db"
import { eq } from "drizzle-orm"

let cached: Resend | null = null

function getResend(): Resend | null {
  if (cached) return cached
  const key = process.env.RESEND_API_KEY ?? process.env.AUTH_RESEND_KEY
  if (!key) return null
  cached = new Resend(key)
  return cached
}

const FROM_DEFAULT = process.env.AUTH_EMAIL_FROM ?? "BASH <noreply@bash.fan>"

export async function sendConfirmationEmail(opts: {
  registration: typeof schema.registrations.$inferSelect
  periodId: string
}): Promise<void> {
  const { registration, periodId } = opts

  const [user] = await db
    .select({ email: schema.users.email, name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.id, registration.userId))
    .limit(1)
  if (!user) return

  const [period] = await db
    .select({
      confirmationEmailBody: schema.registrationPeriods.confirmationEmailBody,
      seasonId: schema.registrationPeriods.seasonId,
    })
    .from(schema.registrationPeriods)
    .where(eq(schema.registrationPeriods.id, periodId))
    .limit(1)

  const [season] = period
    ? await db
        .select({ name: schema.seasons.name })
        .from(schema.seasons)
        .where(eq(schema.seasons.id, period.seasonId))
        .limit(1)
    : []

  const seasonName = season?.name ?? "this season"
  const customBody = period?.confirmationEmailBody?.trim() || ""

  const amount =
    registration.amountPaid !== null
      ? `$${(registration.amountPaid / 100).toFixed(2)}`
      : "—"
  const paidAt = registration.paidAt
    ? new Date(registration.paidAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "today"

  const subject = `You're registered for BASH ${seasonName}`

  const text = [
    `Hi ${user.name ?? ""}`.trim() + ",",
    "",
    customBody,
    "",
    "─────",
    `Season: ${seasonName}`,
    `Amount paid: ${amount}`,
    `Date: ${paidAt}`,
    "",
    "Drop in here any time to see your registration history: https://bash.fan/account",
    "",
    "— BASH",
  ]
    .filter(Boolean)
    .join("\n")

  const resend = getResend()
  if (!resend) {
    console.log("[email stub] would send to", user.email, "subject:", subject)
    return
  }

  try {
    await resend.emails.send({
      from: FROM_DEFAULT,
      to: user.email,
      subject,
      text,
    })
  } catch (err) {
    console.error("Resend send failed:", err)
  }
}
