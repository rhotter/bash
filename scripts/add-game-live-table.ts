import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log("Creating game_live table...")

  await sql`
    CREATE TABLE IF NOT EXISTS game_live (
      game_id TEXT PRIMARY KEY REFERENCES games(id),
      state JSONB NOT NULL DEFAULT '{}',
      pin_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_game_live_updated ON game_live(updated_at)
  `

  console.log("game_live table created successfully.")
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
