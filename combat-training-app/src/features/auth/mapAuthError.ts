import { authLabels } from './authLabels'

export function mapAuthError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-email': return authLabels.errors.invalidCredential
    case 'auth/email-already-in-use': return authLabels.errors.emailInUse
    case 'auth/weak-password': return authLabels.weakPassword
    case 'auth/too-many-requests': return authLabels.errors.tooManyRequests
    case 'auth/network-request-failed': return authLabels.errors.network
    case 'auth/user-disabled': return authLabels.errors.disabled
    default: return authLabels.errors.unknown
  }
}
