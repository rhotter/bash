"use client"

import { useState, useEffect } from "react"
import { Search, Loader2, Edit, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { TeamLogo } from "@/components/team-logo"

interface Team {
  slug: string
  name: string
}

export function TeamsClient() {
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")

  // Edit/Create State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeTeam, setActiveTeam] = useState<Team | null>(null)
  const [editSlug, setEditSlug] = useState("")
  const [editName, setEditName] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/bash/admin/teams")
      if (res.ok) {
        const data = await res.json()
        setTeams(data.teams || [])
      }
    } catch (e) {
      toast.error("Failed to fetch teams")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!editSlug.trim() || !editName.trim()) return
    
    setIsSaving(true)
    const isNew = !activeTeam

    try {
      const url = isNew ? "/api/bash/admin/teams" : `/api/bash/admin/teams/${activeTeam.slug}`
      const method = isNew ? "POST" : "PUT"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: editSlug.trim().toLowerCase(), name: editName.trim() }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(isNew ? "Team created successfully" : "Team updated successfully")
        
        if (isNew) {
          setTeams([...teams, data.team].sort((a, b) => a.name.localeCompare(b.name)))
        } else {
          setTeams(teams.map(t => t.slug === activeTeam.slug ? { ...t, name: editName.trim() } : t))
        }
        setIsDialogOpen(false)
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to save team")
      }
    } catch (e) {
      toast.error("Failed to save team")
    } finally {
      setIsSaving(false)
    }
  }

  const openCreate = () => {
    setActiveTeam(null)
    setEditSlug("")
    setEditName("")
    setIsDialogOpen(true)
  }

  const openEdit = (team: Team) => {
    setActiveTeam(team)
    setEditSlug(team.slug)
    setEditName(team.name)
    setIsDialogOpen(true)
  }

  const filteredTeams = teams.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.slug.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search teams..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Team
        </Button>
      </div>

      {/* Data Table */}
      <div className="border rounded-xl bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[60px]">Logo</TableHead>
              <TableHead>Team Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading teams...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredTeams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No teams found.
                </TableCell>
              </TableRow>
            ) : (
              filteredTeams.map((team) => (
                <TableRow key={team.slug} className="hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <TeamLogo slug={team.slug} name={team.name} size={32} className="opacity-80" />
                  </TableCell>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell className="font-mono text-muted-foreground text-xs">{team.slug}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(team)}>
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeTeam ? "Edit Team" : "Create New Team"}</DialogTitle>
            <DialogDescription>
              {activeTeam 
                ? "Update the display name for this franchise. Note: Database slugs cannot be changed once established to preserve historical record integrity." 
                : "Create a new franchise in the BASH database. The slug should be a lowercase identifier without spaces (e.g. 'bashers')."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">Database Slug {activeTeam && "(Read-only)"}</Label>
              <Input
                id="slug"
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                disabled={!!activeTeam}
                className={activeTeam ? "bg-muted" : ""}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave()
                }}
              />
            </div>
            {!activeTeam && (
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
                Slugs are permanent. For example, "bashers" or "last-licks".
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !editName.trim() || !editSlug.trim()}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {activeTeam ? "Save Changes" : "Create Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
