import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'
import { createVerifiedAccount, signIn } from './authEmulator'

test('isolates two accounts in the same browser', async ({ app, page }) => {
  await app.createPlan('Plan pierwszego konta')
  await app.openPlayer()
  await app.finishWorkout()
  await page.getByRole('link', { name: 'Wróć do planu', exact: true }).click()
  await page.getByRole('button', { name: 'Wyloguj', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Zaloguj się', exact: true })).toBeVisible()
  const second = await createVerifiedAccount(page.request)
  await signIn(page, second)
  await expect(page.getByRole('heading', { name: 'Plan pierwszego konta', exact: true })).toHaveCount(0)
  await page.getByRole('link', { name: 'Treningi', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Brak zapisanych planów', exact: true })).toBeVisible()
  await page.getByRole('radio', { name: 'Historia', exact: true }).check()
  await expect(page.getByRole('heading', { name: 'Brak ukończonych treningów', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Plan pierwszego konta', exact: true })).toHaveCount(0)
})

for (const theme of ['dark', 'light'] as const) {
  test(`queues a workout offline, displays pending status and sends it after reconnecting in ${theme}`, async ({ app, page, context }, testInfo) => {
    await app.createPlan('Trening bez sieci')
    await app.setTheme(theme)
    await app.openPlayer()
    await context.setOffline(true)
    await app.finishWorkout()
    expect(await app.readSessions()).toHaveLength(0)
    await page.getByRole('link', { name: 'Wróć do planu', exact: true }).click()
    await page.getByRole('link', { name: 'Treningi', exact: true }).click()
    await page.getByRole('radio', { name: 'Historia', exact: true }).check()
    const history = page.getByRole('region', { name: 'Historia treningów', exact: true })
    await expect(history.getByText('Czeka na wysłanie', { exact: true })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    if (testInfo.project.name === 'phone') {
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
