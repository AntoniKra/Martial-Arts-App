import { authLabels } from './authLabels'

/** Returns a Polish message, or null when the user cancelled and nothing should be shown. */
export function mapAuthError(error: unknown): string | null {
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
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/redirect-cancelled-by-user':
    case 'auth/user-cancelled': return null
    case 'auth/account-exists-with-different-credential': return authLabels.errors.accountUsesPassword
    case 'auth/popup-blocked': return authLabels.errors.popupBlocked
    case 'auth/unauthorized-domain':
    case 'auth/operation-not-allowed': return authLabels.errors.googleUnavailable
    case 'auth/web-storage-unsupported': return authLabels.errors.storageBlocked
    default: return authLabels.errors.unknown
  }
}
