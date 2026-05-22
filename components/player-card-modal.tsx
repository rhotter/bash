"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ExternalLink } from "lucide-react"
import Link from "next/link"
import { playerSlug } from "@/lib/player-slug"
import { SectionHeader } from "@/components/stats-table"

// ─── Types ──────────────────────────────────────────────────────────────────

interface PoolPlayer {
  playerId: number
  playerName: string
  registrationMeta: Record<string, unknown> | null
}

interface PlayerCardModalProps {
  player: PoolPlayer | null
  open: boolean
  onOpenChange: (open: boolean) => void
  seasonSlug: string
  teamName?: string | null // team they were drafted to (if any)
  teamColor?: string | null
  pickInfo?: { round: number; pickNumber: number; isKeeper: boolean } | null
}

// ─── Atoms ──────────────────────────────────────────────────────────────────

/**
 * Renders a <dt>/<dd> pair inside a parent `<dl>` 2-col grid.
 * Returns null for null/undefined/empty values so empty fields don't waste space.
 */
function Row({
  label,
  value,
}: {
  label: string
  value: string | number | boolean | null | undefined
}) {
  if (value === null || value === undefined || value === "") return null
  const display = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)
  return (
    <>
      <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60 self-center py-1.5 border-b border-border/15">
        {label}
      </dt>
      <dd className="text-xs font-medium text-foreground text-right break-words py-1.5 border-b border-border/15">
        {display}
      </dd>
    </>
  )
}

/**
 * `|`-separated meta row, like the team page subtitle. Hides itself if all
 * pieces are empty; renders dividers only between present pieces.
 */
function MetaLine({ pieces }: { pieces: Array<string | number | null | undefined> }) {
  const items = pieces.filter((p): p is string | number => p !== null && p !== undefined && p !== "")
  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap items-center mt-1.5 text-[11px] text-muted-foreground">
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center">
          {i > 0 && <span className="text-muted-foreground/30 mx-1.5">|</span>}
          <span className={typeof item === "number" ? "tabular-nums" : ""}>{item}</span>
        </span>
      ))}
    </div>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PlayerCardModal({
  player,
  open,
  onOpenChange,
  teamName,
  teamColor,
  pickInfo,
}: PlayerCardModalProps) {
  if (!player) return null

  const meta = player.registrationMeta || {}

  // Parse registration metadata
  const skillLevel = meta.skillLevel as string | null
  const positions = meta.positions as string | null
  const gamesExpected = meta.gamesExpected as string | null
  const playoffAvail = meta.playoffAvail as string | null
  const goalieWilling = meta.goalieWilling as string | null
  const isRookie = meta.isRookie as boolean | undefined
  const isNewToBash = meta.isNewToBash as boolean | null | undefined
  const gender = meta.gender as string | null
  const age = meta.age as number | null
  const yearsPlayed = meta.yearsPlayed as number | string | null
  const lastLeague = meta.lastLeague as string | null
  const lastTeam = meta.lastTeam as string | null
  const captainPrev = meta.captainPrev as string | null
  const buddyReq = meta.buddyReq as string | null
  const miscNotes = meta.miscNotes as string | null

  const hasBackground =
    isNewToBash !== null && isNewToBash !== undefined
      ? true
      : Boolean(captainPrev || lastLeague || lastTeam || buddyReq)

  // Body row container — 2-col grid, label/value, no per-row wrappers.
  const dlClass = "grid grid-cols-[minmax(120px,auto)_1fr] gap-x-4"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="px-6 pt-5">
          <div className="flex items-start justify-between gap-3 pr-4">
            <div className="min-w-0 flex-1">
              <DialogHeader>
                <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                  <span className="truncate">{player.playerName}</span>
                  {isRookie && (
                    <span className="shrink-0 inline-flex h-4 min-w-4 items-center justify-center rounded-sm border border-border px-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground leading-none">
                      R
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>

              {/* Drafted-to row — team identity */}
              {teamName && pickInfo && (
                <div className="flex items-center mt-1 text-xs">
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0 mr-1.5"
                    style={{ backgroundColor: teamColor || "#94a3b8" }}
                    aria-hidden
                  />
                  <span className="font-semibold text-foreground truncate">{teamName}</span>
                  <span className="text-muted-foreground/30 mx-1.5">|</span>
                  <span className="text-muted-foreground tabular-nums">
                    R{pickInfo.round}P{pickInfo.pickNumber}
                  </span>
                  {pickInfo.isKeeper && (
                    <>
                      <span className="text-muted-foreground/30 mx-1.5">|</span>
                      <span className="text-muted-foreground">Keeper</span>
                    </>
                  )}
                </div>
              )}

              {/* Quick-glance meta line */}
              <MetaLine
                pieces={[
                  positions,
                  skillLevel,
                  age ? `Age ${age}` : null,
                  gender,
                ]}
              />
            </div>

            {/* All Stats link */}
            <Link
              href={`/player/${playerSlug(player.playerName)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground hover:text-primary transition-colors whitespace-nowrap mt-1"
            >
              All Stats
              <ExternalLink className="h-2.5 w-2.5" />
            </Link>
          </div>

          {/* Hairline between header and body — team color if present, else border */}
          <div
            className="mt-4 -mx-6 h-px"
            style={teamColor ? { backgroundColor: teamColor } : undefined}
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-5">
          <section>
            <SectionHeader>Playing Profile</SectionHeader>
            <dl className={dlClass}>
              <Row label="Position" value={positions} />
              <Row label="Skill Level" value={skillLevel} />
              <Row label="Goalie Willingness" value={goalieWilling} />
              <Row label="Experience" value={yearsPlayed} />
            </dl>
          </section>

          {(gamesExpected || playoffAvail) && (
            <section className="mt-6">
              <SectionHeader>Availability</SectionHeader>
              <dl className={dlClass}>
                <Row label="Expected Games" value={gamesExpected} />
                <Row label="Playoffs" value={playoffAvail} />
              </dl>
            </section>
          )}

          {hasBackground && (
            <section className="mt-6">
              <SectionHeader>Background</SectionHeader>
              <dl className={dlClass}>
                <Row label="New to BASH" value={isNewToBash} />
                <Row label="Captain (Prior)" value={captainPrev ? "Yes" : null} />
                <Row label="Last League" value={lastLeague} />
                <Row label="Last Team" value={lastTeam} />
                <Row label="Buddy Request" value={buddyReq} />
              </dl>
            </section>
          )}

          {miscNotes && (
            <section className="mt-6">
              <SectionHeader>Notes</SectionHeader>
              <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {miscNotes}
              </p>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
