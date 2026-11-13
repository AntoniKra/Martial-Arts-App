import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'
import { createVerifiedAccount, signIn } from './authEmulator'

const logout = (page: Page) => page.getByRole('button', { name: 'Wyloguj', exact: true })
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Wylogować się?', exact: true })
const pending = (page: Page) => page.getByText('Czeka na wysłanie', { exact: true })
const firestoreDatabases = (page: Page) => page.evaluate(async () =>
  (await indexedDB.databases()).map(({ name }) => name).filter((name) => name?.startsWith('firestore/')))

// Set the playback date before subscribing. Changing weeks during a frozen clock
// would resubscribe the week query and temporarily disable the sign-out button.
test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date('2026-11-03T09:00:00Z')) })

test.describe('offline with the PWA cache', () => {
  // Lazy routes need the same precache used by the installed application.
  test.use({ serviceWorkers: 'allow' })

  test('warns about an offline deletion, retains it after cancellation and signs out without warning after sync', async ({ app, page, context }) => {
    await app.createPlan('Wpis do usuniecia offline')
    await app.openPlayer()
    await app.finishWorkout()
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)
    await page.getByRole('link', { name: 'Wróć do planu', exact: true }).click()
    await page.getByRole('link', { name: 'Treningi', exact: true }).click()
    await page.getByRole('radio', { name: 'Historia', exact: true }).check()
    await expect(pending(page)).toHaveCount(0)
    expect(await app.readSessions()).toHaveLength(1)

    await context.setOffline(true)
    await page.getByRole('button', { name: 'Usuń wpis', exact: true }).click()
    await page.getByRole('button', { name: 'Usuń', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Brak ukończonych treningów', exact: true })).toBeVisible()
    // Deleted documents disappear from query snapshots, including their pending metadata.
    await expect(pending(page)).toHaveCount(0)
    expect(await app.readSessions()).toHaveLength(1)
    // Observe the short write check in the browser, without a runner round trip.
    expect(await logout(page).evaluate(async (button: HTMLButtonElement) => {
      button.click()
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      return button.disabled
    })).toBe(true)
    await expect(dialog(page)).toBeVisible()
    const cancel = dialog(page).getByRole('button', { name: 'Anuluj', exact: true })
    await expect(cancel).toBeFocused()
    await cancel.click()
    await expect(dialog(page)).not.toBeVisible()
    await expect(logout(page)).toBeFocused()
    expect(await app.readSessions()).toHaveLength(1)

    await context.setOffline(false)
    await expect.poll(async () => (await app.readSessions()).length).toBe(0)
    await logout(page).click()
    await expect(page.getByRole('heading', { name: 'Zaloguj się', exact: true })).toBeVisible()
    expect(await firestoreDatabases(page)).toEqual([])
  })

  for (const theme of ['dark', 'light'] as const) {
    test(`warns about an offline workout, cancels safely and clears the cache on confirmation in ${theme}`, async ({ app, page, context }, testInfo) => {
      await app.createPlan('Trening przed wylogowaniem')
      await app.setTheme(theme)
      await app.openPlayer()
      await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)
      await context.setOffline(true)
      await app.finishWorkout()
      expect(await app.readSessions()).toHaveLength(0)
      await page.getByRole('link', { name: 'Wróć do planu', exact: true }).click()
      await page.getByRole('link', { name: 'Treningi', exact: true }).click()
      await page.getByRole('radio', { name: 'Historia', exact: true }).check()
      await expect(pending(page)).toBeVisible()
      expect(await firestoreDatabases(page)).not.toEqual([])

      await logout(page).click()
      await expect(dialog(page)).toBeVisible()
      await expect(dialog(page)).toHaveAccessibleDescription('Masz dane, które nie zostały jeszcze wysłane. Po wylogowaniu przepadną.')
      const cancel = dialog(page).getByRole('button', { name: 'Anuluj', exact: true })
      const confirm = dialog(page).getByRole('button', { name: 'Wyloguj mimo to', exact: true })
      await expect(cancel).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(confirm).toBeFocused()
      await page.keyboard.press('Shift+Tab')
      await expect(cancel).toBeFocused()
      await page.evaluate(() => document.fonts.ready)
      if (testInfo.project.name === 'phone') {
        const path = testInfo.outputPath(`sign-out-${theme}-360x800.png`)
        await page.screenshot({ path })
        await testInfo.attach(`sign-out-${theme}`, { path, contentType: 'image/png' })
      }
      expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) =>
        impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])

      await cancel.click()
      await expect(dialog(page)).not.toBeVisible()
      await expect(logout(page)).toBeFocused()
      await expect(pending(page)).toBeVisible()
      await logout(page).click()
      await page.keyboard.press('Escape')
      await expect(dialog(page)).not.toBeVisible()
      await expect(logout(page)).toBeFocused()
      await expect(pending(page)).toBeVisible()

      await logout(page).click()
      await confirm.click()
      await expect(page.getByRole('heading', { name: 'Zaloguj się', exact: true })).toBeVisible()
      expect(await firestoreDatabases(page)).toEqual([])
      await context.setOffline(false)
      expect(await app.readSessions()).toHaveLength(0)
    })
  }
})

