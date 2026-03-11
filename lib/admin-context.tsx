"use client"

import { createContext, useContext, useState, useCallback } from "react"

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

  const login = useCallback((newPin: string) => {
    setPin(newPin)
  }, [])

  const logout = useCallback(() => {
    setPin("")
  }, [])

  return (
    <AdminContext.Provider value={{ isAdmin: !!pin, pin, login, logout }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  return useContext(AdminContext)
}
