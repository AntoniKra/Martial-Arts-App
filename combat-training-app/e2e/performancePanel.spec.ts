import packageInfo from '../package.json' with { type: 'json' }
import { selectRpe } from './rpeSlider'
import { test, expect } from './fixtures'

// Offline navigation to Progress uses the PWA precache.
test.use({ serviceWorkers: 'allow' })

test('opt-in panel measures a real offline manual entry and stays absent without the flag', async ({ app, page, context }, info) => {
  const downloaded: string[] = []
  page.on('request', (request) => downloaded.push(request.url()))
  await app.open('/progress?tab=history')
  const panel = page.getByRole('group', { name: 'Panel pomiarów wydajności', exact: true })
  await expect(panel).toHaveCount(0)
  expect(downloaded.some((url) => /performance-panel|web-vitals/.test(url))).toBe(false)

  await app.open('/workout-sessions/new?perf=1')
  await expect(panel).toBeVisible()
  await expect(panel.getByLabel('Wyniki pomiarów', { exact: true })).toContainText(`Firebase ${packageInfo.dependencies.firebase}`)
  // Session storage keeps the flag through navigation and reloads.
  await app.open('/workout-sessions/new')
  await expect(panel).toBeVisible()
  await panel.getByRole('button', { name: 'Symuluj brak sieci', exact: true }).click()
  await expect(panel.getByRole('status')).toContainText('Sieć Firestore wyłączona')
  await panel.locator('summary').click()

  const form = page.getByRole('form', { name: 'Trening spoza aplikacji', exact: true })
  await form.getByRole('radio', { name: 'Boks', exact: true }).check()
  await form.getByRole('group', { name: 'Części zajęć', exact: true }).getByRole('checkbox', { name: /^Worek/ }).check()
  await form.getByRole('radio', { name: '90 min', exact: true }).check()
  await selectRpe(form, 7)
  await context.setOffline(true)
  await form.getByRole('button', { name: 'Zapisz', exact: true }).click()
  await expect(page).toHaveURL(/\/progress\?tab=history$/)
  await panel.locator('summary').click()
  const results = panel.getByLabel('Wyniki pomiarów', { exact: true })
  await expect(results).toContainText(/T_lokalny: \d+\.\d+ ms/)
  if (process.env.CAPTURE_SCREENSHOTS === '1' && info.repeatEachIndex === 0) await page.screenshot({ path: 'perf-results/performance-panel-phone.png' })
  expect(await app.readSessions()).toEqual([])
  await context.setOffline(false)
  await panel.getByRole('button', { name: 'Przywróć sieć Firestore', exact: true }).click()
  await expect(results).toContainText(/T_sync: \d+\.\d+ ms/)
  await expect.poll(async () => (await app.readSessions()).length).toBe(1)
  await app.open('/progress?tab=history&perf=0')
  await expect(panel).toHaveCount(0)
})
