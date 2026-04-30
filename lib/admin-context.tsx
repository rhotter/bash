"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"

interface AdminContextValue {
  isAdmin: boolean
  pin: string
  login: (pin: string) => void
  logout: () => void
}

const AdminContext = createContext<AdminContextValue>({
  isAdmin: false,
  pin: "",
  login: () => {},
  logout: () => {},
})

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [pin, setPin] = useState("")
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/bash/admin/me", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { isAdmin: false }))
      .then((data) => { if (!cancelled) setHasSession(!!data.isAdmin) })
      .catch(() => { /* leave hasSession false */ })
    return () => { cancelled = true }
  }, [])

  const login = useCallback((newPin: string) => {
    setPin(newPin)
  }, [])

  const logout = useCallback(async () => {
    setPin("")
    setHasSession(false)
    try {
      await fetch("/api/bash/admin/logout", { method: "POST", credentials: "same-origin" })
    } catch { /* ignore */ }
  }, [])

  const isAdmin = !!pin || hasSession

  return (
    <AdminContext.Provider value={{ isAdmin, pin, login, logout }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  return useContext(AdminContext)
}
