export type PersistentStorageResult = 'persisted' | 'denied' | 'unsupported' | 'error'

/** The part of the browser StorageManager this module needs; injected so it can be tested. */
export interface PersistableStorage {
  persisted?: () => Promise<boolean>
  persist?: () => Promise<boolean>
}

/**
 * Asks the browser not to evict this site's storage (IndexedDB with the session and, later, the
 * Firestore cache). ADR 0004: Safari may clear site data after 7 days without a visit. Never throws.
 */
export async function requestPersistentStorage(storage: PersistableStorage | undefined): Promise<PersistentStorageResult> {
  if (typeof storage?.persist !== 'function' || typeof storage.persisted !== 'function') return 'unsupported'
  try {
    if (await storage.persisted()) return 'persisted'
    return (await storage.persist()) ? 'persisted' : 'denied'
  } catch {
    return 'error'
  }
}
