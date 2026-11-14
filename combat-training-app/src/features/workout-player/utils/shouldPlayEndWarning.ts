interface EndWarningOptions {
  previousRemainingMs: number | null
  remainingMs: number
  stepDurationMs: number
  running: boolean
  warningSeconds: number | null
}

/** Compare exact deadline-based samples, never the rounded display or a tick count. */
export function shouldPlayEndWarning({
  previousRemainingMs, remainingMs, stepDurationMs, running, warningSeconds,
}: EndWarningOptions): boolean {
  if (warningSeconds === null) return false
  const thresholdMs = warningSeconds * 1000
  return running && stepDurationMs >= thresholdMs &&
    previousRemainingMs !== null && previousRemainingMs > thresholdMs &&
    remainingMs <= thresholdMs && remainingMs >= thresholdMs - 3000
}
