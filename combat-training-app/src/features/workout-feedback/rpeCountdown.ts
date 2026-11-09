export function rpeRemainingSeconds(completedAt: string, now: number): number {
  return Math.max(0, Math.ceil((Date.parse(completedAt) + 10 * 60_000 - now) / 1000))
}

/** Re-read the clock on visibilitychange; browsers may suspend interval callbacks. */
export function startRpeCountdown(completedAt: string, onTick: (seconds: number) => void, onDue: () => void) {
  let announced = false
  const refresh = () => {
    const remaining = rpeRemainingSeconds(completedAt, Date.now())
    onTick(remaining)
    if (remaining === 0 && !announced) {
      announced = true
      onDue()
    }
  }
  refresh()
  const timer = setInterval(refresh, 1000)
  const deadlineTimer = setTimeout(refresh, Math.max(0, Date.parse(completedAt) + 10 * 60_000 - Date.now()))
  return { refresh, dispose: () => { clearInterval(timer); clearTimeout(deadlineTimer) } }
}
