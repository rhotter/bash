import { db, schema } from "@/lib/db"
import { and, eq, lt } from "drizzle-orm"

/**
 * Whether this user is a rookie at this season.
 *
 * Source-of-truth definition: a user is a rookie if they have NO prior
 * `paid` registration AND their linked player (if any) has no prior fall
 * `player_seasons` row before this season.
 *
 * This mirrors the same inference used by /admin/seasons/[id]/page.tsx
 * for roster display.
 */
export async function deriveRookieForUser(userId: string, seasonId: string): Promise<boolean> {
  // Has the user previously paid for any registration period whose season
  // came before this one (lex-sortable IDs)?
  const priorRegs = await db
    .select({ id: schema.registrations.id })
    .from(schema.registrations)
    .innerJoin(
      schema.registrationPeriods,
      eq(schema.registrations.periodId, schema.registrationPeriods.id)
    )
    .where(
      and(
        eq(schema.registrations.userId, userId),
        eq(schema.registrations.status, "paid"),
        lt(schema.registrationPeriods.seasonId, seasonId)
      )
    )
    .limit(1)
  if (priorRegs.length > 0) return false

  // Are they linked to a player who already has prior fall participation?
  const [user] = await db
    .select({ playerId: schema.users.playerId })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1)
  if (user?.playerId) {
    const priorFall = await db
      .select({ id: schema.playerSeasons.seasonId })
      .from(schema.playerSeasons)
      .innerJoin(schema.seasons, eq(schema.playerSeasons.seasonId, schema.seasons.id))
      .where(
        and(
          eq(schema.playerSeasons.playerId, user.playerId),
          eq(schema.seasons.seasonType, "fall"),
          lt(schema.playerSeasons.seasonId, seasonId)
        )
      )
      .limit(1)
    if (priorFall.length > 0) return false
  }

  return true
}
