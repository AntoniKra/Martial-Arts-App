import * as z from 'zod/mini'

const redirectKey = 'combat-training.accountDeletionRedirect'
const markerSchema = z.strictObject({ uid: z.string().check(z.minLength(1)), step: z.literal('reauthenticated-pending') })

export function markDeletionRedirect(uid: string, storage: Storage = sessionStorage) {
  storage.setItem(redirectKey, JSON.stringify({ uid, step: 'reauthenticated-pending' }))
}
export function clearDeletionRedirect(storage: Storage = sessionStorage) { storage.removeItem(redirectKey) }
/** Called only after AuthProvider has settled its single redirect result. */
export function resumeDeletionRedirect(uid: string, operation: string | null, storage: Storage = sessionStorage): boolean {
  const raw = storage.getItem(redirectKey)
  clearDeletionRedirect(storage)
  try {
    const result = markerSchema.safeParse(JSON.parse(raw ?? 'null'))
    return result.success && result.data.uid === uid && operation === 'reauthenticate'
  } catch { return false }
}
export function clearAccountLocalStorage(uid: string, storage: Storage = localStorage) {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
  for (const key of keys) {
    if (key?.startsWith('combat-training.') && key.endsWith(`.${uid}`)) storage.removeItem(key)
  }
}