test('signs out without a warning after sync and keeps the next account isolated offline', async ({ app, page, context }) => {
  await app.createPlan('Dane poprzedniego konta')
  await app.openPlayer()
  await app.finishWorkout()
  await page.getByRole('link', { name: 'Wróć do planu', exact: true }).click()
  await page.getByRole('link', { name: 'Treningi', exact: true }).click()
  await page.getByRole('radio', { name: 'Historia', exact: true }).check()
  await expect(pending(page)).toHaveCount(0)
  expect(await firestoreDatabases(page)).not.toEqual([])
  await logout(page).click()
  await expect(page.getByRole('heading', { name: 'Zaloguj się', exact: true })).toBeVisible()
  expect(await firestoreDatabases(page)).toEqual([])
  expect(await app.readSessions()).toHaveLength(1)

  const second = await createVerifiedAccount(page.request)
  await signIn(page, second)
  await expect(logout(page)).toBeVisible()
  await context.setOffline(true)
  await page.getByRole('link', { name: 'Treningi', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Brak zapisanych planów', exact: true })).toBeVisible()
  await page.getByRole('radio', { name: 'Historia', exact: true }).check()
  await expect(page.getByRole('heading', { name: 'Brak ukończonych treningów', exact: true })).toBeVisible()
  await expect(page.getByText('Dane poprzedniego konta', { exact: true })).toHaveCount(0)
  await logout(page).click()
  await expect(page.getByRole('heading', { name: 'Zaloguj się', exact: true })).toBeVisible()
  expect(await firestoreDatabases(page)).toEqual([])
})

test('also warns about a plan edited offline without a pending workout session', async ({ app, page, context }) => {
  await app.createPlan('Plan przed zmiana')
  await page.getByRole('link', { name: 'Edytuj plan', exact: true }).click()
  await page.getByRole('textbox', { name: 'Nazwa planu' }).fill('Plan po zmianie offline')
  await context.setOffline(true)
  await app.savePlan()
  await logout(page).click()
  await expect(dialog(page)).toBeVisible()
  await dialog(page).getByRole('button', { name: 'Anuluj', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Plan po zmianie offline', exact: true })).toBeVisible()
  expect(await app.readSessions()).toHaveLength(0)
})

test.describe('persisted pending workouts', () => {
  test.use({ serviceWorkers: 'allow' })

  test('restores the warning after an offline reload and sends the retained workout after cancellation', async ({ app, page, context }) => {
    await app.createPlan('Trening po przeladowaniu')
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)
    await app.openPlayer()
    await context.setOffline(true)
    await app.finishWorkout()
    await page.getByRole('link', { name: 'Wróć do planu', exact: true }).click()
    await page.getByRole('link', { name: 'Treningi', exact: true }).click()
    await page.getByRole('radio', { name: 'Historia', exact: true }).check()
    await expect(pending(page)).toBeVisible()
    await page.reload()
    await logout(page).click()
    await expect(dialog(page)).toBeVisible()
    await dialog(page).getByRole('button', { name: 'Anuluj', exact: true }).click()
    await page.getByRole('radio', { name: 'Historia', exact: true }).check()
    await expect(pending(page)).toBeVisible()
    expect(await app.readSessions()).toHaveLength(0)
    await context.setOffline(false)
    await expect.poll(async () => (await app.readSessions()).length).toBe(1)
    await expect(pending(page)).toHaveCount(0)
    await logout(page).click()
    await expect(page.getByRole('heading', { name: 'Zaloguj się', exact: true })).toBeVisible()
    expect(await firestoreDatabases(page)).toEqual([])
  })
})
