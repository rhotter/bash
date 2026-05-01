import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db, schema } from "@/lib/db"
import { eq } from "drizzle-orm"
import { getStripe } from "@/lib/register/stripe"
import { sendConfirmationEmail } from "@/lib/register/email"

/**
 * Stripe webhook receiver.
 *
 * Configure in Stripe dashboard pointing at:
 *   https://bash.fan/api/register/stripe/webhook
 * with event `checkout.session.completed` enabled, then drop the resulting
 * signing secret into STRIPE_WEBHOOK_SECRET.
 *
 * If STRIPE_WEBHOOK_SECRET is missing, the route 404s — explicit failure
 * is better than silently accepting unsigned events.
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !secret) {
    return NextResponse.json(
      { error: "Stripe webhook not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET." },
      { status: 404 }
    )
  }

  const sig = request.headers.get("stripe-signature")
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  // Need the raw body bytes for signature verification.
  const rawBody = await request.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret)
  } catch (err) {
    console.error("Stripe signature verification failed:", err)
    return NextResponse.json({ error: "Bad signature" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const registrationId = session.client_reference_id ?? session.metadata?.registrationId
    if (!registrationId) {
      console.error("Stripe checkout.session.completed missing registrationId")
      return NextResponse.json({ ok: true }) // ack and move on; nothing to do
    }

    try {
      // Idempotency: if the registration is already paid, do nothing.
      const [existing] = await db
        .select()
        .from(schema.registrations)
        .where(eq(schema.registrations.id, registrationId))
        .limit(1)

      if (!existing) {
        console.error("Webhook: registration not found", registrationId)
        return NextResponse.json({ ok: true })
      }

      if (existing.status === "paid") {
        return NextResponse.json({ ok: true, idempotent: true })
      }

      const [updated] = await db
        .update(schema.registrations)
        .set({
          status: "paid",
          amountPaid: session.amount_total ?? null,
          paidAt: new Date(),
          stripeSessionId: session.id,
          updatedAt: new Date(),
        })
        .where(eq(schema.registrations.id, registrationId))
        .returning()

      // Bump discount usedCount if the registration used one
      if (updated.discountCodeId) {
        const [dc] = await db
          .select({ usedCount: schema.discountCodes.usedCount })
          .from(schema.discountCodes)
          .where(eq(schema.discountCodes.id, updated.discountCodeId))
          .limit(1)
        if (dc) {
          await db
            .update(schema.discountCodes)
            .set({ usedCount: dc.usedCount + 1 })
            .where(eq(schema.discountCodes.id, updated.discountCodeId))
        }
      }

      // Confirmation email — fire and forget; don't block the webhook ack.
      sendConfirmationEmail({ registration: updated, periodId: updated.periodId }).catch((e) =>
        console.error("Confirmation email failed:", e)
      )
    } catch (err) {
      console.error("Webhook processing failed:", err)
      // Return 500 so Stripe retries.
      return NextResponse.json({ error: "Processing failed" }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}

export const runtime = "nodejs"
