"use client"

import { type Standing } from "@/lib/hockey-data"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"

export function StandingsTab({
  standings,
  isLoading,
}: {
  standings: Standing[]
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-64 animate-pulse rounded-xl bg-secondary/30" />
      </div>
    )
  }

  if (standings.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">No standings data available yet.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-8 text-center text-xs">#</TableHead>
            <TableHead className="text-xs">Team</TableHead>
            <TableHead className="text-center text-xs w-10">GP</TableHead>
            <TableHead className="text-center text-xs w-10">W</TableHead>
            <TableHead className="text-center text-xs w-10">OTW</TableHead>
            <TableHead className="text-center text-xs w-10">L</TableHead>
            <TableHead className="text-center text-xs w-10">OTL</TableHead>
            <TableHead className="text-center text-xs w-12">GF</TableHead>
            <TableHead className="text-center text-xs w-12">GA</TableHead>
            <TableHead className="text-center text-xs w-12">+/-</TableHead>
            <TableHead className="text-center text-xs w-12 font-bold">PTS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {standings.map((row, i) => (
            <TableRow key={row.slug}>
              <TableCell className="text-center text-xs text-muted-foreground">
                {i + 1}
              </TableCell>
              <TableCell>
                <Link href={`/team/${row.slug}`} className="text-sm font-semibold hover:text-primary transition-colors">
                  {row.team}
                </Link>
              </TableCell>
              <TableCell className="text-center text-sm tabular-nums">{row.gp}</TableCell>
              <TableCell className="text-center text-sm tabular-nums">{row.w}</TableCell>
              <TableCell className="text-center text-sm tabular-nums">{row.otw}</TableCell>
              <TableCell className="text-center text-sm tabular-nums">{row.l}</TableCell>
              <TableCell className="text-center text-sm tabular-nums">{row.otl}</TableCell>
              <TableCell className="text-center text-sm tabular-nums">{row.gf}</TableCell>
              <TableCell className="text-center text-sm tabular-nums">{row.ga}</TableCell>
              <TableCell className="text-center text-sm tabular-nums">
                {row.gd > 0 ? `+${row.gd}` : row.gd}
              </TableCell>
              <TableCell className="text-center text-sm tabular-nums font-bold">
                {row.pts}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="px-4 py-2 border-t border-border">
        <p className="text-[10px] text-muted-foreground">
          W=3pts, OTW=2pts, OTL=1pt, L=0pts
        </p>
      </div>
    </div>
  )
}
