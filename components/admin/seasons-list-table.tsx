"use client"

import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface SeasonRow {
  id: string
  name: string
  seasonType: string
  status: string
  isCurrent: boolean
  teamCount: number
  gameCount: number
  playerCount: number
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-500/10 text-green-700 border-green-500/30",
    draft: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    completed: "bg-muted text-muted-foreground border-border",
  }

  return (
    <Badge variant="outline" className={`text-[10px] font-medium ${styles[status] || styles.completed}`}>
      {status}
    </Badge>
  )
}

function TypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="outline" className="text-[10px] font-medium">
      {type}
    </Badge>
  )
}

export function SeasonsListTable({ seasons }: { seasons: SeasonRow[] }) {
  const router = useRouter()

  const navigateToSeason = (seasonId: string) => {
    router.push(`/admin/seasons/${seasonId}`)
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs font-semibold">Name</TableHead>
            <TableHead className="text-xs font-semibold">Type</TableHead>
            <TableHead className="text-xs font-semibold">Status</TableHead>
            <TableHead className="text-xs font-semibold text-center">Teams</TableHead>
            <TableHead className="text-xs font-semibold text-center">Games</TableHead>
            <TableHead className="text-xs font-semibold text-center">Players</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {seasons.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                No seasons found
              </TableCell>
            </TableRow>
          ) : (
            seasons.map((season) => (
              <TableRow
                key={season.id}
                tabIndex={0}
                role="link"
                aria-label={`Open ${season.name}`}
                className="cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none"
                onClick={() => navigateToSeason(season.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    navigateToSeason(season.id)
                  }
                }}
              >
                <TableCell>
                  <span className="font-medium">{season.name}</span>
                  {season.isCurrent && (
                    <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                      Current
                    </span>
                  )}
                </TableCell>
                <TableCell><TypeBadge type={season.seasonType} /></TableCell>
                <TableCell><StatusBadge status={season.status} /></TableCell>
                <TableCell className="text-center text-sm text-muted-foreground">{season.teamCount}</TableCell>
                <TableCell className="text-center text-sm text-muted-foreground">{season.gameCount}</TableCell>
                <TableCell className="text-center text-sm text-muted-foreground">{season.playerCount}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
