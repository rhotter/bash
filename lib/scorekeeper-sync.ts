import type { LiveGameState } from "./scorekeeper-types"

const STORAGE_PREFIX = "bash-live-"

export function getStorageKey(gameId: string) {
  return `${STORAGE_PREFIX}${gameId}`
}

export function saveToLocalStorage(gameId: string, state: LiveGameState) {
  try {
    localStorage.setItem(getStorageKey(gameId), JSON.stringify(state))
  } catch {
    // localStorage full or unavailable
  }
}

export function loadFromLocalStorage(gameId: string): LiveGameState | null {
  try {
    const raw = localStorage.getItem(getStorageKey(gameId))
    if (!raw) return null
    return JSON.parse(raw) as LiveGameState
  } catch {
    return null
  }
}

export function clearLocalStorage(gameId: string) {
  try {
    localStorage.removeItem(getStorageKey(gameId))
  } catch {
    // ignore
  }
}

export type SyncStatus = "synced" | "syncing" | "pending" | "offline"

export function createSyncManager(gameId: string, pin: string) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let pendingState: LiveGameState | null = null
  let isSyncing = false
  let onStatusChange: ((status: SyncStatus) => void) | null = null

  async function doSync(state: LiveGameState): Promise<boolean> {
    try {
      const res = await fetch(`/api/bash/scorekeeper/${gameId}/state`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-pin": pin },
        body: JSON.stringify(state),
      })
      return res.ok
    } catch {
      return false
    }
  }

  async function flush() {
    if (isSyncing || !pendingState) return

    isSyncing = true
    onStatusChange?.("syncing")

    const state = pendingState
    pendingState = null

    const ok = await doSync(state)

    isSyncing = false

    if (ok) {
      onStatusChange?.("synced")
      // Clear any retry timer
      if (retryTimer) {
        clearTimeout(retryTimer)
        retryTimer = null
      }
    } else {
      // Put state back for retry
      pendingState = state
      onStatusChange?.("offline")
      // Retry in 5 seconds
      retryTimer = setTimeout(() => flush(), 5000)
    }
  }

  function scheduleSync(state: LiveGameState) {
    pendingState = state
    onStatusChange?.("pending")

    if (timer) clearTimeout(timer)
    timer = setTimeout(() => flush(), 500)
  }

  function sendBeacon(state: LiveGameState) {
    try {
      const blob = new Blob([JSON.stringify(state)], { type: "application/json" })
      navigator.sendBeacon(`/api/bash/scorekeeper/${gameId}/state?pin=${pin}`, blob)
    } catch {
      // best-effort
    }
  }

  function setStatusListener(listener: (status: SyncStatus) => void) {
    onStatusChange = listener
  }

  function destroy() {
    if (timer) clearTimeout(timer)
    if (retryTimer) clearTimeout(retryTimer)
  }

  return { scheduleSync, sendBeacon, setStatusListener, destroy, flush }
}
