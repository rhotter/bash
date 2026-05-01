"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, ChevronRight, ChevronLeft, AlertCircle, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"

export interface FunnelData {
  period: {
    id: string
    seasonId: string
    seasonName: string
    seasonType: string
    status: string
    baseFee: number
    maxPlayers: number | null
    ageMinimum: number | null
    ageAsOfDate: string | null
    requiresEmergencyInfo: boolean
    requiresJerseySize: boolean
  }
  user: {
    id: string
    email: string
    name: string | null
    hasLinkedPlayer: boolean
  }
  flow: "returning" | "new"
  derivedRookie: boolean
  questions: { id: number; questionText: string; questionType: string; isRequired: boolean }[]
  notices: { id: number; title: string; body: string; ackType: string; version: number }[]
  extras: {
    id: number
    name: string
    description: string | null
    price: number
    detailType: string | null
    detailLabel: string | null
    active: boolean
  }[]
  draft: null | {
    id: string
    status: string
    phone: string | null
    address: string | null
    birthdate: string | null
    gender: string | null
    tshirtSize: string | null
    emergencyName: string | null
    emergencyPhone: string | null
    healthPlan: string | null
    healthPlanId: string | null
    doctorName: string | null
    doctorPhone: string | null
    medicalNotes: string | null
    yearsPlayed: number | null
    skillLevel: string | null
    positions: string | null
    lastLeague: string | null
    lastTeam: string | null
    miscNotes: string | null
  }
  canceled: boolean
}

interface FormState {
  phone: string
  address: string
  birthdate: string // YYYY-MM-DD
  gender: string
  tshirtSize: string
  emergencyName: string
  emergencyPhone: string
  healthPlan: string
  healthPlanId: string
  doctorName: string
  doctorPhone: string
  medicalNotes: string
  yearsPlayed: string
  skillLevel: string
  positions: string
  lastLeague: string
  lastTeam: string
  miscNotes: string
}

