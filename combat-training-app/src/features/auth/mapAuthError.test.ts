import { expect, it } from 'vitest'
import { authLabels as labels } from './authLabels'
import { mapAuthError } from './mapAuthError'

it.each([
  ['auth/invalid-credential', labels.errors.invalidCredential],
  ['auth/email-already-in-use', labels.errors.emailInUse],
  ['auth/weak-password', labels.weakPassword],
  ['auth/too-many-requests', labels.errors.tooManyRequests],
  ['auth/network-request-failed', labels.errors.network],
  ['auth/user-disabled', labels.errors.disabled],
  ['auth/account-exists-with-different-credential', labels.errors.accountUsesPassword],
  ['auth/popup-blocked', labels.errors.popupBlocked],
  ['auth/unauthorized-domain', labels.errors.googleUnavailable],
  ['auth/operation-not-allowed', labels.errors.googleUnavailable],
  ['auth/web-storage-unsupported', labels.errors.storageBlocked],
  ['auth/unexpected', labels.errors.unknown],
])('maps %s without exposing backend messages', (code, message) => {
  expect(mapAuthError({ code, message: 'Private backend details' })).toBe(message)
})
it.each(['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/redirect-cancelled-by-user', 'auth/user-cancelled'])(
  'shows no message when the user cancels Google sign-in (%s)', (code) => {
    expect(mapAuthError({ code })).toBeNull()
  },
)
it.each([null, 'failure', new Error('Private details')])('handles an unknown error %j', (error) => {
  expect(mapAuthError(error)).toBe(labels.errors.unknown)
})
it('does not reveal whether a login address exists', () => {
  expect(mapAuthError({ code: 'auth/user-not-found' })).toBe(mapAuthError({ code: 'auth/wrong-password' }))
})
