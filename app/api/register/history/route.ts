import { NextResponse } from "next/server"
import { db, schema } from "@/lib/db"
import { eq, desc, and, ne } from "drizzle-orm"
import { auth } from "@/auth"

/**
 * GET /api/register/history — return the user's prior PAID registrations,
 * lightest fields needed to populate "copy previous" picker.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as { id?: string }).id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await db
    .select({
      id: schema.registrations.id,
      periodId: schema.registrations.periodId,
      seasonId: schema.registrationPeriods.seasonId,
      seasonName: schema.seasons.name,
      paidAt: schema.registrations.paidAt,

      // Snapshot fields useful for copying
      phone: schema.registrations.phone,
      address: schema.registrations.address,
      birthdate: schema.registrations.birthdate,
      gender: schema.registrations.gender,
      tshirtSize: schema.registrations.tshirtSize,
      emergencyName: schema.registrations.emergencyName,
      emergencyPhone: schema.registrations.emergencyPhone,
      healthPlan: schema.registrations.healthPlan,
      healthPlanId: schema.registrations.healthPlanId,
      doctorName: schema.registrations.doctorName,
      doctorPhone: schema.registrations.doctorPhone,
      medicalNotes: schema.registrations.medicalNotes,
      yearsPlayed: schema.registrations.yearsPlayed,
      skillLevel: schema.registrations.skillLevel,
      positions: schema.registrations.positions,
      lastLeague: schema.registrations.lastLeague,
      lastTeam: schema.registrations.lastTeam,
    })
    .from(schema.registrations)
    .innerJoin(schema.registrationPeriods, eq(schema.registrations.periodId, schema.registrationPeriods.id))
    .innerJoin(schema.seasons, eq(schema.registrationPeriods.seasonId, schema.seasons.id))
    .where(
      and(
        eq(schema.registrations.userId, userId),
        eq(schema.registrations.status, "paid"),
        ne(schema.registrations.status, "draft")
      )
    )
    .orderBy(desc(schema.registrations.paidAt))

  return NextResponse.json({ history: rows })
}

export const runtime = "nodejs"