function emptyForm(d: FunnelData): FormState {
  const draft = d.draft
  return {
    phone: draft?.phone ?? "",
    address: draft?.address ?? "",
    birthdate: draft?.birthdate ?? "",
    gender: draft?.gender ?? "",
    tshirtSize: draft?.tshirtSize ?? "",
    emergencyName: draft?.emergencyName ?? "",
    emergencyPhone: draft?.emergencyPhone ?? "",
    healthPlan: draft?.healthPlan ?? "",
    healthPlanId: draft?.healthPlanId ?? "",
    doctorName: draft?.doctorName ?? "",
    doctorPhone: draft?.doctorPhone ?? "",
    medicalNotes: draft?.medicalNotes ?? "",
    yearsPlayed: draft?.yearsPlayed?.toString() ?? "",
    skillLevel: draft?.skillLevel ?? "",
    positions: draft?.positions ?? "",
    lastLeague: draft?.lastLeague ?? "",
    lastTeam: draft?.lastTeam ?? "",
    miscNotes: draft?.miscNotes ?? "",
  }
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function calculateAge(birthdate: string, asOf: string | null): number | null {
  if (!birthdate) return null
  const birth = new Date(birthdate)
  const ref = asOf ? new Date(asOf) : new Date()
  if (Number.isNaN(birth.getTime())) return null
  let age = ref.getFullYear() - birth.getFullYear()
  const m = ref.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--
  return age
}

export function RegistrationFunnel({ data }: { data: FunnelData }) {
  const router = useRouter()
  const isReturning = data.flow === "returning"

  type StepKey =
    | "copy-or-confirm"
    | "confirm-update"
    | "gating"
    | "contact"
    | "personal"
    | "emergency"
    | "experience"
    | "waivers"
    | "review"

  const steps = useMemo<StepKey[]>(() => {
    if (isReturning) {
      return ["copy-or-confirm", "confirm-update", "waivers", "review"]
    }
    const out: StepKey[] = ["gating", "contact", "personal"]
    if (data.period.requiresEmergencyInfo) out.push("emergency")
    out.push("experience", "waivers", "review")
    return out
  }, [isReturning, data.period.requiresEmergencyInfo])

  const [step, setStep] = useState<StepKey>(steps[0])
  const stepIndex = steps.indexOf(step)
  const totalSteps = steps.length

  const [form, setForm] = useState<FormState>(emptyForm(data))
  const [acks, setAcks] = useState<Set<number>>(new Set())
  const [extraIds, setExtraIds] = useState<Set<number>>(new Set())
  const [extraDetails, setExtraDetails] = useState<Record<number, string>>({})
  const [discountCode, setDiscountCode] = useState<string>("")
  const [feeBreakdown, setFeeBreakdown] = useState<{
    baseFeeCents: number
    extrasCents: number
    discountCents: number
    totalCents: number
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pendingValidate, setPendingValidate] = useState(false)
  const [discountError, setDiscountError] = useState<string | null>(null)
  const [history, setHistory] = useState<RegHistoryItem[]>([])
  const [selfReportedRookie, setSelfReportedRookie] = useState<boolean | null>(null)
  const [questionAnswers, setQuestionAnswers] = useState<Record<number, string>>({})

  // Initial fee = base fee
  useEffect(() => {
    setFeeBreakdown({
      baseFeeCents: data.period.baseFee,
      extrasCents: 0,
      discountCents: 0,
      totalCents: data.period.baseFee,
    })
  }, [data.period.baseFee])

  // Recompute extras cents whenever selection changes
  useEffect(() => {
    const extrasCents = [...extraIds].reduce((sum, id) => {
      const e = data.extras.find((x) => x.id === id)
      return sum + (e?.price ?? 0)
    }, 0)
    setFeeBreakdown((prev) => ({
      baseFeeCents: data.period.baseFee,
      extrasCents,
      discountCents: prev?.discountCents ?? 0,
      totalCents: Math.max(0, data.period.baseFee + extrasCents - (prev?.discountCents ?? 0)),
    }))
  }, [extraIds, data.extras, data.period.baseFee])

  // Load history if returning flow
  useEffect(() => {
    if (!isReturning) return
    fetch("/api/register/history")
      .then((r) => r.json())
      .then((d) => setHistory(d.history ?? []))
      .catch(() => {})
  }, [isReturning])

  // Auto-save form to draft on blur (debounced via patch on each step transition)
  const saveDraft = useCallback(
    async (overrides: Partial<FormState> = {}) => {
      const payload = { ...form, ...overrides }
      const body: Record<string, unknown> = { ...payload }
      // Coerce numeric
      if (typeof body.yearsPlayed === "string") {
        body.yearsPlayed = body.yearsPlayed ? Number.parseInt(body.yearsPlayed as string, 10) : null
      }
      // Strip empty strings into nulls
      for (const k of Object.keys(body)) {
        if (body[k] === "") body[k] = null
      }
      try {
        await fetch(`/api/register/${data.period.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      } catch {
        // best-effort
      }
    },
    [form, data.period.id]
  )

  const next = async () => {
    await saveDraft()
    const i = steps.indexOf(step)
    if (i < steps.length - 1) setStep(steps[i + 1])
  }

  const back = () => {
    const i = steps.indexOf(step)
    if (i > 0) setStep(steps[i - 1])
  }

  const validateDiscount = async () => {
    const code = discountCode.trim()
    if (!code) {
      setDiscountError(null)
      setFeeBreakdown((prev) => ({
        baseFeeCents: data.period.baseFee,
        extrasCents: prev?.extrasCents ?? 0,
        discountCents: 0,
        totalCents: Math.max(0, data.period.baseFee + (prev?.extrasCents ?? 0)),
      }))
      return
    }
    setPendingValidate(true)
    setDiscountError(null)
    try {
      const res = await fetch(`/api/register/${data.period.id}/validate-discount`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, selectedExtraIds: [...extraIds] }),
      })
      const d = await res.json()
      if (!res.ok) {
        setDiscountError(d.error || "Invalid code")
        return
      }
      setFeeBreakdown(d.fee)
      toast.success("Code applied")
    } catch {
      setDiscountError("Failed to validate")
    } finally {
      setPendingValidate(false)
    }
  }

  const submit = async () => {
    // Client-side ack check for required notices
    for (const n of data.notices) {
      if (!acks.has(n.id)) {
        toast.error("Please acknowledge all notices before submitting.")
        setStep("waivers" as StepKey)
        return
      }
    }
    setSubmitting(true)
    try {
      // Save final draft state
      await saveDraft()
      const res = await fetch(`/api/register/${data.period.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedExtraIds: [...extraIds],
          extraDetails,
          noticeAcks: [...acks],
          discountCode: discountCode.trim() || undefined,
          selfReportedRookie: selfReportedRookie === true,
        }),
      })
      const d = await res.json()
      if (!res.ok) {
        toast.error(d.error || "Submit failed")
        return
      }
      router.push(d.redirect)
    } catch {
      toast.error("Submit failed. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const applyHistory = (h: RegHistoryItem) => {
    setForm({
      phone: h.phone ?? "",
      address: h.address ?? "",
      birthdate: h.birthdate ?? "",
      gender: h.gender ?? "",
      tshirtSize: h.tshirtSize ?? "",
      emergencyName: h.emergencyName ?? "",
      emergencyPhone: h.emergencyPhone ?? "",
      healthPlan: h.healthPlan ?? "",
      healthPlanId: h.healthPlanId ?? "",
      doctorName: h.doctorName ?? "",
      doctorPhone: h.doctorPhone ?? "",
      medicalNotes: h.medicalNotes ?? "",
      yearsPlayed: h.yearsPlayed?.toString() ?? "",
      skillLevel: h.skillLevel ?? "",
      positions: h.positions ?? "",
      lastLeague: h.lastLeague ?? "",
      lastTeam: h.lastTeam ?? "",
      miscNotes: "",
    })
    toast.success(`Pre-filled from ${h.seasonName}.`)
  }

  // Age gating check
  const ageOk = (() => {
    if (!data.period.ageMinimum) return true
    const age = calculateAge(form.birthdate, data.period.ageAsOfDate)
    if (age === null) return null // unknown until they fill
    return age >= data.period.ageMinimum
  })()

  // Validation per step
  const canAdvance = (() => {
    switch (step) {
      case "gating":
        return form.birthdate.length === 10 && ageOk === true && selfReportedRookie !== null
      case "contact":
        return !!form.phone && !!form.address
      case "personal":
        if (data.period.requiresJerseySize && !form.tshirtSize) return false
        return !!form.gender
      case "emergency":
        return !!form.emergencyName && !!form.emergencyPhone
      case "experience":
        return form.yearsPlayed !== "" && !!form.skillLevel
      case "waivers":
        return data.notices.every((n) => acks.has(n.id))
      case "copy-or-confirm":
        return true
      case "confirm-update":
        return !!form.phone && !!form.address && (!data.period.requiresJerseySize || !!form.tshirtSize)
      case "review":
        return true
    }
    return true
  })()

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Register: {data.period.seasonName}</h1>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          {isReturning ? (
            <>Welcome back. We&apos;ll pre-fill what we can — just confirm and pay.</>
          ) : (
            <>Fee: <span className="font-medium">{formatCents(data.period.baseFee)}</span> · Step {stepIndex + 1} of {totalSteps}</>
          )}
        </p>
        <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-1 bg-primary transition-all"
            style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {data.canceled && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Payment was canceled. Your form is saved — you can resume from where you left off.
          </AlertDescription>
        </Alert>
      )}

      {/* New player flow steps */}
      {step === "gating" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick check</CardTitle>
            <CardDescription>Birthdate and rookie status. We use these to confirm eligibility.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bd">Date of birth</Label>
              <Input
                id="bd"
                type="date"
                value={form.birthdate}
                onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
              />
              {ageOk === false && (
                <p className="text-xs text-destructive">
                  You must be at least {data.period.ageMinimum} as of{" "}
                  {data.period.ageAsOfDate
                    ? new Date(data.period.ageAsOfDate).toLocaleDateString()
                    : "now"}
                  .
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Are you a BASH rookie?</Label>
              <Select
                value={selfReportedRookie === null ? "" : selfReportedRookie ? "yes" : "no"}
                onValueChange={(v) => setSelfReportedRookie(v === "yes")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No, I&apos;ve played BASH before</SelectItem>
                  <SelectItem value="yes">Yes, I&apos;m new to BASH</SelectItem>
                </SelectContent>
              </Select>
              {selfReportedRookie === true && (
                <p className="text-xs text-muted-foreground">
                  Rookies aren&apos;t guaranteed a roster spot until the draft. You&apos;ll have a chance to defer payment at the end.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === "contact" && <ContactCard form={form} setForm={setForm} questions={data.questions} answers={questionAnswers} setAnswers={setQuestionAnswers} />}
      {step === "personal" && <PersonalCard form={form} setForm={setForm} requiresJerseySize={data.period.requiresJerseySize} />}
      {step === "emergency" && <EmergencyCard form={form} setForm={setForm} />}
      {step === "experience" && <ExperienceCard form={form} setForm={setForm} />}

      {/* Returning flow steps */}
      {step === "copy-or-confirm" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Welcome back, {data.user.name || data.user.email}</CardTitle>
            <CardDescription>Pick a past registration to pre-fill from, or start blank.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No prior registrations on file.</p>
            ) : (
              history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => applyHistory(h)}
                  className="w-full flex items-center justify-between rounded-md border px-3 py-2 hover:bg-muted/50 text-left"
                >
                  <div>
                    <div className="text-sm font-medium">{h.seasonName}</div>
                    <div className="text-xs text-muted-foreground">
                      {h.paidAt ? new Date(h.paidAt).toLocaleDateString() : ""} · {h.lastTeam ?? "—"}
                    </div>
                  </div>
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                </button>
              ))
            )}
          </CardContent>
        </Card>
      )}
      {step === "confirm-update" && (
        <ReturningConfirmCard
          form={form}
          setForm={setForm}
          requiresJerseySize={data.period.requiresJerseySize}
          requiresEmergencyInfo={data.period.requiresEmergencyInfo}
          questions={data.questions}
          answers={questionAnswers}
          setAnswers={setQuestionAnswers}
        />
      )}

      {/* Common steps */}
      {step === "waivers" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notices & waivers</CardTitle>
            <CardDescription>Read each one and acknowledge to continue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.notices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notices configured for this period.</p>
            ) : (
              data.notices.map((n) => (
                <div key={n.id} className="space-y-2 rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm">{n.title}</h3>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        n.ackType === "legal"
                          ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
                          : "text-muted-foreground"
                      }`}
                    >
                      {n.ackType}
                    </Badge>
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-md bg-muted/40 p-3 text-xs whitespace-pre-wrap font-mono">
                    {n.body}
                  </div>
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={acks.has(n.id)}
                      onCheckedChange={(c) => {
                        const next = new Set(acks)
                        if (c) next.add(n.id)
                        else next.delete(n.id)
                        setAcks(next)
                      }}
                    />
                    <span>
                      {n.ackType === "legal"
                        ? "I have read this notice and agree to be legally bound by it."
                        : "I have read this notice."}
                    </span>
                  </label>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {step === "review" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review & pay</CardTitle>
            <CardDescription>One last look before checkout.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Extras */}
            {data.extras.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Extras</Label>
                {data.extras.map((e) => (
                  <div key={e.id} className="rounded-md border px-3 py-2 space-y-1.5">
                    <label className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Checkbox
                          checked={extraIds.has(e.id)}
                          onCheckedChange={(c) => {
                            const next = new Set(extraIds)
                            if (c) next.add(e.id)
                            else next.delete(e.id)
                            setExtraIds(next)
                          }}
                        />
                        <span>{e.name}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {e.price > 0 ? formatCents(e.price) : "Free"}
                      </span>
                    </label>
                    {e.description && (
                      <p className="text-xs text-muted-foreground pl-6">{e.description}</p>
                    )}
                    {extraIds.has(e.id) && e.detailType === "text" && (
                      <Input
                        className="ml-6 mt-1"
                        placeholder={e.detailLabel ?? "Detail"}
                        value={extraDetails[e.id] ?? ""}
                        onChange={(ev) => setExtraDetails({ ...extraDetails, [e.id]: ev.target.value })}
                      />
                    )}
                    {extraIds.has(e.id) && e.detailType === "size_dropdown" && (
                      <Select
                        value={extraDetails[e.id] ?? ""}
                        onValueChange={(v) => setExtraDetails({ ...extraDetails, [e.id]: v })}
                      >
                        <SelectTrigger className="ml-6 mt-1 w-32">
                          <SelectValue placeholder="Size" />
                        </SelectTrigger>
                        <SelectContent>
                          {["S", "M", "L", "XL", "XXL"].map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Discount */}
            <div className="space-y-1.5">
              <Label htmlFor="discount" className="text-xs uppercase tracking-wider text-muted-foreground">
                Discount code
              </Label>
              <div className="flex gap-2">
                <Input
                  id="discount"
                  placeholder="Optional"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                />
                <Button variant="outline" onClick={validateDiscount} disabled={pendingValidate}>
                  {pendingValidate && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  Apply
                </Button>
              </div>
              {discountError && <p className="text-xs text-destructive">{discountError}</p>}
            </div>

            {/* Cost summary */}
            <div className="rounded-md border p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base fee</span>
                <span>{formatCents(feeBreakdown?.baseFeeCents ?? data.period.baseFee)}</span>
              </div>
              {(feeBreakdown?.extrasCents ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Extras</span>
                  <span>+ {formatCents(feeBreakdown?.extrasCents ?? 0)}</span>
                </div>
              )}
              {(feeBreakdown?.discountCents ?? 0) > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Discount</span>
                  <span>− {formatCents(feeBreakdown?.discountCents ?? 0)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1.5 mt-1.5 font-medium">
                <span>Total</span>
                <span>{formatCents(feeBreakdown?.totalCents ?? data.period.baseFee)}</span>
              </div>
            </div>

            {selfReportedRookie && (feeBreakdown?.totalCents ?? 0) > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Rookies can defer payment until after the draft. Ask an admin for the rookie discount code if you want to register without paying now.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        {stepIndex > 0 ? (
          <Button variant="ghost" onClick={back}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        ) : (
          <Button asChild variant="ghost">
            <Link href="/account">Cancel</Link>
          </Button>
        )}
        {step === "review" ? (
          <Button onClick={submit} disabled={submitting || !canAdvance}>
            {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {(feeBreakdown?.totalCents ?? data.period.baseFee) === 0 ? "Complete registration" : "Continue to payment"}
          </Button>
        ) : (
          <Button onClick={next} disabled={!canAdvance}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}

interface RegHistoryItem {
  id: string
  periodId: string
  seasonId: string
  seasonName: string
  paidAt: string | null
  phone: string | null
  address: string | null
  birthdate: string | null
  gender: string | null
  tshirtSize: string | null
  emergencyName: string | null
  emergencyPhone: string | null
  healthPlan: string | null
  healthPlanId: string | null
  doctorName: string | null
  doctorPhone: string | null
  medicalNotes: string | null
  yearsPlayed: number | null
  skillLevel: string | null
  positions: string | null
  lastLeague: string | null
  lastTeam: string | null
}

// ─── Step subcomponents ─────────────────────────────────────────────────────

function ContactCard({
  form,
  setForm,
  questions,
  answers,
  setAnswers,
}: {
  form: FormState
  setForm: (v: FormState) => void
  questions: { id: number; questionText: string; isRequired: boolean }[]
  answers: Record<number, string>
  setAnswers: (v: Record<number, string>) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Contact info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
        </div>
        {questions.length > 0 && (
          <>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">General notes</Label>
            {questions.map((q) => (
              <div key={q.id} className="space-y-1.5">
                <Label className="text-sm">
                  {q.questionText}
                  {q.isRequired && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Input
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                />
              </div>
            ))}
          </>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="misc">Anything we should know? <span className="text-muted-foreground">(optional)</span></Label>
          <Textarea id="misc" value={form.miscNotes} onChange={(e) => setForm({ ...form, miscNotes: e.target.value })} rows={2} />
        </div>
      </CardContent>
    </Card>
  )
}

function PersonalCard({
  form,
  setForm,
  requiresJerseySize,
}: {
  form: FormState
  setForm: (v: FormState) => void
  requiresJerseySize: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Personal</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Gender</Label>
          <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Choose…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="non-binary">Non-binary</SelectItem>
              <SelectItem value="prefer-not">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {requiresJerseySize && (
          <div className="space-y-1.5">
            <Label>T-shirt size</Label>
            <Select value={form.tshirtSize} onValueChange={(v) => setForm({ ...form, tshirtSize: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Size" />
              </SelectTrigger>
              <SelectContent>
                {["S", "M", "L", "XL", "XXL"].map((s) => (
                  <SelectItem key={s} value={s}>Adult {s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EmergencyCard({ form, setForm }: { form: FormState; setForm: (v: FormState) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Emergency & medical</CardTitle>
        <CardDescription>Used only in actual emergencies. Stored privately.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Emergency contact name</Label>
            <Input value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Emergency contact phone</Label>
            <Input type="tel" value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Health plan</Label>
            <Input value={form.healthPlan} onChange={(e) => setForm({ ...form, healthPlan: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Health plan ID</Label>
            <Input value={form.healthPlanId} onChange={(e) => setForm({ ...form, healthPlanId: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Doctor name <span className="text-muted-foreground">(optional)</span></Label>
            <Input value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Doctor phone <span className="text-muted-foreground">(optional)</span></Label>
            <Input type="tel" value={form.doctorPhone} onChange={(e) => setForm({ ...form, doctorPhone: e.target.value })} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Medical notes <span className="text-muted-foreground">(allergies, conditions)</span></Label>
          <Textarea rows={3} value={form.medicalNotes} onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })} />
        </div>
      </CardContent>
    </Card>
  )
}

function ExperienceCard({ form, setForm }: { form: FormState; setForm: (v: FormState) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Experience</CardTitle>
        <CardDescription>Helps with draft balancing.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Years played</Label>
          <Input type="number" min={0} value={form.yearsPlayed} onChange={(e) => setForm({ ...form, yearsPlayed: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Skill level</Label>
          <Select value={form.skillLevel} onValueChange={(v) => setForm({ ...form, skillLevel: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Choose…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label>Position(s) <span className="text-muted-foreground">(e.g. C, RW, D)</span></Label>
          <Input value={form.positions} onChange={(e) => setForm({ ...form, positions: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Last league</Label>
          <Input value={form.lastLeague} onChange={(e) => setForm({ ...form, lastLeague: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Last team</Label>
          <Input value={form.lastTeam} onChange={(e) => setForm({ ...form, lastTeam: e.target.value })} />
        </div>
      </CardContent>
    </Card>
  )
}

function ReturningConfirmCard({
  form,
  setForm,
  requiresJerseySize,
  requiresEmergencyInfo,
  questions,
  answers,
  setAnswers,
}: {
  form: FormState
  setForm: (v: FormState) => void
  requiresJerseySize: boolean
  requiresEmergencyInfo: boolean
  questions: { id: number; questionText: string; isRequired: boolean }[]
  answers: Record<number, string>
  setAnswers: (v: Record<number, string>) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Confirm your details</CardTitle>
        <CardDescription>Edit anything that&apos;s changed since last time.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          {requiresJerseySize && (
            <div className="space-y-1.5">
              <Label>T-shirt size</Label>
              <Select value={form.tshirtSize} onValueChange={(v) => setForm({ ...form, tshirtSize: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  {["S", "M", "L", "XL", "XXL"].map((s) => (
                    <SelectItem key={s} value={s}>Adult {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {requiresEmergencyInfo && (
          <>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Emergency & medical</Label>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Emergency name" value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} />
              <Input placeholder="Emergency phone" type="tel" value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} />
              <Input placeholder="Health plan" value={form.healthPlan} onChange={(e) => setForm({ ...form, healthPlan: e.target.value })} />
              <Input placeholder="Health plan ID" value={form.healthPlanId} onChange={(e) => setForm({ ...form, healthPlanId: e.target.value })} />
            </div>
            <Textarea placeholder="Medical notes" rows={2} value={form.medicalNotes} onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })} />
          </>
        )}
        {questions.length > 0 && (
          <>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">For this season</Label>
            {questions.map((q) => (
              <div key={q.id} className="space-y-1.5">
                <Label className="text-sm">
                  {q.questionText}
                  {q.isRequired && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Input value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  )
}
