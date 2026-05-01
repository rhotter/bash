/**
 * Stripe Checkout integration.
 *
 * Skips Stripe entirely if STRIPE_SECRET_KEY isn't set — useful for local dev
 * before the user has a Stripe account. In stub mode we generate a fake session
 * ID + a redirect to the confirmation page so the funnel can be exercised
 * end-to-end without real card data.
 */

import Stripe from "stripe"
import { randomUUID } from "crypto"

let cached: Stripe | null = null

export function getStripe(): Stripe | null {
  if (cached) return cached
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  // Don't pin an apiVersion — let the SDK use the account's default.
  cached = new Stripe(key)
  return cached
}

export interface CheckoutResult {
  ok: true
  sessionId: string
  url: string
}

export interface CheckoutError {
  ok: false
  error: string
}

export async function createCheckoutSession(opts: {
  registrationId: string
  periodId: string
  seasonId: string
  userId: string
  totalCents: number
  successUrl: string
  cancelUrl: string
}): Promise<CheckoutResult | CheckoutError> {
  const stripe = getStripe()

  if (!stripe) {
    // Stub mode: pretend we made a session and redirect straight to confirmation.
    // The webhook flow is skipped — the submit route should not enter this branch
    // when totalCents === 0 (that path is already short-circuited upstream).
    const fakeId = `cs_stub_${randomUUID().slice(0, 12)}`
    return { ok: true, sessionId: fakeId, url: opts.successUrl + "&stub=1" }
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: opts.totalCents,
            product_data: {
              name: `BASH ${opts.seasonId} registration`,
            },
          },
        },
      ],
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
      client_reference_id: opts.registrationId,
      metadata: {
        registrationId: opts.registrationId,
        periodId: opts.periodId,
        seasonId: opts.seasonId,
        userId: opts.userId,
      },
    })

    if (!session.url) {
      return { ok: false, error: "Stripe did not return a checkout URL" }
    }
    return { ok: true, sessionId: session.id, url: session.url }
  } catch (err) {
    console.error("Stripe checkout creation failed:", err)
    return { ok: false, error: err instanceof Error ? err.message : "Stripe error" }
  }
}
