export type PerformanceEvent =
  | { type: 'save-click'; at: number }
  | { type: 'save'; id: string; at: number }
  | { type: 'snapshot'; at: number; ids: ReadonlySet<string>; pendingIds: ReadonlySet<string>; hasPendingWrites: boolean; fromCache: boolean }
  | { type: 'save-error'; id: string }
  | { type: 'unsubscribe' }

declare global {
  interface Window { combatPerformanceObserver?: (event: PerformanceEvent) => void }
}

export function hasPerformanceObserver(): boolean {
  return typeof window !== 'undefined' && Boolean(window.combatPerformanceObserver)
}

/** Optional diagnostics must never change the outcome of a workout write. */
export function reportPerformanceEvent(event: PerformanceEvent): void {
  try { window.combatPerformanceObserver?.(event) } catch { /* Diagnostics are best effort. */ }
}
