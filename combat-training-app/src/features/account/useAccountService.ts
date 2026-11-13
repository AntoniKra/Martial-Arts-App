import { useEffect, useState } from 'react'
import type { AccountService } from '@/application/account/accountService'
import { useAuth } from '@/features/auth/authContext'

export function useAccountService() {
  const { state } = useAuth()
  const uid = state.status === 'ready' ? state.session?.uid : undefined
  const [result, setResult] = useState<{ uid?: string; service?: AccountService; error?: boolean }>({})
  useEffect(() => {
    if (!uid) return
    let active = true
    void import('@/infrastructure/firebase/firebaseAccountService').then(({ createFirebaseAccountService }) => {
      const service = createFirebaseAccountService(uid)
      if (active) setResult({ uid, service })
    }).catch(() => { if (active) setResult({ uid, error: true }) })
    return () => { active = false }
  }, [uid])
  return result.uid === uid ? result : {}
}
