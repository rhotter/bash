import { redirect, notFound } from "next/navigation"
import { db, schema } from "@/lib/db"
import { and, eq, inArray } from "drizzle-orm"
import { auth } from "@/auth"
import { RegistrationFunnel, type FunnelData } from "@/components/register/registration-funnel"
import { deriveRookieForUser } from "@/lib/register/derive-rookie"

export const metadata = { title: "Register | BASH" }
export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ periodId: string }>
  searchParams: Promise<{ canceled?: string }>
}

export default async function RegisterFunnelPage({ params, searchParams }: PageProps) {
  const { periodId } = await params
  const sp = await searchParams

  const session = await auth()
  if (!session?.user) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/register/${periodId}`)}`)
  }
  const userId = (session.user as { id?: string }).id ?? ""

  // Load period + season + assignments + library entries needed for the funnel
  const [periodRow] = await db
    .select({
      id: schema.registrationPeriods.id,
      seasonId: schema.registrationPeriods.seasonId,
      seasonName: schema.seasons.name,
      seasonType: schema.seasons.seasonType,
      status: schema.registrationPeriods.status,
      baseFee: schema.registrationPeriods.baseFee,
      maxPlayers: schema.registrationPeriods.maxPlayers,
      ageMinimum: schema.registrationPeriods.ageMinimum,
      ageAsOfDate: schema.registrationPeriods.ageAsOfDate,
      requiresEmergencyInfo: schema.registrationPeriods.requiresEmergencyInfo,
      requiresJerseySize: schema.registrationPeriods.requiresJerseySize,
    })
    .from(schema.registrationPeriods)
    .innerJoin(schema.seasons, eq(schema.registrationPeriods.seasonId, schema.seasons.id))
    .where(eq(schema.registrationPeriods.id, periodId))
    .limit(1)

  if (!periodRow) notFound()

  const [questions, noticeJoin, extraJoin, draft, [user], history] = await Promise.all([
    db.select().from(schema.registrationQuestions).where(eq(schema.registrationQuestions.periodId, periodId)),
    db.select({ noticeId: schema.registrationPeriodNotices.noticeId, sortOrder: schema.registrationPeriodNotices.sortOrder })
      .from(schema.registrationPeriodNotices)
      .where(eq(schema.registrationPeriodNotices.periodId, periodId)),
    db.select({ extraId: schema.registrationPeriodExtras.extraId, sortOrder: schema.registrationPeriodExtras.sortOrder })
      .from(schema.registrationPeriodExtras)
      .where(eq(schema.registrationPeriodExtras.periodId, periodId)),
    db.select().from(schema.registrations)
      .where(and(eq(schema.registrations.userId, userId), eq(schema.registrations.periodId, periodId)))
      .limit(1)
      .then(r => r[0]),
    db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1),
    db.select({
      id: schema.registrations.id,
      seasonName: schema.seasons.name,
      paidAt: schema.registrations.paidAt,
    }).from(schema.registrations)
      .innerJoin(schema.registrationPeriods, eq(schema.registrations.periodId, schema.registrationPeriods.id))
      .innerJoin(schema.seasons, eq(schema.registrationPeriods.seasonId, schema.seasons.id))
      .where(and(eq(schema.registrations.userId, userId), eq(schema.registrations.status, "paid"))),
  ])

  const noticeIds = noticeJoin.sort((a, b) => a.sortOrder - b.sortOrder).map((n) => n.noticeId)
  const extraIds = extraJoin.sort((a, b) => a.sortOrder - b.sortOrder).map((e) => e.extraId)

  const noticesArr = noticeIds.length
    ? await db.select().from(schema.legalNotices).where(inArray(schema.legalNotices.id, noticeIds))
    : []
  const extrasArr = extraIds.length
    ? await db.select().from(schema.extras).where(inArray(schema.extras.id, extraIds))
    : []

  // Determine flow: returning if user has any prior paid registration
  const isReturning = history.length > 0
  const isRookie = await deriveRookieForUser(userId, periodRow.seasonId)

  // Sort notices/extras to match assignment order
  const noticesSorted = noticeIds.map((id) => noticesArr.find((n) => n.id === id)).filter(Boolean) as typeof noticesArr
  const extrasSorted = extraIds.map((id) => extrasArr.find((e) => e.id === id)).filter(Boolean) as typeof extrasArr

  const data: FunnelData = {
    period: {
      id: periodRow.id,
      seasonId: periodRow.seasonId,
      seasonName: periodRow.seasonName,
      seasonType: periodRow.seasonType,
      status: periodRow.status,
      baseFee: periodRow.baseFee,
      maxPlayers: periodRow.maxPlayers,
      ageMinimum: periodRow.ageMinimum,
      ageAsOfDate: periodRow.ageAsOfDate,
      requiresEmergencyInfo: periodRow.requiresEmergencyInfo,
      requiresJerseySize: periodRow.requiresJerseySize,
    },
    user: {
      id: userId,
      email: user?.email ?? "",
      name: user?.name ?? null,
      hasLinkedPlayer: !!user?.playerId,
    },
    flow: isReturning ? "returning" : "new",
    derivedRookie: isRookie,
    questions: questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      isRequired: q.isRequired,
    })),
    notices: noticesSorted.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      ackType: n.ackType,
      version: n.version,
    })),
    extras: extrasSorted.map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      price: e.price,
      detailType: e.detailType,
      detailLabel: e.detailLabel,
      active: e.active,
    })),
    draft: draft
      ? {
          id: draft.id,
          status: draft.status,
          phone: draft.phone,
          address: draft.address,
          birthdate: draft.birthdate,
          gender: draft.gender,
          tshirtSize: draft.tshirtSize,
          emergencyName: draft.emergencyName,
          emergencyPhone: draft.emergencyPhone,
          healthPlan: draft.healthPlan,
          healthPlanId: draft.healthPlanId,
          doctorName: draft.doctorName,
          doctorPhone: draft.doctorPhone,
          medicalNotes: draft.medicalNotes,
          yearsPlayed: draft.yearsPlayed,
          skillLevel: draft.skillLevel,
          positions: draft.positions,
          lastLeague: draft.lastLeague,
          lastTeam: draft.lastTeam,
          miscNotes: draft.miscNotes,
        }
      : null,
    canceled: sp.canceled === "1",
  }

  return <RegistrationFunnel data={data} />
}
