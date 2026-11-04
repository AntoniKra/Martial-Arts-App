import { randomUUID } from 'node:crypto'
import { expect, type APIRequestContext, type Page } from '@playwright/test'

const emulator = 'http://127.0.0.1:9099'
const identity = `${emulator}/identitytoolkit.googleapis.com/v1`
export const testPassword = 'E2e-test-only-2026'
export const uniqueEmail = () => `athlete-${randomUUID()}@example.test`

export async function createVerifiedAccount(request: APIRequestContext) {
  const email = uniqueEmail()
  const created = await request.post(`${identity}/accounts:signUp?key=demo-config`, {
    data: { email, password: testPassword, returnSecureToken: true },
  })
  expect(created.ok()).toBe(true)
  const { localId } = await created.json() as { localId: string }
  const verified = await request.post(`${identity}/projects/demo-combat-training/accounts:update`, {
    headers: { Authorization: 'Bearer owner' },
    data: { localId, emailVerified: true },
  })
  expect(verified.ok()).toBe(true)
  return { email, password: testPassword }
}

export async function signIn(page: Page, account: { email: string; password: string }) {
  await page.getByRole('textbox', { name: 'Adres e-mail', exact: true }).fill(account.email)
  await page.getByLabel('Hasło', { exact: true }).fill(account.password)
  await page.getByRole('button', { name: 'Zaloguj się', exact: true }).click()
}

export async function verificationLink(request: APIRequestContext, email: string) {
  const response = await request.get(`${emulator}/emulator/v1/projects/demo-combat-training/oobCodes`)
  expect(response.ok()).toBe(true)
  const { oobCodes } = await response.json() as { oobCodes: { email: string; requestType: string; oobLink: string }[] }
  const code = oobCodes.findLast((item) => item.email === email && item.requestType === 'VERIFY_EMAIL')
  if (!code || !code.oobLink.startsWith(`${emulator}/`)) throw new Error('Missing local verification link')
  return code.oobLink
}
