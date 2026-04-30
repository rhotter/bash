import { describe, expect, it } from "vitest"
import { canonicalizePlayerName, normalizePlayerName } from "@/lib/player-name"

describe("player-name helpers", () => {
  it("canonicalizes whitespace and smart apostrophes", () => {
    expect(canonicalizePlayerName("  Pat   O\u2019Brien  ")).toBe("Pat O'Brien")
  })

  it("normalizes case on top of canonicalization", () => {
    expect(normalizePlayerName("  PAT   O\u2019BRIEN  ")).toBe("pat o'brien")
  })
})
