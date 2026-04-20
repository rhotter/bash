"use client"

import { useState, useEffect } from "react"
import { Search, Loader2, Wand2, Edit, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface Player {
  id: number
  name: string
}

export function PlayersClient() {
  const [players, setPlayers] = useState<Player[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [isMerging, setIsMerging] = useState(false)

  // Edit State
  const [editPlayer, setEditPlayer] = useState<Player | null>(null)
  const [editName, setEditName] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchPlayers()
  }, [])

  const fetchPlayers = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/bash/admin/players")
      if (res.ok) {
        const data = await res.json()
        setPlayers(data.players || [])
      }
    } catch (e) {
      toast.error("Failed to fetch players")
    } finally {
      setIsLoading(false)
    }
  }

  const handleMerge = async () => {
    setIsMerging(true)
    try {
      const res = await fetch("/api/bash/admin/players/merge", { method: "POST" })
      if (res.ok) {
        const result = await res.json()
        if (result.merged > 0) {
          toast.success(`Merged ${result.merged} duplicates across ${result.groups} name groups.`)
          await fetchPlayers()
        } else {
          toast.info("No duplicates found to merge.")
        }
      } else {
        toast.error("Merge request failed.")
      }
    } catch (e) {
      toast.error("Failed to run duplicate merger.")
    } finally {
      setIsMerging(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editPlayer || !editName.trim()) return
    
    setIsSaving(true)
    try {
      const res = await fetch(`/api/bash/admin/players/${editPlayer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      })
      if (res.ok) {
        toast.success("Player updated successfully")
        setPlayers(players.map(p => p.id === editPlayer.id ? { ...p, name: editName.trim() } : p))
        setEditPlayer(null)
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to update player")
      }
    } catch (e) {
      toast.error("Failed to update player")
    } finally {
      setIsSaving(false)
    }
  }

  const openEdit = (player: Player) => {
    setEditPlayer(player)
    setEditName(player.name)
  }

  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  // Fast pagination logic on client (just arbitrary 50 to not crash DOM if 2000 players map)
  const displayPlayers = filteredPlayers.slice(0, 100)

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search players..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Button 
          onClick={handleMerge} 
          disabled={isMerging}
          variant="outline"
          className="w-full sm:w-auto text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
        >
          {isMerging ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
          Auto-Merge Duplicates
        </Button>
      </div>

      {/* Data Table */}
      <div className="border rounded-xl bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Canonical Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading players...
                  </div>
                </TableCell>
              </TableRow>
            ) : displayPlayers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  No players found matching your search.
                </TableCell>
              </TableRow>
            ) : (
              displayPlayers.map((player) => (
                <TableRow key={player.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-mono text-muted-foreground text-xs">{player.id}</TableCell>
                  <TableCell className="font-medium">{player.name}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(player)}>
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!isLoading && filteredPlayers.length > 100 && (
          <div className="bg-muted/30 p-2 text-center text-xs text-muted-foreground border-t">
            Showing first 100 results of {filteredPlayers.length}. Use search to narrow down.
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editPlayer} onOpenChange={(open) => !open && setEditPlayer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
            <DialogDescription>
              Update the canonical name for this player. This will reflect across all leaderboards and boxscores.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Player Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit()
                }}
              />
            </div>
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
              <span className="font-semibold text-foreground">Database ID:</span> {editPlayer?.id}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlayer(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving || !editName.trim()}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
