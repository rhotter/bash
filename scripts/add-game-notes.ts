import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  await sql`ALTER TABLE games ADD COLUMN IF NOT EXISTS notes TEXT`
  console.log("Added notes column to games table")
}

main().catch(console.error)
