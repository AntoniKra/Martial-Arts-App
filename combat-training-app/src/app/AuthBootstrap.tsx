import { useState, type PropsWithChildren } from 'react'
import type { AuthService } from '@/application/auth/authService'
import { AuthFrame } from '@/features/auth/AuthFrame'
import { authLabels } from '@/features/auth/authLabels'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { readFirebaseConfig } from '@/infrastructure/firebase/firebaseConfig'
import { createFirebaseAuthService } from '@/infrastructure/firebase/firebaseAuthService'

// Initialize once outside React's StrictMode double render. Failed configuration never starts Auth.
let service: AuthService | undefined
function getService(): AuthService | null {
  try {
    service ??= createFirebaseAuthService(readFirebaseConfig(import.meta.env))
    return service
  } catch { return null }
}

export function AuthBootstrap({ children }: PropsWithChildren) {
  const [auth] = useState(getService)
  if (!auth) return <AuthFrame title={authLabels.configurationTitle}><p role="alert">{authLabels.configurationError}</p></AuthFrame>
  return <AuthProvider service={auth}>{children}</AuthProvider>
}
