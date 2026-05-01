import { db, schema } from "@/lib/db"
import { desc } from "drizzle-orm"
import { NoticesClient, type NoticeRow } from "@/components/admin/registration/notices-client"

export const metadata = {
  title: "Notices | Admin",
}

export default async function NoticesPage() {
  const rows = await db
    .select()
    .from(schema.legalNotices)
    .orderBy(desc(schema.legalNotices.id))

  const notices: NoticeRow[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    ackType: r.ackType,
    version: r.version,
    updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notices</h1>
        <p className="text-muted-foreground mt-1">
          Reusable notices and waivers. Editing the body bumps the version; players acknowledge a specific version.
        </p>
      </div>
      <NoticesClient initial={notices} />
    </div>
  )
}
