import Link from "next/link"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarOff } from "lucide-react"
import { getCurrentRegistrationPeriod } from "@/lib/register/current-period"

export const metadata = { title: "Register | BASH" }
export const dynamic = "force-dynamic"

export default async function RegisterLandingPage() {
  const period = await getCurrentRegistrationPeriod()

  if (period) {
    redirect(`/register/${period.id}`)
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-3">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <CalendarOff className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl">Registration is closed</CardTitle>
          <CardDescription>
            There&apos;s no open registration period right now. Check back soon — registration usually opens a few weeks before the season starts.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/account">My account</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
