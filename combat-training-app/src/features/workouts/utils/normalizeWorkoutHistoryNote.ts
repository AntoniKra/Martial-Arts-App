export function normalizeWorkoutHistoryNote(value: string): string | null {
  const trimmed = value.trim()

  if (trimmed.length === 0) {
    return null
  }

  return trimmed
}
