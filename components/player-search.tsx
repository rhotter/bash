"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { SearchIcon } from "lucide-react"
import { useIsMobile } from "@/components/ui/use-mobile"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import type { PlayerSearchResult } from "@/app/api/bash/players/search/route"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function PlayerSearch() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const isMobile = useIsMobile()

  // Only fetch when opened
  const { data } = useSWR<{ players: PlayerSearchResult[] }>(
    open ? "/api/bash/players/search" : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  )
  const players = data?.players ?? []

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const handleSelect = useCallback(
    (slug: string) => {
      setOpen(false)
      router.push(`/player/${slug}`)
    },
    [router]
  )

  const commandContent = (
    <Command className="rounded-lg" shouldFilter>
      <CommandInput placeholder="Search players..." />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>No players found.</CommandEmpty>
        <CommandGroup>
          {players.map((p) => (
            <CommandItem
              key={p.slug}
              value={p.name}
              onSelect={() => handleSelect(p.slug)}
              className="flex items-center justify-between gap-2 py-3"
            >
              <span className="font-medium text-sm">{p.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {p.team}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )

  if (isMobile) {
    return (
      <>
        <SearchButton onClick={() => setOpen(true)} />
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader className="sr-only">
              <DrawerTitle>Search players</DrawerTitle>
              <DrawerDescription>Find a player by name</DrawerDescription>
            </DrawerHeader>
            <div className="p-2">{commandContent}</div>
          </DrawerContent>
        </Drawer>
      </>
    )
  }

  return (
    <>
      <SearchButton onClick={() => setOpen(true)} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader className="sr-only">
          <DialogTitle>Search players</DialogTitle>
          <DialogDescription>Find a player by name</DialogDescription>
        </DialogHeader>
        <DialogContent className="overflow-hidden p-0 sm:max-w-md" showCloseButton={false}>
          {commandContent}
        </DialogContent>
      </Dialog>
    </>
  )
}

function SearchButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors min-h-[44px] sm:min-h-0"
      aria-label="Search players"
    >
      <SearchIcon className="h-4 w-4" />
      <span className="hidden sm:inline text-[11px] sm:text-xs font-semibold">Search</span>
    </button>
  )
}
