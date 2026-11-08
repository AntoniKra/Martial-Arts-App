const LEGACY_KEYS = ['combat-training.workout-plans', 'combat-training.workout-sessions']
const CLEANUP_KEY = 'combat-training.firestore-migration'

/** Demo data is discarded, never imported into an account (D2). Retry if storage was unavailable. */
export function removeLegacyWorkouts(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): void {
  if (storage.getItem(CLEANUP_KEY) === '1') return
  for (const key of LEGACY_KEYS) storage.removeItem(key)
  storage.setItem(CLEANUP_KEY, '1')
}
