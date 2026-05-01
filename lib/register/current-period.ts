import { db, schema } from "@/lib/db"
import { and, eq, isNull, lt, or, gte, desc } from "drizzle-orm"

/**
 * Resolve the currently-open registration period, if any. Treats `status='open'`
 * as the gate, ignores `dateOpen`/`dateClose` if status was set manually.
 */
export async function getCurrentRegistrationPeriod() {
  const now = new Date()

  const [open] = await db
    .select({
      id: schema.registrationPeriods.id,
      seasonId: schema.registrationPeriods.seasonId,
      seasonName: schema.seasons.name,
      seasonType: schema.seasons.seasonType,
      status: schema.registrationPeriods.status,
      baseFee: schema.registrationPeriods.baseFee,
      dateOpen: schema.registrationPeriods.dateOpen,
      dateClose: schema.registrationPeriods.dateClose,
      maxPlayers: schema.registrationPeriods.maxPlayers,
      requiresEmergencyInfo: schema.registrationPeriods.requiresEmergencyInfo,
      requiresJerseySize: schema.registrationPeriods.requiresJerseySize,
      ageMinimum: schema.registrationPeriods.ageMinimum,
      ageAsOfDate: schema.registrationPeriods.ageAsOfDate,
    })
    .from(schema.registrationPeriods)
    .innerJoin(schema.seasons, eq(schema.registrationPeriods.seasonId, schema.seasons.id))
    .where(
      and(
        eq(schema.registrationPeriods.status, "open"),
        or(
          isNull(schema.registrationPeriods.dateOpen),
          lt(schema.registrationPeriods.dateOpen, now)
        ),
        or(
          isNull(schema.registrationPeriods.dateClose),
          gte(schema.registrationPeriods.dateClose, now)
        )
      )
    )
    .orderBy(desc(schema.registrationPeriods.createdAt))
    .limit(1)

  return open ?? null
}
