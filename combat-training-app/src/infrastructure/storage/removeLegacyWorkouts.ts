const LEGACY_KEYS = ['combat-training.workout-plans', 'combat-training.workout-sessions']
const CLEANUP_KEY = 'combat-training.firestore-migration'

/** Demo data is discarded, never imported into an account (D2). Retry if storage was unavailable. */
export function removeLegacyWorkouts(storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): void {
  try {
    const legacyStorage = storage ?? window.localStorage
    if (legacyStorage.getItem(CLEANUP_KEY) === '1') return
    for (const key of LEGACY_KEYS) legacyStorage.removeItem(key)
    legacyStorage.setItem(CLEANUP_KEY, '1')
  } catch {
    // Blocked browser storage must not prevent loading account data from Firestore.
  }
}
