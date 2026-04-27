import { NextResponse } from "next/server"
import { db, schema } from "@/lib/db"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/admin-session"

export async function GET() {
  const isAuthenticated = await getSession()
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [row] = await db
    .select()
    .from(schema.syncMetadata)
    .where(eq(schema.syncMetadata.key, "last_sync"))
    .limit(1)

  return NextResponse.json({ lastSync: row?.value ?? null })
}
