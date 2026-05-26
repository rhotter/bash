// League-wide game rules. Use these instead of inlining magic numbers at call sites.

// Fallback used when a season row is missing a `game_length` (e.g. legacy data).
// The schema default is 60; this matches it.
export const DEFAULT_GAME_LENGTH_MIN = 60

export const SECONDS_PER_MINUTE = 60

// GAA = goals_against / seconds_played * (game_length_min * 60).
// Centralized so the formula stays in lock-step with how seconds are tracked.
export function computeGaa(goalsAgainst: number, seconds: number, gameLengthMin: number = DEFAULT_GAME_LENGTH_MIN): number {
  if (seconds <= 0) return 0
  return (goalsAgainst / seconds) * (gameLengthMin * SECONDS_PER_MINUTE)
}
