interface EndWarningOptions {
  previousRemainingMs: number | null
  remainingMs: number
  stepDurationMs: number
  running: boolean
  enabled: boolean
}

/** Compare exact deadline-based samples, never the rounded display or a tick count. */
export function shouldPlayEndWarning({
  previousRemainingMs, remainingMs, stepDurationMs, running, enabled,
}: EndWarningOptions): boolean {
  return enabled && running && stepDurationMs > 30_000 &&
    previousRemainingMs !== null && previousRemainingMs > 10_000 &&
    remainingMs <= 10_000 && remainingMs >= 7_000
}
