export function formatSecondsAsClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function formatEstimatedDuration(totalSeconds: number): string {
  if (totalSeconds < 3600) {
    return formatSecondsAsClock(totalSeconds)
  }

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (minutes === 0) {
    return `${hours} h`
  }

  return `${hours} h ${minutes} min`
}
