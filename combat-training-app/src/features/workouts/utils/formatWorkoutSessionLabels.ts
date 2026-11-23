const workoutSessionDateFormatter = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'short',
})

const workoutCalendarDateFormatter = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})
const workoutSessionTimeFormatters = new Map<string, Intl.DateTimeFormat>()

export function formatWorkoutSessionDatePl(isoTimestamp: string): string {
  return isoTimestamp.length === 10
    ? workoutCalendarDateFormatter.format(new Date(`${isoTimestamp}T12:00:00Z`))
    : workoutSessionDateFormatter.format(new Date(isoTimestamp))
}

export function formatWorkoutSessionTimePl(isoTimestamp: string, timeZone: string, deviceTimeZone: string): string {
  const showTimeZone = timeZone !== deviceTimeZone
  const key = `${timeZone}:${showTimeZone}`
  let formatter = workoutSessionTimeFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('pl-PL', {
      hour: '2-digit', minute: '2-digit', timeZone, timeZoneName: showTimeZone ? 'short' : undefined,
    })
    workoutSessionTimeFormatters.set(key, formatter)
  }
  return formatter.format(new Date(isoTimestamp))
}

export function formatActiveDurationSecondsPl(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `${totalSeconds} s`
  }

  const minutes = Math.ceil(totalSeconds / 60)
  return `${minutes} min`
}
