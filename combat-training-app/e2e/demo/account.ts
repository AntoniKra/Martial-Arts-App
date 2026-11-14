import { expect, type APIRequestContext } from '@playwright/test'
import { testPassword } from '../authEmulator'

export async function createDemoAccount(request: APIRequestContext, variant: string) {
  const identity = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1'
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
  return { email, password: testPassword, uid: localId }
}
