const workoutSessionDateFormatter = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'short',
})

const workoutSessionTimeFormatter = new Intl.DateTimeFormat('pl-PL', {
  hour: '2-digit',
  minute: '2-digit',
})

export function formatWorkoutSessionDatePl(isoTimestamp: string): string {
  return workoutSessionDateFormatter.format(new Date(isoTimestamp))
}

export function formatWorkoutSessionTimePl(isoTimestamp: string): string {
  return workoutSessionTimeFormatter.format(new Date(isoTimestamp))
}

export function formatActiveDurationSecondsPl(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `${totalSeconds} s`
  }

  const minutes = Math.ceil(totalSeconds / 60)
  return `${minutes} min`
}
