import { db, schema } from "@/lib/db"
import { desc } from "drizzle-orm"
import { ExtrasClient, type ExtraRow } from "@/components/admin/registration/extras-client"

export const metadata = {
  title: "Extras | Admin",
}

export default async function ExtrasPage() {
  const rows = await db
    .select()
    .from(schema.extras)
    .orderBy(desc(schema.extras.id))

  const extras: ExtraRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    price: r.price,
    detailType: r.detailType,
    detailLabel: r.detailLabel,
    active: r.active,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Extras</h1>
        <p className="text-muted-foreground mt-1">
          Optional add-ons (donations, tournament fees, jerseys). Created here, assigned to specific registration periods later.
        </p>
      </div>
      <ExtrasClient initial={extras} />
    </div>
  )
}
