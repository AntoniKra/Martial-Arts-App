import AxeBuilder from '@axe-core/playwright'
import { test, expect, openProfile } from './fixtures'
import { createVerifiedAccount, signIn } from './authEmulator'

// Keep Firestore's week query in the playback week. Moving the date across weeks
// with an already mounted listener can disable sign-out while it resubscribes.
test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date('2026-11-03T09:00:00Z')) })

test('isolates two accounts in the same browser', async ({ app, page }) => {
  await app.createPlan('Plan pierwszego konta')
  await app.openPlayer()
  await app.finishWorkout()
  await page.getByRole('button', { name: 'Wstecz', exact: true }).click()
  await openProfile(page)
  await page.getByRole('button', { name: 'Wyloguj', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Zaloguj się', exact: true })).toBeVisible()
  const second = await createVerifiedAccount(page.request)
  await signIn(page, second)
  await expect(page.getByRole('heading', { name: 'Plan pierwszego konta', exact: true })).toHaveCount(0)
  await page.getByRole('navigation', { name: 'Główna nawigacja', exact: true }).getByRole('button', { name: 'Trening', exact: true }).click()
  await page.getByRole('dialog', { name: 'Nowy trening', exact: true }).getByRole('link', { name: /^Moje plany/ }).click()
  await expect(page.getByRole('heading', { name: 'Brak zapisanych planów', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Postęp', exact: true }).click()
  await page.getByRole('radio', { name: 'Historia', exact: true }).check()
  await expect(page.getByRole('heading', { name: 'Brak historii treningów', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Plan pierwszego konta', exact: true })).toHaveCount(0)
})

test.describe('offline with the PWA cache', () => {
  // Lazy routes need the same precache used by the installed application.
  test.use({ serviceWorkers: 'allow' })

  for (const theme of ['dark', 'light'] as const) {
    test(`queues a workout offline, displays pending status and sends it after reconnecting in ${theme}`, async ({ app, page, context }, testInfo) => {
      await app.createPlan('Trening bez sieci')
      await app.prepareOffline()
      await app.setTheme(theme)
      await app.openPlayer()
      await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)
      await context.setOffline(true)
      await app.finishWorkout()
      expect(await app.readSessions()).toHaveLength(0)
      await page.getByRole('button', { name: 'Wstecz', exact: true }).click()
      await page.getByRole('link', { name: 'Postęp', exact: true }).click()
      await page.getByRole('radio', { name: 'Historia', exact: true }).check()
      const history = page.getByRole('region', { name: 'Historia treningów', exact: true })
      await expect(history.getByText('Czeka na wysłanie', { exact: true })).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      if (process.env.CAPTURE_SCREENSHOTS === '1' && testInfo.project.name === 'phone') {
        const path = testInfo.outputPath(`pending-${theme}-360x800.png`)
        await page.screenshot({ path })
        await testInfo.attach(`pending-${theme}`, { path, contentType: 'image/png' })
      }
      expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) =>
        impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
      await page.clock.resume()
      await context.setOffline(false)
      await expect.poll(async () => (await app.readSessions()).length).toBe(1)
      await expect(history.getByText('Czeka na wysłanie', { exact: true })).toHaveCount(0)
      await page.reload()
      await page.getByRole('radio', { name: 'Historia', exact: true }).check()
      await expect(history.getByRole('heading', { name: 'Trening bez sieci', exact: true })).toBeVisible()
    })
  }
})
