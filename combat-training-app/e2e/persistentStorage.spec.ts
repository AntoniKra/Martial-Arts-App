import { test, expect } from './fixtures'

declare global {
  interface Window { persistCalls?: number }
}

test('asks the browser to keep site storage once after a verified sign-in, not on the login screen', async ({ app, page }) => {
  await page.addInitScript(() => {
    window.persistCalls = 0
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { persisted: async () => false, persist: async () => { window.persistCalls = (window.persistCalls ?? 0) + 1; return true } },
    })
  })
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Zaloguj się', exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.persistCalls)).toBe(0)
  await app.open('/workouts')
  await expect(page.getByRole('heading', { name: 'Treningi', exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.persistCalls)).toBe(1)
})
