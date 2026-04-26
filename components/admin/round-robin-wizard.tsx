"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Calendar, Loader2 } from "lucide-react"
import {
  generateRoundRobin,
  type RoundRobinSlot,
  type GeneratedGame,
} from "@/lib/schedule-utils"

interface RoundRobinWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teams: { teamSlug: string; teamName: string }[]
  seasonId: string
  defaultLocation: string
  onSaved: () => void
}

interface WeekSlot {
  date: string
  time: string
  location: string
}

type GameTypeOption = "regular" | "practice" | "exhibition"

export function RoundRobinWizard({
  open,
  onOpenChange,
  teams,
  seasonId,
  defaultLocation,
  onSaved,
}: RoundRobinWizardProps) {
  const [step, setStep] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)

  // Step 1: Parameters
  const [gamesPerWeek, setGamesPerWeek] = useState(Math.floor(teams.length / 2))
  const [cycles, setCycles] = useState(2)

  // Step 2: Start date
  const [startDate, setStartDate] = useState("")

  // Step 3: Skip weeks (set of week numbers to skip)
  const [skippedWeeks, setSkippedWeeks] = useState<Set<number>>(new Set())

  // Step 4: Per-slot times & locations
  const [weekSlots, setWeekSlots] = useState<Record<number, WeekSlot[]>>({})

  // Step 5: Per-week game types
  const [weekGameTypes, setWeekGameTypes] = useState<Record<number, GameTypeOption>>({})

  // Step 6: Save mode
  const [saveMode, setSaveMode] = useState<"overwrite" | "append">("append")

  // ─── Derived data ─────────────────────────────────────────────────────────

  const slots = useMemo(
    () => generateRoundRobin(teams.length, gamesPerWeek, cycles),
    [teams.length, gamesPerWeek, cycles]
  )

  // Group slots by week/round
  const slotsByWeek = useMemo(() => {
    const grouped: Record<number, RoundRobinSlot[]> = {}
    for (const s of slots) {
      if (!grouped[s.round]) grouped[s.round] = []
      grouped[s.round].push(s)
    }
    return grouped
  }, [slots])

  const weekNumbers = useMemo(
    () => Object.keys(slotsByWeek).map(Number).sort((a, b) => a - b),
    [slotsByWeek]
  )

  // Active weeks (not skipped)
  const activeWeeks = useMemo(
    () => weekNumbers.filter((w) => !skippedWeeks.has(w)),
    [weekNumbers, skippedWeeks]
  )

  // Calculate dates for active weeks (one week apart from startDate, skipping gaps)
  const weekDates = useMemo(() => {
    if (!startDate) return {}
    const result: Record<number, string> = {}
    const base = new Date(startDate + "T00:00:00")
    let weekOffset = 0
    for (const week of weekNumbers) {
      if (skippedWeeks.has(week)) continue
      const d = new Date(base)
      d.setDate(d.getDate() + weekOffset * 7)
      result[week] = d.toISOString().split("T")[0]
      weekOffset++
    }
    return result
  }, [startDate, weekNumbers, skippedWeeks])

  // Build final games for preview (Step 6)
  const previewGames = useMemo((): GeneratedGame[] => {
    const result: GeneratedGame[] = []
    for (const week of activeWeeks) {
      const weekGames = slotsByWeek[week] || []
      const slotsForWeek = weekSlots[week] || []
      const gameType = weekGameTypes[week] || "regular"
      const baseDate = weekDates[week] || ""

      for (let i = 0; i < weekGames.length; i++) {
        const slot = weekGames[i]
        const slotInfo = slotsForWeek[i] || { date: baseDate, time: "TBD", location: defaultLocation }

        result.push({
          date: slotInfo.date || baseDate,
          time: slotInfo.time || "TBD",
          homeTeam: teams[slot.home]?.teamSlug ?? "tbd",
          awayTeam: teams[slot.away]?.teamSlug ?? "tbd",
          location: slotInfo.location || defaultLocation,
          gameType,
          status: "upcoming",
        })
      }
    }
    return result
  }, [activeWeeks, slotsByWeek, weekSlots, weekGameTypes, weekDates, teams, defaultLocation])

  // ─── Navigation ───────────────────────────────────────────────────────────

  const totalSteps = 6
  const canGoNext = (): boolean => {
    switch (step) {
      case 1: return teams.length >= 2 && gamesPerWeek >= 1 && cycles >= 1
      case 2: return startDate !== ""
      case 3: return activeWeeks.length > 0
      case 4: return true
      case 5: return true
      case 6: return previewGames.length > 0
      default: return false
    }
  }

  const handleNext = () => {
    if (step === 2) {
      // Initialize weekSlots with defaults when moving past step 2
      const initial: Record<number, WeekSlot[]> = {}
      for (const week of activeWeeks) {
        const numGames = slotsByWeek[week]?.length || 0
        const baseDate = weekDates[week] || ""
        initial[week] = Array.from({ length: numGames }, () => ({
          date: baseDate,
          time: "TBD",
          location: defaultLocation,
        }))
      }
      setWeekSlots((prev) => ({ ...initial, ...prev }))
    }
    setStep((s) => Math.min(s + 1, totalSteps))
  }
  const handleBack = () => setStep((s) => Math.max(s - 1, 1))

  const handleSave = async (force: boolean = false) => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/bash/admin/seasons/${seasonId}/schedule/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: saveMode,
          force,
          games: previewGames,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (data.error?.includes("final games exist") && !force) {
          setShowOverwriteConfirm(true)
          return
        }
        throw new Error(data.error || "Failed to generate schedule")
      }

      toast.success(`Generated ${previewGames.length} games`)
      onSaved()
      handleReset()
      onOpenChange(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setStep(1)
    setSkippedWeeks(new Set())
    setWeekSlots({})
    setWeekGameTypes({})
  }

  const updateSlot = (week: number, index: number, field: keyof WeekSlot, value: string) => {
    setWeekSlots((prev) => {
      const copy = { ...prev }
      if (!copy[week]) copy[week] = []
      if (!copy[week][index]) copy[week][index] = { date: "", time: "TBD", location: defaultLocation }
      copy[week] = [...copy[week]]
      copy[week][index] = { ...copy[week][index], [field]: value }
      return copy
    })
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const stepTitles = [
    "Parameters",
    "Start Date",
    "Skip Weeks",
    "Times & Locations",
    "Game Types",
    "Review & Save",
  ]

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Round Robin Wizard
              <Badge variant="outline" className="ml-2">Step {step}/{totalSteps}</Badge>
            </DialogTitle>
          </DialogHeader>

          {/* Progress bar */}
          <div className="flex gap-1 mb-4">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i < step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="py-2 min-h-[300px]">
            <h3 className="font-semibold text-base mb-4">{stepTitles[step - 1]}</h3>

            {/* ─── Step 1: Parameters ─── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-4">
                    Configure the round-robin schedule parameters. The algorithm will generate
                    balanced matchups so each team plays every other team.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Teams in League</Label>
                      <div className="text-2xl font-bold">{teams.length}</div>
                      <p className="text-xs text-muted-foreground">
                        {teams.map((t) => t.teamName).join(", ")}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Games Per Week</Label>
                      <Input
                        type="number"
                        min={1}
                        max={Math.floor(teams.length / 2)}
                        value={gamesPerWeek}
                        onChange={(e) => setGamesPerWeek(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Max {Math.floor(teams.length / 2)} (each team plays once per week)
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Label>Full Cycles</Label>
                    <Select value={String(cycles)} onValueChange={(v) => setCycles(+v)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 cycle ({teams.length - 1} rounds)</SelectItem>
                        <SelectItem value="2">2 cycles ({(teams.length - 1) * 2} rounds)</SelectItem>
                        <SelectItem value="3">3 cycles ({(teams.length - 1) * 3} rounds)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="p-3 border rounded-lg text-sm">
                  <strong>Preview:</strong>{" "}
                  {slots.length} total games across {weekNumbers.length} weeks
                  ({gamesPerWeek} games/week)
                </div>
              </div>
            )}

            {/* ─── Step 2: Start Date ─── */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Choose the date for Week 1. Subsequent weeks will be scheduled 7 days apart.
                </p>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-[200px]"
                  />
                </div>
                {startDate && (
                  <div className="p-3 border rounded-lg text-sm">
                    <strong>Week 1:</strong>{" "}
                    {new Date(startDate + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                    <br />
                    <strong>Last week:</strong>{" "}
                    {(() => {
                      const d = new Date(startDate + "T00:00:00")
                      d.setDate(d.getDate() + (weekNumbers.length - 1) * 7)
                      return d.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* ─── Step 3: Skip Weeks ─── */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Toggle off any weeks you want to skip (holidays, rink closures, etc.).
                  Games from skipped weeks will be removed and subsequent dates will shift earlier.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                  {weekNumbers.map((week) => {
                    const isSkipped = skippedWeeks.has(week)
                    const dateStr = weekDates[week]
                    return (
                      <div
                        key={week}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSkipped ? "bg-muted/50 opacity-50" : "bg-card hover:bg-muted/30"
                        }`}
                        onClick={() => {
                          const next = new Set(skippedWeeks)
                          if (isSkipped) next.delete(week)
                          else next.add(week)
                          setSkippedWeeks(next)
                        }}
                      >
                        <Checkbox
                          checked={!isSkipped}
                          onCheckedChange={() => {
                            const next = new Set(skippedWeeks)
                            if (isSkipped) next.delete(week)
                            else next.add(week)
                            setSkippedWeeks(next)
                          }}
                        />
                        <div>
                          <div className="font-medium text-sm">Week {week}</div>
                          {dateStr && (
                            <div className="text-xs text-muted-foreground">
                              {new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {slotsByWeek[week]?.length || 0} games
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="text-sm text-muted-foreground">
                  {activeWeeks.length} of {weekNumbers.length} weeks active
                </div>
              </div>
            )}

            {/* ─── Step 4: Times & Locations ─── */}
            {step === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Set the time and location for each game slot. Defaults to the season location.
                </p>
                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
                  {activeWeeks.map((week) => {
                    const weekGames = slotsByWeek[week] || []
                    const slotsArr = weekSlots[week] || []
                    const baseDate = weekDates[week] || ""

                    return (
                      <div key={week} className="border rounded-lg p-3 space-y-2">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          Week {week}
                          {baseDate && (
                            <Badge variant="outline" className="text-xs">
                              {new Date(baseDate + "T00:00:00").toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </Badge>
                          )}
                        </h4>
                        {weekGames.map((slot, i) => (
                          <div key={i} className="grid grid-cols-12 gap-2 items-center text-sm">
                            <div className="col-span-3 text-muted-foreground truncate">
                              {teams[slot.away]?.teamName ?? "?"} @ {teams[slot.home]?.teamName ?? "?"}
                            </div>
                            <div className="col-span-3">
                              <Input
                                type="date"
                                value={slotsArr[i]?.date || baseDate}
                                onChange={(e) => updateSlot(week, i, "date", e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                placeholder="Time"
                                value={slotsArr[i]?.time || "TBD"}
                                onChange={(e) => updateSlot(week, i, "time", e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="col-span-4">
                              <Input
                                placeholder="Location"
                                value={slotsArr[i]?.location || defaultLocation}
                                onChange={(e) => updateSlot(week, i, "location", e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ─── Step 5: Game Types ─── */}
            {step === 5 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Optionally set the game type per week. Most weeks are &quot;Regular Season&quot; but
                  you can designate opening weeks as exhibitions or practices.
                </p>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {activeWeeks.map((week) => (
                    <div key={week} className="flex items-center gap-4 p-2 rounded border">
                      <span className="w-20 text-sm font-medium">Week {week}</span>
                      <Select
                        value={weekGameTypes[week] || "regular"}
                        onValueChange={(v) =>
                          setWeekGameTypes((prev) => ({ ...prev, [week]: v as GameTypeOption }))
                        }
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="regular">Regular Season</SelectItem>
                          <SelectItem value="practice">Practice</SelectItem>
                          <SelectItem value="exhibition">Exhibition</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground">
                        {slotsByWeek[week]?.length || 0} games
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Step 6: Review & Save ─── */}
            {step === 6 && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                  <div className="grid grid-cols-2 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Total games:</span>
                    <span className="font-medium">{previewGames.length}</span>
                    <span className="text-muted-foreground">Active weeks:</span>
                    <span className="font-medium">{activeWeeks.length}</span>
                    <span className="text-muted-foreground">Skipped weeks:</span>
                    <span className="font-medium">{skippedWeeks.size}</span>
                    <span className="text-muted-foreground">Games per week:</span>
                    <span className="font-medium">{gamesPerWeek}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Save Mode</Label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={saveMode === "overwrite"}
                        onCheckedChange={(checked) =>
                          setSaveMode(checked ? "overwrite" : "append")
                        }
                      />
                      <span className="text-sm">
                        {saveMode === "overwrite"
                          ? "Overwrite existing schedule"
                          : "Append to existing schedule"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg max-h-[250px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card border-b">
                      <tr>
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Time</th>
                        <th className="text-left p-2">Away</th>
                        <th className="text-center p-2">@</th>
                        <th className="text-left p-2">Home</th>
                        <th className="text-left p-2">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewGames.map((g, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-2">{g.date}</td>
                          <td className="p-2">{g.time}</td>
                          <td className="p-2">
                            {teams.find((t) => t.teamSlug === g.awayTeam)?.teamName ?? g.awayTeam}
                          </td>
                          <td className="p-2 text-center text-muted-foreground">@</td>
                          <td className="p-2">
                            {teams.find((t) => t.teamSlug === g.homeTeam)?.teamName ?? g.homeTeam}
                          </td>
                          <td className="p-2">
                            <Badge variant="outline" className="capitalize text-[10px]">
                              {g.gameType}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between sm:justify-between gap-2">
            <div>
              {step > 1 && (
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {step < totalSteps ? (
                <Button onClick={handleNext} disabled={!canGoNext()}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={() => handleSave(false)} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    `Generate ${previewGames.length} Games`
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showOverwriteConfirm} onOpenChange={setShowOverwriteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Final games exist</AlertDialogTitle>
            <AlertDialogDescription>
              There are completed (final) games in this schedule. Overwriting will delete all
              non-final games. Final games and their stats will be preserved. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowOverwriteConfirm(false)
                handleSave(true)
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Overwrite Non-Final Games
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
