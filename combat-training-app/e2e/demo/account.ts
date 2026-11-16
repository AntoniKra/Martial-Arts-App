import { expect, type APIRequestContext } from '@playwright/test'
import { testPassword } from '../authEmulator'
import { assertDemoTarget, demoAuthOrigin, demoProjectId } from './emulator'

export async function createDemoAccount(request: APIRequestContext, variant: string) {
  assertDemoTarget(demoProjectId, demoAuthOrigin)
  const identity = `${demoAuthOrigin}/identitytoolkit.googleapis.com/v1`
  const email = `pokaz-${variant}@example.test`
  const created = await request.post(`${identity}/accounts:signUp?key=demo-config`, {
    data: { email, password: testPassword, returnSecureToken: true },
  })
  expect(created.ok()).toBe(true)
  const { localId } = await created.json() as { localId: string }
  const verified = await request.post(`${identity}/projects/demo-combat-training/accounts:update`, {
    headers: { Authorization: 'Bearer owner' }, data: { localId, emailVerified: true },
  })
  expect(verified.ok()).toBe(true)
  // A fresh token carries email_verified, so fixture writes exercise the real rules.
  const signedIn = await request.post(`${identity}/accounts:signInWithPassword?key=demo-config`, {
    data: { email, password: testPassword, returnSecureToken: true },
  })
  expect(signedIn.ok()).toBe(true)
  const { idToken } = await signedIn.json() as { idToken: string }
  return { email, password: testPassword, uid: localId, idToken }
}
