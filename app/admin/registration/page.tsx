import Link from "next/link"
import { db, schema } from "@/lib/db"
import { count } from "drizzle-orm"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ClipboardList, Tag, Plus, ScrollText } from "lucide-react"

export const metadata = {
  title: "Registration | Admin",
}

export default async function AdminRegistrationPage() {
  const [[noticesCount], [extrasCount], [discountsCount]] = await Promise.all([
    db.select({ n: count() }).from(schema.legalNotices),
    db.select({ n: count() }).from(schema.extras),
    db.select({ n: count() }).from(schema.discountCodes),
  ])

  const libraries = [
    {
      title: "Notices",
      description: "Reusable waivers and notices assigned to registration periods.",
      href: "/admin/registration/notices",
      icon: ScrollText,
      count: noticesCount.n,
    },
    {
      title: "Extras",
      description: "Optional add-ons (donations, tournament fees, jerseys).",
      href: "/admin/registration/extras",
      icon: Plus,
      count: extrasCount.n,
    },
    {
      title: "Discount Codes",
      description: "Flat-dollar codes with usage caps and expiry dates.",
      href: "/admin/registration/discounts",
      icon: Tag,
      count: discountsCount.n,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Registration</h1>
        <p className="text-muted-foreground mt-1">
          Manage the global libraries used to configure each season&apos;s registration period.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {libraries.map(({ title, description, href, icon: Icon, count: n }) => (
          <Card key={href}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{title}</CardTitle>
                </div>
                <Badge variant="secondary" className="rounded-full">{n}</Badge>
              </div>
              <CardDescription className="pt-1">{description}</CardDescription>
            </CardHeader>
            <CardContent />
            <CardFooter>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href={href}>Manage</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Active periods</CardTitle>
          </div>
          <CardDescription>
            Player-facing registration funnel and per-period config — coming next.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Phase B will add: per-period config, the public <code className="text-xs">/register</code> funnel, and the
            registrant dashboard. For now, the libraries above are the only working pieces.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
