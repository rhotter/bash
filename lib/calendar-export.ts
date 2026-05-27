/**
 * Client-side iCalendar (.ics) generation and download utility.
 */

export interface CalendarEventInput {
  id: string
  date: string // "YYYY-MM-DD"
  time: string // "9:00pm", "14:00", or "TBD"
  homeTeam: string
  awayTeam: string
  location?: string | null
  seasonLocation?: string | null
  title?: string | null
  seasonName?: string
}

function formatLocalICSDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")
  return `${year}${month}${day}T${hours}${minutes}${seconds}`
}

function formatAllDayDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}${month}${day}`
}

export function generateICS(events: CalendarEventInput[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bay Area Street Hockey//BASH Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ]

  const now = new Date()
  const stamp = formatLocalICSDate(now) + "Z" // UTC stamp

  for (const event of events) {
    const isTBD = event.time === "TBD"
    const [y, m, d] = event.date.split("-").map(Number)
    
    let dtStartLine: string
    let dtEndLine: string

    if (isTBD) {
      // All-day event
      const startDate = new Date(y, m - 1, d)
      const endDate = new Date(y, m - 1, d + 1) // Ends on the next day
      dtStartLine = `DTSTART;VALUE=DATE:${formatAllDayDate(startDate)}`
      dtEndLine = `DTEND;VALUE=DATE:${formatAllDayDate(endDate)}`
    } else {
      // Fixed time game (Floating local time)
      // Parse time string: handles "14:00", "9:00p", "9:00pm", "9:00 PM", etc.
      let h: number, min: number
      const ampmMatch = event.time.match(/^(\d{1,2}):(\d{2})\s*(a|am|p|pm)$/i)
      if (ampmMatch) {
        h = parseInt(ampmMatch[1], 10)
        min = parseInt(ampmMatch[2], 10)
        const isPM = ampmMatch[3].toLowerCase().startsWith("p")
        if (isPM && h !== 12) h += 12
        else if (!isPM && h === 12) h = 0
      } else {
        ;[h, min] = event.time.split(":").map(Number)
      }
      const startDate = new Date(y, m - 1, d, h, min, 0)
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000) // Default: 1 hour duration
      dtStartLine = `DTSTART:${formatLocalICSDate(startDate)}`
      dtEndLine = `DTEND:${formatLocalICSDate(endDate)}`
    }

    const summary = event.title 
      ? event.title 
      : `BASH: ${event.awayTeam} @ ${event.homeTeam}`
    
    const location = event.seasonLocation
    if (!location || !location.trim()) {
      throw new Error(`Location is not provided for season: ${event.seasonName || "unknown"}`)
    }
    const description = event.seasonName ? `BASH - ${event.seasonName}` : "BASH"

    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@bayareastreethockey.com`,
      `DTSTAMP:${stamp}`,
      dtStartLine,
      dtEndLine,
      `SUMMARY:${summary.replace(/[,;]/g, "\\$&")}`,
      `LOCATION:${location.replace(/[,;]/g, "\\$&")}`,
      `DESCRIPTION:${description.replace(/[,;]/g, "\\$&")}`,
      "END:VEVENT"
    )
  }

  lines.push("END:VCALENDAR")
  return lines.join("\r\n")
}

export function downloadICS(events: CalendarEventInput[], filename: string) {
  if (events.length === 0) return
  const icsContent = generateICS(events)
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement("a")
  link.href = url
  link.setAttribute("download", filename.endsWith(".ics") ? filename : `${filename}.ics`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
