import Link from "next/link"
import { redirect } from "next/navigation"
import { db, schema } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { auth } from "@/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2 } from "lucide-react"

export const metadata = { title: "You're registered | BASH" }
export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ periodId: string }>
  searchParams: Promise<{ reg?: string; stub?: string }>
}

export default async function ConfirmationPage({ params, searchParams }: PageProps) {
  const { periodId } = await params
  const { reg, stub } = await searchParams

  const session = await auth()
  if (!session?.user) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/register/${periodId}/confirmation${reg ? `?reg=${reg}` : ""}`)}`)
  }
  const userId = (session.user as { id?: string }).id
  if (!userId) redirect("/signin")

  const [registration] = reg
    ? await db
        .select({
          id: schema.registrations.id,
          status: schema.registrations.status,
          amountPaid: schema.registrations.amountPaid,
          paidAt: schema.registrations.paidAt,
          seasonName: schema.seasons.name,
        })
        .from(schema.registrations)
        .innerJoin(schema.registrationPeriods, eq(schema.registrations.periodId, schema.registrationPeriods.id))
        .innerJoin(schema.seasons, eq(schema.registrationPeriods.seasonId, schema.seasons.id))
        .where(and(eq(schema.registrations.id, reg), eq(schema.registrations.userId, userId)))
        .limit(1)
    : []

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-3">
          <div className="h-10 w-10 rounded-full bg-green-500/10 text-green-700 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl">You&apos;re in.</CardTitle>
          <CardDescription>
            {registration?.seasonName
              ? `Your registration for ${registration.seasonName} is confirmed.`
              : `Your registration is confirmed.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {registration && (
            <div className="rounded-md border p-3 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-700 border-green-500/30">
                  {registration.status === "paid" ? "Paid" : registration.status}
                </Badge>
              </div>
              {registration.amountPaid !== null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span>${(registration.amountPaid / 100).toFixed(2)}</span>
                </div>
              )}
              {registration.paidAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span>{new Date(registration.paidAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}

          {stub === "1" && (
            <div className="text-xs text-amber-700 bg-amber-500/10 px-3 py-2 rounded-md border border-amber-500/30">
              Stub mode — Stripe is not configured, so payment was simulated. Set
              <code className="mx-1 text-[11px]">STRIPE_SECRET_KEY</code> to enable real charges.
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            We&apos;ve sent a confirmation email. You can review your registration any time at{" "}
            <Link href="/account" className="underline">
              your account
            </Link>
            .
          </p>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/account">Go to my account</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
