"use client"

import { useState, useEffect } from "react"
import { RefreshCw, Loader2, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarMenuButton } from "@/components/ui/sidebar"

type SyncState = "idle" | "syncing" | "success" | "error"

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function SyncButton({ variant = "default" }: { variant?: "default" | "sidebar" }) {
  const [state, setState] = useState<SyncState>("idle")
  const [message, setMessage] = useState("")
  const [lastSync, setLastSync] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/bash/admin/sync-status")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.lastSync) setLastSync(data.lastSync) })
      .catch(() => {})
  }, [])

  async function handleSync() {
    setState("syncing")
    setMessage("")

    try {
      const res = await fetch("/api/bash/sync", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setState("success")
        setMessage(data.message || "Sync complete")
        setLastSync(new Date().toISOString())
        setTimeout(() => { setState("idle"); setMessage("") }, 3000)
      } else {
        setState("error")
        setMessage("Sync failed")
        setTimeout(() => { setState("idle"); setMessage("") }, 5000)
      }
    } catch {
      setState("error")
      setMessage("Connection error")
      setTimeout(() => { setState("idle"); setMessage("") }, 5000)
    }
  }

  if (variant === "sidebar") {
    return (
      <div>
        <SidebarMenuButton
          onClick={handleSync}
          disabled={state === "syncing"}
          className="cursor-pointer"
        >
          {state === "syncing" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : state === "success" ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : state === "error" ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span>{message || "Sync Now"}</span>
        </SidebarMenuButton>
        {lastSync && state === "idle" && (
          <p className="text-[10px] text-muted-foreground pl-8 -mt-0.5">
            Last synced {formatRelativeTime(lastSync)}
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      <Button
        onClick={handleSync}
        disabled={state === "syncing"}
        variant="outline"
        size="sm"
        className="cursor-pointer"
      >
        {state === "syncing" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
        ) : state === "success" ? (
          <Check className="h-3.5 w-3.5 text-green-600 mr-1.5" />
        ) : state === "error" ? (
          <AlertCircle className="h-3.5 w-3.5 text-destructive mr-1.5" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
        )}
        {message || "Sync Now"}
      </Button>
      {lastSync && state === "idle" && (
        <p className="text-[10px] text-muted-foreground mt-1">
          Last synced {formatRelativeTime(lastSync)}
        </p>
      )}
    </div>
  )
}
