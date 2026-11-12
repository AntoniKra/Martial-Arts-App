import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { test, expect } from './fixtures'
import { accountsWithEmail, createVerifiedAccount, signIn, signInWithFakeGoogle, uniqueEmail } from './authEmulator'

// A touch-first screen selects the redirect flow, the same one an installed PWA uses.
test.use({ hasTouch: true })

const googleButton = { name: 'Kontynuuj z Google', exact: true } as const

for (const theme of ['dark', 'light'] as const) {
  test(`offers Google on login and registration with a 44 px target in ${theme}`, async ({ page }, info) => {
    for (const screen of ['login', 'register'] as const) {
      await page.goto(`/${screen}`)
      const toggle = page.getByRole('button', { name: theme === 'light' ? 'Włącz jasny motyw' : 'Włącz ciemny motyw', exact: true })
      if (await toggle.isVisible()) await toggle.click()
      const box = await page.getByRole('button', googleButton).boundingBox()
      expect(box?.height).toBeGreaterThanOrEqual(44)
      expect(box?.width).toBeGreaterThanOrEqual(44)
      if (process.env.CAPTURE_SCREENSHOTS === '1' && info.project.name === 'phone') {
        const folder = path.resolve('docs/screenshots/issue-93')
        await mkdir(folder, { recursive: true })
        const file = path.join(folder, `${screen}-${theme}-360x800.png`)
        await page.evaluate(() => document.fonts.ready)
        await page.screenshot({ path: file, fullPage: true })
        await info.attach(`${screen}-${theme}`, { path: file, contentType: 'image/png' })
      }
    }
  })
}

test.describe('on a mouse-first screen', () => {
  test.use({ hasTouch: false })

  test('signs in with Google in a popup and keeps the app page', async ({ page, request }) => {
    const email = uniqueEmail()
    await page.goto('/login')
    const popupOpened = page.waitForEvent('popup')
    await page.getByRole('button', googleButton).click()
    const popup = await popupOpened
    await signInWithFakeGoogle(popup, email)
    await expect(page.getByRole('button', { name: 'Wyloguj', exact: true })).toBeEnabled()
    expect(await accountsWithEmail(request, email)).toEqual([{ uid: expect.any(String), providers: ['google.com'] }])
  })

  test('shows no error when the user closes the Google popup', async ({ page }) => {
    await page.goto('/login')
    const popupOpened = page.waitForEvent('popup')
    await page.getByRole('button', googleButton).click()
    await (await popupOpened).close()
    // The SDK polls for a closed popup and waits for a late result before it reports the cancellation.
    await expect(page.getByRole('button', googleButton)).toBeEnabled({ timeout: 15_000 })
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
})

test('registers with Google through a redirect and opens the app without email verification', async ({ page, request }) => {
  const email = uniqueEmail()
  await page.goto('/register')
  await page.getByRole('button', googleButton).click()
  await signInWithFakeGoogle(page, email)
  await expect(page.getByRole('button', { name: 'Wyloguj', exact: true })).toBeEnabled()
  await expect(page).not.toHaveURL(/\/(register|login|verify-email)$/)
  expect(await accountsWithEmail(request, email)).toEqual([{ uid: expect.any(String), providers: ['google.com'] }])
})

test('Google sign-in with an address registered by password keeps one account and its password', async ({ page, request }) => {
  const account = await createVerifiedAccount(request)
  await page.goto('/login')
  await page.getByRole('button', googleButton).click()
  await signInWithFakeGoogle(page, account.email)
  await expect(page.getByRole('button', { name: 'Wyloguj', exact: true })).toBeEnabled()
  const accounts = await accountsWithEmail(request, account.email)
  expect(accounts).toHaveLength(1)
  expect(accounts[0].uid).toBe(account.uid)
  await page.getByRole('button', { name: 'Wyloguj', exact: true }).click()
  await expect(page).toHaveURL('/login')
  await signIn(page, account)
  await expect(page.getByRole('button', { name: 'Wyloguj', exact: true })).toBeEnabled()
})

test('shows the password message when Firebase refuses Google for an address registered by password', async ({ page, request }) => {
  const account = await createVerifiedAccount(request)
  // The emulator always reports the Google address as verified, so it links instead of refusing.
  // Reproduce the production refusal for an unconfirmed Google address at the network boundary.
  await page.route('**/accounts:signInWithIdp**', (route) => route.fulfill({
    contentType: 'application/json',
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ needConfirmation: true, email: account.email, providerId: 'google.com', localId: account.uid }),
  }))
  await page.goto('/login')
  await page.getByRole('button', googleButton).click()
  await signInWithFakeGoogle(page, account.email)
  await expect(page).toHaveURL('/login')
  await expect(page.getByRole('alert')).toHaveText('Konto z tym adresem e-mail używa hasła. Zaloguj się adresem e-mail i hasłem.')
  expect(await accountsWithEmail(request, account.email)).toEqual([{ uid: account.uid, providers: ['password'] }])
})
