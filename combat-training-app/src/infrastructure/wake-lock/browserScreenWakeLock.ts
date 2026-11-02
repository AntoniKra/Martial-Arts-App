import type { ScreenWakeLockService } from '@/application/wake-lock/screenWakeLock'

function release(sentinel: WakeLockSentinel): void {
  try {
    void sentinel.release().catch(() => {})
  } catch {
    // Releasing an already revoked lock is best effort.
  }
}

export function createBrowserScreenWakeLock(): ScreenWakeLockService {
  let active = false
  let generation = 0
  let pendingGeneration: number | null = null
  let sentinel: WakeLockSentinel | null = null

  function releaseCurrent(): void {
    const previous = sentinel
    sentinel = null
    if (previous !== null) {
      release(previous)
    }
  }

  async function acquire(): Promise<void> {
    if (!active || typeof navigator === 'undefined' || !navigator.wakeLock ||
        typeof document === 'undefined' || document.visibilityState !== 'visible' ||
        pendingGeneration === generation || (sentinel !== null && !sentinel.released)) {
      return
    }

    const requestedGeneration = generation
    pendingGeneration = requestedGeneration

    try {
      const acquired = await navigator.wakeLock.request('screen')

      if (!active || generation !== requestedGeneration || document.visibilityState !== 'visible') {
        release(acquired)
        return
      }

      sentinel = acquired
      acquired.addEventListener('release', () => {
        if (sentinel === acquired) {
          sentinel = null
        }
      }, { once: true })
    } catch {
      // Unsupported contexts, permission denial and low battery are silent fallbacks.
    } finally {
      if (pendingGeneration === requestedGeneration) {
        pendingGeneration = null
      }
    }
  }

  function handleVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      void acquire()
    } else {
      generation += 1
      pendingGeneration = null
      releaseCurrent()
    }
  }

  return {
    activate() {
      if (active || typeof document === 'undefined') {
        return
      }

      active = true
      document.addEventListener('visibilitychange', handleVisibilityChange)
      void acquire()
    },
    dispose() {
      active = false
      generation += 1
      pendingGeneration = null
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
      releaseCurrent()
    },
  }
}
