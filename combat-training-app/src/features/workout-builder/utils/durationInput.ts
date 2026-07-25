export function parseRequiredNonNegativeInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null
  }

  const parsed = Number(value)

  if (!Number.isSafeInteger(parsed)) {
    return null
  }

  return parsed
}

export function computeDurationSeconds(
  minutesInput: string,
  secondsInput: string,
  allowZero: boolean,
): { seconds: number | null; error: string | null } {
  const minutes = parseRequiredNonNegativeInteger(minutesInput)
  const seconds = parseRequiredNonNegativeInteger(secondsInput)

  if (minutes === null || seconds === null) {
    return { seconds: null, error: 'Minuty i sekundy muszą być liczbami całkowitymi od 0.' }
  }

  if (seconds > 59) {
    return { seconds: null, error: 'Sekundy muszą być w zakresie od 0 do 59.' }
  }

  const totalSeconds = minutes * 60 + seconds

  if (!Number.isSafeInteger(totalSeconds)) {
    return { seconds: null, error: 'Minuty i sekundy muszą być liczbami całkowitymi od 0.' }
  }

  if (!allowZero && totalSeconds <= 0) {
    return { seconds: null, error: 'Łączny czas musi być większy od 0.' }
  }

  if (allowZero && totalSeconds < 0) {
    return { seconds: null, error: 'Czas nie może być ujemny.' }
  }

  return { seconds: totalSeconds, error: null }
}
