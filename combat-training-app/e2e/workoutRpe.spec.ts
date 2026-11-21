import { selectRpe } from './rpeSlider'
import AxeBuilder from '@axe-core/playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { Page, TestInfo } from '@playwright/test'
import { test, expect } from './fixtures'
import { block, continuousExercise, workoutPlan } from '../src/test/workoutBuilders'

const plan = { ...workoutPlan([block('technique', [continuousExercise('first', 60)], 'technique')]), nameSnapshot: 'Technika po treningu' }

async function checkAccessibility(page: Page) {
  expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}

async function capture(page: Page, info: TestInfo, name: string) {
  if (info.project.name !== 'phone' || process.env.CAPTURE_SCREENSHOTS !== '1') return
  const folder = path.resolve('docs/screenshots/issue-70')
  await mkdir(folder, { recursive: true })
  await page.evaluate(() => document.fonts.ready)
  const file = path.join(folder, `${name}-360x800.png`)
  await page.screenshot({ path: file })
  await info.attach(name, { path: file, contentType: 'image/png' })
}

test.beforeEach(async ({ app, page }) => {
  await app.open('/workouts')
  await app.seedPlan(plan)
  await app.open(`/workouts/${plan.id}`)
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.fastForward(60_000)
  await app.expectWorkoutSaved()
})

test('opens RPE at ten minutes and persists six with the response timestamp', async ({ app, page }) => {
  const entry = (await app.readSessions())[0]
  if (entry.source !== 'plan') throw new Error('Expected plan entry')
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)))
  const untilDue = Date.parse(entry.completedAt) + 600_000 - await page.evaluate(() => Date.now())
  await page.clock.fastForward(untilDue - 1)
  await expect(page.getByRole('heading', { name: 'Jak ciężki był cały trening?', exact: true })).toHaveCount(0)
  await expect(page.getByText(/Gong da znać\.$/)).toBeVisible()
  await page.clock.fastForward(1)
  await expect(page.getByRole('heading', { name: 'Jak ciężki był cały trening?', exact: true })).toBeVisible()
  await expect(page.getByText('Minęło 10 minut', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Zapisz RPE', exact: true })).toBeDisabled()
  await selectRpe(page, 6)
  const responseTime = await page.evaluate(() => new Date().toISOString())
  await page.getByRole('button', { name: 'Zapisz RPE 6', exact: true }).click()
  await page.clock.resume()
  await expect(page.getByText('Zapisano RPE 6', { exact: true })).toBeVisible()
  await expect.poll(async () => (await app.readSessions())[0]?.rpeRecordedAt).toBe(responseTime)
  expect((await app.readSessions())[0].rpe).toBe(6)
  await page.getByRole('link', { name: 'Start', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Do uzupełnienia', exact: true })).toHaveCount(0)
})

test('rates early without losing the summary draft and queues RPE offline', async ({ app, page, context }) => {
  const note = page.getByRole('textbox', { name: 'Notatka do treningu · opcjonalnie', exact: true })
  await note.fill('Zachowaj szkic podczas oceny RPE.')
  await page.getByRole('button', { name: 'Oceń teraz', exact: true }).click()
  await expect(page.getByText('Minęło 10 minut', { exact: true })).toHaveCount(0)
  await selectRpe(page, 0)
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Zapisz RPE 0', exact: true }).click()
  await expect(page.getByText('Zapisano RPE 0', { exact: true })).toBeVisible()
  const saved = page.getByRole('region', { name: 'RPE · zmęczenie całym treningiem', exact: true })
  await expect(saved.getByRole('status')).toContainText('Odpoczynek')
  await expect(saved.locator('.rpe-segments > span')).toHaveCount(11)
  await expect(saved.locator('.rpe-segments > .is-current')).toBeVisible()
  await expect(saved.getByRole('slider')).toHaveCount(0)
  await expect(note).toHaveValue('Zachowaj szkic podczas oceny RPE.')
  await expect(page.getByText('Czeka na wysłanie', { exact: true })).toBeVisible()
  expect((await app.readSessions())[0].rpe).toBeNull()
  await context.setOffline(false)
  await expect.poll(async () => (await app.readSessions())[0]?.rpe).toBe(0)
  await page.getByRole('button', { name: 'Zapisz oceny', exact: true }).click()
  await expect.poll(async () => (await app.readSessions())[0]?.note).toBe('Zachowaj szkic podczas oceny RPE.')
  expect((await app.readSessions())[0].rpe).toBe(0)
})

test('renders the A2 meter and keeps the slider and stepper in sync', async ({ page }) => {
  const countdown = page.getByRole('region', { name: 'RPE · zmęczenie całym treningiem', exact: true })
  await expect(countdown.getByText('Odliczanie', { exact: true })).toBeVisible()
  await expect(countdown.getByRole('timer')).toHaveCSS('font-size', '32px')
  await countdown.getByRole('button', { name: 'Oceń teraz', exact: true }).click()
  const panel = page.getByRole('region', { name: 'Jak ciężki był cały trening?', exact: true })
  await expect(panel.getByText('Wybór 0–10', { exact: true })).toBeVisible()
  const slider = panel.getByRole('slider', { name: 'RPE od 0 do 10', exact: true })
  await expect(slider).toHaveCSS('min-height', '44px')
  await expect(slider.locator('.rpe-segments')).toHaveCSS('height', '12px')
  await expect(slider.locator('.rpe-segments > span')).toHaveCount(11)
  await expect(slider.locator('.is-current')).toHaveCount(0)
  const less = panel.getByRole('button', { name: 'Mniej', exact: true })
  const more = panel.getByRole('button', { name: 'Więcej', exact: true })
  await expect(less).toHaveCSS('min-width', '44px')
  await expect(more).toHaveCSS('min-height', '44px')
  await more.click()
  await expect(slider).toHaveAttribute('aria-valuetext', '5 · Ciężko')
  await expect(panel.getByText('5', { exact: true })).toHaveCSS('font-size', '44px')
  await slider.press('End')
  await expect(slider.locator('.is-filled')).toHaveCount(10)
  await less.click()
  await expect(slider).toHaveAttribute('aria-valuetext', '9 · Prawie maksymalnie')
  await expect(slider.locator('.is-filled')).toHaveCount(9)
  await slider.locator('.rpe-segments > span').first().click()
  await expect(slider).toHaveAttribute('aria-valuetext', '0 · Odpoczynek')
  await expect(panel.getByRole('button', { name: 'Zapisz RPE 0', exact: true })).toBeEnabled()
  await expect(slider.locator('.rpe-segments > span').first()).toHaveClass('is-current')
  await checkAccessibility(page)
})

test('keeps a next-day history summary open until RPE is requested and omits the empty focus section', async ({ app, page }) => {
  const entry = (await app.readSessions())[0]
  if (entry.source !== 'plan') throw new Error('Expected plan entry')
  const history = await app.openHistory()
  await page.clock.setFixedTime(new Date(Date.parse(entry.completedAt) + 86_400_000))
  await history.getByRole('link', { name: 'Podsumowanie', exact: true }).click()
  await expect(page.getByRole('heading', { name: plan.nameSnapshot, exact: true })).toBeVisible()
  await expect(page.getByText('Czas na ocenę', { exact: true })).toBeVisible()
  await expect(page.getByRole('timer')).toHaveCount(0)
  await expect(page.getByText(/Gong da znać\.$/)).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Jak ciężki był cały trening?', exact: true })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Elementy do poprawy', exact: true })).toHaveCount(0)
  await expect(page.getByText('oceniono 0 z 0', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Oceń teraz', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Jak ciężki był cały trening?', exact: true })).toBeVisible()
})

