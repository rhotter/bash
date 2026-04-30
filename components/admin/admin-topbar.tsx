"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { LogOut } from "lucide-react"

export function AdminTopbar() {
  function handleLogout() {
    fetch("/api/bash/admin/logout", { method: "POST" }).then(() => {
      window.location.href = "/"
    })
  }

  return (
    <header className="shrink-0 border-b bg-background">
      <div className="flex min-h-12 items-center justify-between gap-3 px-4 py-2">
        <div className="flex items-center">
          <SidebarTrigger className="-ml-1 text-muted-foreground hover:bg-muted hover:text-foreground" />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer"
          >
            <LogOut className="h-3 w-3" />
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
