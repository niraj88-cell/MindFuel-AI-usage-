// SatyaShift — the one place a measured duration is formatted.
//
// Durations are the product's currency (verified time, day totals, where the time went),
// and a measured value must read the same way on every surface. Before this module four
// pages each carried a private copy and they had drifted (padded vs unpadded minutes),
// so the same concept showed two faces. Two forms only:
//   human(8040) -> "2h 14m" · human(2700) -> "45m" · human(0) -> "0m"   headline + rows
//   clock(8040) -> "2:14"   · clock(480)  -> "0:08"                     dense tabular cells
//
// Deliberately NOT the running screen's coarse elapsed ("just started", half-hour bands)
// or the widget's presence line — those express live presence, not a total, and stay put.

export function human(totalSeconds: number): string {
  const m = Math.round(Math.max(0, totalSeconds) / 60)
  const h = Math.floor(m / 60)
  const mm = m % 60
  return h === 0 ? `${mm}m` : `${h}h ${mm}m`
}

export function clock(totalSeconds: number): string {
  const m = Math.round(Math.max(0, totalSeconds) / 60)
  const h = Math.floor(m / 60)
  return `${h}:${String(m % 60).padStart(2, '0')}`
}