test('reminds at home, opens RPE directly, and persists a device dismissal without changing Firestore', async ({ app, page }) => {
  const summaryPath = new URL(page.url()).pathname
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    await page.getByRole('timer').scrollIntoViewIfNeeded()
    await checkAccessibility(page)
    await capture(page, test.info(), `countdown-${theme}`)
  }
  await page.getByRole('button', { name: 'Zapisz oceny', exact: true }).click()
  await page.getByRole('link', { name: 'Start', exact: true }).click()
  const todo = page.getByRole('region', { name: 'Do uzupełnienia', exact: true })
  const reminder = todo.getByRole('link', { name: /^Oceń trening \(RPE\) Technika po treningu · / })
  await expect(reminder).toBeVisible()
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    await page.evaluate(() => scrollTo(0, 0))
    await checkAccessibility(page)
    await capture(page, test.info(), `reminder-${theme}`)
  }
  await page.clock.fastForward(600_000)
  await reminder.click()
  await expect(page.getByRole('heading', { name: 'Jak ciężki był cały trening?', exact: true })).toBeVisible()
  await expect(page.getByText('Minęło 10 minut', { exact: true })).toBeVisible()
  const scale = page.getByRole('slider', { name: 'RPE od 0 do 10', exact: true })
  await expect(scale).toHaveAttribute('aria-valuetext', 'Nie wybrano RPE')
  await selectRpe(page, 6)
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    await page.evaluate(() => scrollTo(0, 0))
    await checkAccessibility(page)
    await capture(page, test.info(), `panel-top-${theme}`)
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
    await capture(page, test.info(), `panel-bottom-${theme}`)
  }
  await page.getByRole('button', { name: 'Pomiń', exact: true }).click()
  await page.getByRole('link', { name: 'Start', exact: true }).click()
  await expect(todo).toHaveCount(0)
  await app.open('/')
  await expect(todo).toHaveCount(0)
  expect((await app.readSessions())[0]).toMatchObject({ rpe: null, rpeRecordedAt: null })
  // Dismissing the reminder never prevents rating from the history summary.
  await app.open(summaryPath)
  await expect(page.getByText('Czas na ocenę', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Jak ciężki był cały trening?', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Oceń teraz', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Jak ciężki był cały trening?', exact: true })).toBeVisible()
})
