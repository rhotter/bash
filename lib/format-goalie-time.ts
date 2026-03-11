/** Format total seconds as "MM:SS" */
export function formatGoalieTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}
