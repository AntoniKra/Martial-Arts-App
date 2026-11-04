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
  ['auth/unexpected', labels.errors.unknown],
])('maps %s without exposing backend messages', (code, message) => {
  expect(mapAuthError({ code, message: 'Private backend details' })).toBe(message)
})
it.each([null, 'failure', new Error('Private details')])('handles an unknown error %j', (error) => {
  expect(mapAuthError(error)).toBe(labels.errors.unknown)
})
it('does not reveal whether a login address exists', () => {
  expect(mapAuthError({ code: 'auth/user-not-found' })).toBe(mapAuthError({ code: 'auth/wrong-password' }))
})
