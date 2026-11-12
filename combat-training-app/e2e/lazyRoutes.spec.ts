import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'
import { authLabels } from '../src/features/auth/authLabels'
import { routeErrorLabels as labels } from '../src/app/routeErrorLabels'

test.use({ screenshot: 'off' })

for (const theme of ['dark', 'light'] as const) {
  test(`recovers a failed lazy import with reload in ${theme} theme`, async ({ app, page }, testInfo) => {
    await app.open()
    await app.setTheme(theme)
    const chunk = '**/NewWorkoutPage-*.js'
    await page.route(chunk, (route) => route.abort())
    await page.goto('/workouts/new')
    await expect(page.getByRole('alert')).toHaveText(labels.chunkLoadError)
    await expect(page.getByRole('main')).toHaveCount(1)
    for (const control of [page.getByRole('button', { name: labels.reload, exact: true }), page.getByRole('link', { name: labels.home, exact: true })]) {
      const box = await control.boundingBox()
      expect(box?.height).toBeGreaterThanOrEqual(44)
      expect(box?.width).toBeGreaterThanOrEqual(44)
    }
    expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) =>
      impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
    if (testInfo.project.name === 'phone') {
      await page.evaluate(() => document.fonts.ready)
      await page.screenshot({ path: `docs/screenshots/issue-95/route-error-${theme}-360x800.png`, fullPage: true })
    }
    await page.unroute(chunk)
    await page.getByRole('button', { name: labels.reload, exact: true }).click()
    await expect(page.getByRole('textbox', { name: 'Nazwa planu' })).toBeVisible()
  })
}

test('covers existing progress routes and returns home after an import failure', async ({ app, page }) => {
  await app.open()
  await page.route('**/ProgressPage-*.js', (route) => route.abort())
  await page.goto('/progress')
  await expect(page.getByRole('alert')).toHaveText(labels.chunkLoadError)
  await page.getByRole('link', { name: labels.home, exact: true }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('button', { name: 'Wyloguj', exact: true })).toBeVisible()
})

test('hides unexpected technical errors and reports them to the console', async ({ app, page }) => {
  await app.open()
  const technicalMessage = 'Unexpected private implementation detail'
  const errors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  await page.route('**/NewWorkoutPage-*.js', (route) => route.fulfill({
    contentType: 'text/javascript', body: `throw new Error('${technicalMessage}')`,
  }))
  await page.goto('/workouts/new')
  await expect(page.getByRole('alert')).toHaveText(labels.unexpectedError)
  await expect(page.getByText(technicalMessage)).toHaveCount(0)
  await expect.poll(() => errors.some((message) => message.includes(technicalMessage))).toBe(true)
  await page.getByRole('link', { name: labels.home, exact: true }).click()
  await expect(page).toHaveURL('/')
})

test('shows the session loading screen during a cold lazy-route reload without router warnings', async ({ app, page }) => {
  await app.open('/workouts/new')
  const warnings: string[] = []
  page.on('console', (message) => { if (message.type() === 'warning' || message.type() === 'error') warnings.push(message.text()) })
  let release!: () => void
  const waiting = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/NewWorkoutPage-*.js', async (route) => { await waiting; await route.continue() })
  try {
    await page.reload()
    await expect(page.getByRole('status')).toHaveText(authLabels.loading)
    await expect(page.getByRole('main')).toBeVisible()
  } finally {
    release()
  }
  await expect(page.getByRole('textbox', { name: 'Nazwa planu' })).toBeVisible()
  expect(warnings).toEqual([])
})
