import { useEffect } from 'react'
import { useAuth } from '@/features/auth/authContext'
import { requestPersistentStorage } from '@/infrastructure/storage/persistentStorage'

// Once per page load, after a verified sign-in, so Firefox shows its storage prompt inside the app and not on the login screen.
let requested = false

/** ADR 0004: asks the browser to keep this site's storage, so the session and offline data survive eviction. */
export function PersistentStorageOnSignIn() {
  const { state } = useAuth()
  const verified = state.status === 'ready' && state.session?.emailVerified === true
  useEffect(() => {
    if (!verified || requested) return
    requested = true
    void requestPersistentStorage(navigator.storage)
  }, [verified])
  return null
}
