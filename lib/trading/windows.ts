// Trading window is defined as a single daily UTC time-of-day slot:
// [windowStartTime, windowStartTime + windowDurationMinutes).
export function isWithinWindow(windowStartTime: string, windowDurationMinutes: number): boolean {
  const [h, m] = windowStartTime.split(':').map(Number)
  const now = new Date()
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m, 0))
  const windowEnd = new Date(windowStart.getTime() + windowDurationMinutes * 60_000)
  return now >= windowStart && now < windowEnd
}

export function getTodaysWindowStart(windowStartTime: string): Date {
  const [h, m] = windowStartTime.split(':').map(Number)
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m, 0))
}
