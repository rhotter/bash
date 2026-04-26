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
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Trophy, Loader2, ArrowRight } from "lucide-react"
import { generateBracket, type BracketGame } from "@/lib/schedule-utils"

interface PlayoffWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teams: { teamSlug: string; teamName: string }[]
  seasonId: string
  defaultLocation: string
  onSaved: () => void
}

export function PlayoffWizard({
  open,
  onOpenChange,
  teams,
  seasonId,
  defaultLocation,
  onSaved,
}: PlayoffWizardProps) {
  const [step, setStep] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Step 1: Format & Teams
  const [numTeams, setNumTeams] = useState(Math.min(teams.length, 4))
  const [playIn, setPlayIn] = useState(false)
  const [quarterSeriesLength, setQuarterSeriesLength] = useState<1 | 3>(1)
  const [semiSeriesLength, setSemiSeriesLength] = useState<1 | 3>(1)
  const [finalSeriesLength, setFinalSeriesLength] = useState<1 | 3>(1)
  const [usePlaceholders, setUsePlaceholders] = useState(false)

  // Step 2: Seeding — ordered list of team slugs
  const [seeds, setSeeds] = useState<string[]>(() =>
    teams.slice(0, Math.min(teams.length, 8)).map((t) => t.teamSlug)
  )

  // Generated bracket
  const bracketGames = useMemo((): BracketGame[] => {
    return generateBracket({
      numTeams,
      playIn: playIn && numTeams % 2 !== 0,
      quarterSeriesLength,
      semiSeriesLength,
      finalSeriesLength,
      seeds: seeds.slice(0, numTeams),
      usePlaceholders,
    })
  }, [numTeams, playIn, quarterSeriesLength, semiSeriesLength, finalSeriesLength, seeds, usePlaceholders])

  // Step 3: Game details (mutable dates/times/locations per bracket game)
  const [gameDetails, setGameDetails] = useState<
    Record<string, { date: string; time: string; location: string }>
  >({})

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const teamNameForSlug = (slug: string): string => {
    return teams.find((t) => t.teamSlug === slug)?.teamName ?? slug
  }

  const displayTeam = (slug: string, placeholder: string | null): string => {
    if (slug === "tbd" && placeholder) return placeholder
    return teamNameForSlug(slug)
  }

  const roundLabel = (round: string): string => {
    switch (round) {
      case "play-in": return "Play-in"
      case "quarterfinal": return "Quarterfinals"
      case "semifinal": return "Semi-Finals"
      case "final": return "Finals"
      default: return round
    }
  }

  // Group bracket games by round for display
  const gamesByRound = useMemo(() => {
    const grouped: Record<string, BracketGame[]> = {}
    for (const g of bracketGames) {
      if (!grouped[g.bracketRound]) grouped[g.bracketRound] = []
      grouped[g.bracketRound].push(g)
    }
    return grouped
  }, [bracketGames])

  const roundOrder = ["play-in", "quarterfinal", "semifinal", "final"]

  // ─── Navigation ───────────────────────────────────────────────────────────

  const totalSteps = 4
  const canGoNext = (): boolean => {
    switch (step) {
      case 1: return numTeams >= 4
      case 2: return seeds.filter(Boolean).length >= numTeams
      case 3: return true
      case 4: return bracketGames.length > 0
      default: return false
    }
  }

  const handleNext = () => {
    if (step === 1 && seeds.length < numTeams) {
      // Pad seeds
      const padded = [...seeds]
      while (padded.length < numTeams) padded.push("")
      setSeeds(padded)
    }
    if (step === 2) {
      // Initialize game details with defaults
      const initial: Record<string, { date: string; time: string; location: string }> = {}
      for (const g of bracketGames) {
        if (!gameDetails[g.id]) {
          initial[g.id] = { date: "", time: "TBD", location: defaultLocation }
        }
      }
      setGameDetails((prev) => ({ ...initial, ...prev }))
    }
    setStep((s) => Math.min(s + 1, totalSteps))
  }
  const handleBack = () => setStep((s) => Math.max(s - 1, 1))

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Merge game details into bracket games
      const payload = bracketGames.map((g) => {
        const details = gameDetails[g.id] || { date: "", time: "TBD", location: defaultLocation }
        return {
          ...g,
          date: details.date,
          time: details.time,
          location: details.location,
        }
      })

      const res = await fetch(`/api/bash/admin/seasons/${seasonId}/schedule/playoffs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ games: payload }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to generate playoffs")
      }

      toast.success(`Generated ${bracketGames.length} playoff games`)
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
    setGameDetails({})
  }

  const moveSeed = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= seeds.length) return
    const next = [...seeds]
    const [item] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, item)
    setSeeds(next)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const stepTitles = ["Format & Teams", "Assign Seeds", "Game Details", "Review & Save"]

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Playoff Bracket Wizard
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

            {/* ─── Step 1: Format & Teams ─── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Number of Playoff Teams</Label>
                    <Select
                      value={String(numTeams)}
                      onValueChange={(v) => {
                        const n = +v
                        setNumTeams(n)
                        // Auto-enable play-in for odd counts
                        setPlayIn(n % 2 !== 0)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">4 teams</SelectItem>
                        {teams.length >= 5 && <SelectItem value="5">5 teams</SelectItem>}
                        {teams.length >= 6 && <SelectItem value="6">6 teams</SelectItem>}
                        {teams.length >= 7 && <SelectItem value="7">7 teams</SelectItem>}
                        {teams.length >= 8 && <SelectItem value="8">8 teams</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>

                  {numTeams % 2 !== 0 && (
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={playIn}
                        onCheckedChange={setPlayIn}
                        id="play-in"
                      />
                      <Label htmlFor="play-in">
                        Play-in Game (#{numTeams - 1} vs #{numTeams})
                      </Label>
                    </div>
                  )}
                </div>

                <div className={`grid gap-4 ${numTeams >= 6 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {numTeams >= 6 && (
                    <div className="space-y-2">
                      <Label>Quarterfinal Format</Label>
                      <Select
                        value={String(quarterSeriesLength)}
                        onValueChange={(v) => setQuarterSeriesLength(+v as 1 | 3)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Single Game</SelectItem>
                          <SelectItem value="3">Best of 3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Semi-Final Format</Label>
                    <Select
                      value={String(semiSeriesLength)}
                      onValueChange={(v) => setSemiSeriesLength(+v as 1 | 3)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Single Game</SelectItem>
                        <SelectItem value="3">Best of 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Finals Format</Label>
                    <Select
                      value={String(finalSeriesLength)}
                      onValueChange={(v) => setFinalSeriesLength(+v as 1 | 3)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Single Game</SelectItem>
                        <SelectItem value="3">Best of 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={usePlaceholders}
                    onCheckedChange={setUsePlaceholders}
                    id="placeholders"
                  />
                  <Label htmlFor="placeholders">Use placeholder labels (Seed 1, Seed 2…) instead of team names</Label>
                </div>

                <div className="p-3 border rounded-lg text-sm bg-muted/30">
                  <strong>Preview:</strong>{" "}
                  {bracketGames.length} total playoff games
                  {playIn && " (including play-in)"}
                  {numTeams >= 6 && quarterSeriesLength === 3 && " • Best-of-3 quarters"}
                  {semiSeriesLength === 3 && " • Best-of-3 semis"}
                  {finalSeriesLength === 3 && " • Best-of-3 finals"}
                </div>
              </div>
            )}

            {/* ─── Step 2: Assign Seeds ─── */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Assign seeding for the playoff bracket. Drag to reorder or use the dropdown to
                  change each seed.
                </p>
                <div className="space-y-2">
                  {Array.from({ length: numTeams }, (_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 border rounded-lg">
                      <Badge className="w-8 h-8 flex items-center justify-center rounded-full text-xs">
                        #{i + 1}
                      </Badge>
                      <Select
                        value={seeds[i] || ""}
                        onValueChange={(v) => {
                          const next = [...seeds]
                          // Swap if this team is already assigned elsewhere
                          const existingIdx = next.indexOf(v)
                          if (existingIdx !== -1 && existingIdx !== i) {
                            next[existingIdx] = next[i]
                          }
                          next[i] = v
                          setSeeds(next)
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select team..." />
                        </SelectTrigger>
                        <SelectContent>
                          {teams.map((t) => (
                            <SelectItem key={t.teamSlug} value={t.teamSlug}>
                              {t.teamName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={i === 0}
                          onClick={() => moveSeed(i, i - 1)}
                        >
                          ↑
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={i === numTeams - 1}
                          onClick={() => moveSeed(i, i + 1)}
                        >
                          ↓
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Visual bracket preview */}
                <div className="p-3 border rounded-lg text-sm bg-muted/30 space-y-1">
                  <strong>Bracket Preview:</strong>
                  {bracketGames
                    .filter((g, i, arr) => arr.findIndex((x) => x.seriesId === g.seriesId) === i)
                    .map((g) => (
                      <div key={g.seriesId} className="ml-2">
                        <span className="uppercase text-xs font-medium text-muted-foreground">{g.seriesId}:</span>{" "}
                        {displayTeam(g.homeTeam, g.homePlaceholder)} vs{" "}
                        {displayTeam(g.awayTeam, g.awayPlaceholder)}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* ─── Step 3: Game Details ─── */}
            {step === 3 && (
              <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
                <p className="text-sm text-muted-foreground">
                  Set dates, times, and locations for each playoff game.
                </p>
                {roundOrder
                  .filter((r) => gamesByRound[r])
                  .map((round) => (
                    <div key={round} className="space-y-2">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        {roundLabel(round)}
                        <Badge variant="outline" className="text-xs">
                          {gamesByRound[round].length} game{gamesByRound[round].length !== 1 && "s"}
                        </Badge>
                      </h4>
                      {gamesByRound[round].map((g) => {
                        const details = gameDetails[g.id] || {
                          date: "",
                          time: "TBD",
                          location: defaultLocation,
                        }
                        return (
                          <div key={g.id} className="grid grid-cols-12 gap-2 items-center text-sm border p-2 rounded">
                            <div className="col-span-3 text-muted-foreground truncate text-xs">
                              {g.seriesId !== "play-in" && (
                                <span className="uppercase font-medium">{g.seriesId} </span>
                              )}
                              Gm{g.seriesGameNumber}
                              <br />
                              {displayTeam(g.awayTeam, g.awayPlaceholder)} @{" "}
                              {displayTeam(g.homeTeam, g.homePlaceholder)}
                            </div>
                            <div className="col-span-3">
                              <Input
                                type="date"
                                value={details.date}
                                onChange={(e) =>
                                  setGameDetails((prev) => ({
                                    ...prev,
                                    [g.id]: { ...details, date: e.target.value },
                                  }))
                                }
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                placeholder="Time"
                                value={details.time}
                                onChange={(e) =>
                                  setGameDetails((prev) => ({
                                    ...prev,
                                    [g.id]: { ...details, time: e.target.value },
                                  }))
                                }
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="col-span-4">
                              <Input
                                placeholder="Location"
                                value={details.location}
                                onChange={(e) =>
                                  setGameDetails((prev) => ({
                                    ...prev,
                                    [g.id]: { ...details, location: e.target.value },
                                  }))
                                }
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
              </div>
            )}

            {/* ─── Step 4: Review & Save ─── */}
            {step === 4 && (
              <div className="space-y-4">
                {/* Visual bracket */}
                <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                  {roundOrder
                    .filter((r) => gamesByRound[r])
                    .map((round) => (
                      <div key={round}>
                        <div className="font-medium text-sm flex items-center gap-2 mb-1">
                          {roundLabel(round)}
                        </div>
                        {gamesByRound[round].map((g) => {
                          const details = gameDetails[g.id]
                          return (
                            <div key={g.id} className="flex items-center gap-2 ml-4 text-sm py-1">
                              <Badge variant="outline" className="text-[10px] uppercase">
                                {g.seriesId} G{g.seriesGameNumber}
                              </Badge>
                              <span>{displayTeam(g.awayTeam, g.awayPlaceholder)}</span>
                              <span className="text-muted-foreground">@</span>
                              <span>{displayTeam(g.homeTeam, g.homePlaceholder)}</span>
                              {g.nextGameId && (
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              )}
                              {details?.date && (
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {details.date} {details.time}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                </div>

                <div className="p-3 border rounded-lg text-sm">
                  <strong>{bracketGames.length}</strong> playoff games will be created.
                  {" "}This will replace any existing upcoming playoff games for this season.
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
                <Button onClick={() => setShowConfirm(true)} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Trophy className="h-4 w-4 mr-2" />
                      Generate Playoffs
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Playoff Bracket?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create {bracketGames.length} playoff games and replace any existing upcoming
              playoff games for this season. Completed playoff games will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirm(false)
                handleSave()
              }}
            >
              Generate Playoffs
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
