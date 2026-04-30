export function canonicalizePlayerName(name: string): string {
  return name
    .replace(/[\u2018\u2019]/g, "'")
    .trim()
    .replace(/\s+/g, " ")
}

export function normalizePlayerName(name: string): string {
  return canonicalizePlayerName(name).toLowerCase()
}
