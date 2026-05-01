import { db, schema } from "@/lib/db"
import { desc } from "drizzle-orm"
import { DiscountsClient, type DiscountRow } from "@/components/admin/registration/discounts-client"

export const metadata = {
  title: "Discount Codes | Admin",
}

export default async function DiscountsPage() {
  const rows = await db
    .select()
    .from(schema.discountCodes)
    .orderBy(desc(schema.discountCodes.id))

  const codes: DiscountRow[] = rows.map((r) => ({
    id: r.id,
    code: r.code,
    reason: r.reason,
    amountOff: r.amountOff,
    limitation: r.limitation,
    maxUses: r.maxUses,
    usedCount: r.usedCount,
    expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
    active: r.active,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Discount Codes</h1>
        <p className="text-muted-foreground mt-1">
          Flat-dollar discount codes. Created here, assigned to specific registration periods later.
        </p>
      </div>
      <DiscountsClient initial={codes} />
    </div>
  )
}
