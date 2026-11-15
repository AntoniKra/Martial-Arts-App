import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'
import { generateScheduledWeek } from '../src/domain/week-plan/scheduledWeek'
import type { WeekActivity } from '../src/domain/week-plan/weekPlan.types'
import { block, continuousExercise, workoutPlan } from '../src/test/workoutBuilders'

test.use({ screenshot: 'off', trace: 'off', serviceWorkers: 'allow' })
const instant = '2026-11-17T10:00:00Z', weekStart = '2026-11-16'
const club: WeekActivity = { id: 'club', kind: 'club', day: 1, disciplineKey: 'muay_thai', startTime: '19:00', endTime: '20:30',
  parts: ['technique', 'pads', 'sparring'], clubName: null }
const own: WeekActivity = { id: 'bag', kind: 'own', day: null, category: 'bag', workoutPlanId: 'bag', planNameSnapshot: 'Worek 6 × 3:00' }
const plan = { ...workoutPlan([block('bag', [continuousExercise('bag', 60)], 'bag')]), id: 'bag', nameSnapshot: 'Worek 6 × 3:00' }
const week = (items: WeekActivity[], start = weekStart) => generateScheduledWeek(start,
  { id: 'default', items, createdAt: instant, updatedAt: instant }, new Date(instant))
const todayCard = (page: Page) => page.getByRole('region', { name: 'Dziś · Muay Thai · 19:00', exact: true })
const weekCard = (page: Page) => page.getByRole('region', { name: 'Ten tydzień', exact: true })
const form = (page: Page) => page.getByRole('form', { name: 'Trening spoza aplikacji', exact: true })

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(instant)) })
async function accessible(page: Page) {
  expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}

for (const theme of ['dark', 'light'] as const) {
  test(`logs today's class from home, credits the day and shows the latest RPE in ${theme}`, async ({ app, page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await app.open('/workouts'); await app.setTheme(theme); await app.seedPlan(plan)
    await app.seedWeekPlan(week([club, own, { id: 'rest', kind: 'rest', day: 2 }]))
    await app.open('/')
    await expect(todayCard(page)).toContainText('Zwykle: technika, tarcze, sparing')
    const entry = todayCard(page).getByRole('link', { name: 'Wpisz trening po zajęciach', exact: true })
    await expect(entry).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    const action = await entry.boundingBox()
    expect(action!.height).toBeGreaterThanOrEqual(56)
    expect(action!.y + action!.height / 2).toBeGreaterThanOrEqual(422)
    expect(action!.y + action!.height).toBeLessThan(844 - 72)
    await expect(todayCard(page).getByRole('link', { name: 'Start', exact: true })).toHaveAttribute('href', '/workouts/bag/active')
    await expect(todayCard(page).getByRole('link', { name: 'Stoper', exact: true })).toHaveAttribute('href', '/quick-timer')
    await expect(weekCard(page)).toContainText('0 z 2 treningów · 0 min')
    await expect(page.getByRole('img', { name: 'Wtorek: zaplanowane, dziś', exact: true })).toBeVisible()
    for (const width of [320, 360, 390]) {
      await page.setViewportSize({ width, height: 844 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      for (const target of await page.getByRole('main').locator('a:visible, button:visible').all()) {
        const box = await target.boundingBox()
        expect(box!.height).toBeGreaterThanOrEqual(44)
        expect(box!.width).toBeGreaterThanOrEqual(44)
      }
    }
    await accessible(page)
    await entry.click()
    await expect(form(page).getByLabel('Data', { exact: true })).toHaveValue('2026-11-17')
    await expect(form(page).getByRole('radio', { name: 'Muay Thai', exact: true })).toBeChecked()
    await expect(form(page).getByRole('radio', { name: '90 min', exact: true })).toBeChecked()
    await expect(form(page).getByRole('checkbox', { checked: true })).toHaveCount(3)
    await expect(form(page).getByRole('radiogroup', { name: 'RPE od 0 do 10' }).getByRole('radio', { checked: true })).toHaveCount(0)
    const sparring = form(page).getByRole('region', { name: 'Szczegóły sparingu', exact: true })
    await expect(sparring.getByRole('radio', { checked: true })).toHaveCount(0)
    await expect(sparring.getByRole('spinbutton')).toHaveValue('')
    await form(page).getByRole('radio', { name: '7 Bardzo ciężko', exact: true }).check()
    await sparring.getByRole('radio', { name: /^Techniczny/ }).check()
    await form(page).getByRole('button', { name: 'Zapisz', exact: true }).click()
    await expect(page).toHaveURL('/')
    await expect(todayCard(page)).toContainText('✓ Wykonane')
    await expect(todayCard(page).getByRole('link', { name: 'Wpisz trening po zajęciach', exact: true })).toHaveCount(0)
    await expect(weekCard(page)).toContainText('1 z 2 treningów · 90 min')
    await expect(page.getByRole('region', { name: 'Ostatnia sesja', exact: true })).toContainText('90 min · RPE 7')
    await expect.poll(async () => (await app.readSessions()).length).toBe(1)
    await accessible(page)
  })

  test(`shows a rest day, the next club class and quick start in ${theme}`, async ({ app, page }) => {
    await page.clock.setFixedTime(new Date('2026-11-18T10:00:00Z'))
    await app.open('/workouts'); await app.setTheme(theme); await app.seedPlan(plan)
    await app.seedWeekPlan(week([{ ...club, day: 3 }, { id: 'rest', kind: 'rest', day: 2 }, own]))
    await app.open('/')
    await expect(page.getByText('Dziś odpoczynek · następny: czw., muay thai 19:00', { exact: true })).toBeVisible()
    const quick = page.getByRole('region', { name: 'Szybki start', exact: true })
    await expect(quick.getByRole('link', { name: 'Rozpocznij plan', exact: true })).toHaveAttribute('href', '/workouts/bag/active')
    await expect(quick.getByRole('link', { name: 'Stoper 3 × 3:00', exact: true })).toHaveAttribute('href', '/quick-timer')
    await expect(quick.getByRole('link', { name: /^Trening w klubie/ })).toHaveAttribute('href', '/workout-sessions/new')
    await expect(page.getByRole('img', { name: 'Środa: odpoczynek, dziś', exact: true })).toBeVisible()
    await accessible(page)
  })
}

test('omits a missed class from the previous week and removes the reminder without changing the journal', async ({ app, page }) => {
  await app.open('/')
  await app.seedWeekPlan(week([club], '2026-11-09'))
  const reminders = page.getByRole('region', { name: 'Do uzupełnienia', exact: true })
  await expect(reminders).toContainText('10.11')
  await reminders.getByRole('button', { name: 'Nie byłem', exact: true }).click()
  await expect(reminders).toHaveCount(0)
  await expect.poll(async () => (await app.readWeekPlans()).find((plan) => plan.weekStart === '2026-11-09')?.schedule?.[0].omitted).toBe(true)
  expect(await app.readSessions()).toHaveLength(0)
})

test('moves only this week with undo and consciously skips today from home', async ({ app, page }) => {
  await app.open('/'); await app.seedWeekPlan(week([club]))
  await expect(todayCard(page)).toBeVisible()
  await todayCard(page).getByRole('button', { name: 'Przenieś na…', exact: true }).click()
  await todayCard(page).getByRole('combobox', { name: 'Przenieś na…', exact: true }).selectOption('3')
  await expect(todayCard(page)).toHaveCount(0)
  await expect(page.getByText('Dziś odpoczynek · następny: czw., muay thai 19:00', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Cofnij', exact: true }).click()
  await expect(todayCard(page)).toBeVisible()
  await todayCard(page).getByRole('button', { name: 'Nie idę dziś', exact: true }).click()
  await expect(todayCard(page)).toHaveCount(0)
  await expect(page.getByRole('img', { name: 'Wtorek: nie byłem, dziś', exact: true })).toBeVisible()
  await expect.poll(async () => (await app.readWeekPlans()).find((plan) => plan.weekStart === weekStart)?.schedule?.[0]).toMatchObject({ day: 1, omitted: true })
  expect(await app.readRecurringWeek()).toBeUndefined()
})

test('keeps one empty-account card with two working entry points', async ({ app, page }) => {
  await app.open('/')
  await expect(page.getByRole('region')).toHaveCount(1)
  await expect(page.getByRole('link', { name: 'Utwórz plan', exact: true })).toHaveAttribute('href', '/workouts/new')
  await page.getByRole('link', { name: 'Wpisz trening z klubu', exact: true }).click()
  await expect(form(page)).toBeVisible()
  await expect(form(page).getByRole('checkbox', { checked: true })).toHaveCount(0)
  await expect(form(page).getByRole('radiogroup', { name: 'RPE od 0 do 10' }).getByRole('radio', { checked: true })).toHaveCount(0)
})

test('does not overwrite a corrupt week or invent progress and recovers after a valid snapshot', async ({ app, page }) => {
  await app.open('/'); await app.seedInvalidWeekPlan(weekStart)
  await expect(page.getByRole('alert')).toContainText('Nie udało się odczytać lub zapisać')
  await expect(weekCard(page)).toHaveCount(0)
  await expect(todayCard(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Spróbuj ponownie', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await app.seedWeekPlan(week([club]))
  await expect(todayCard(page)).toBeVisible()
  await expect(weekCard(page)).toContainText('0 z 1 treningów')
})

test('creates the current snapshot from existing recurring classes when home is first opened', async ({ app, page }) => {
  await app.open(`/progress/week/${weekStart}`)
  await page.getByRole('button', { name: /^Stały tydzień:/ }).click()
  const editor = page.getByRole('form', { name: 'Dodaj lub edytuj trening', exact: true })
  await editor.getByRole('radio', { name: 'Muay Thai', exact: true }).check()
  await editor.getByRole('button', { name: 'Wt — Wtorek', exact: true }).click()
  await editor.getByLabel('Od', { exact: true }).fill('19:00')
  await editor.getByLabel('Do', { exact: true }).fill('20:30')
  await editor.getByRole('button', { name: 'Technika', exact: true }).click()
  await editor.getByRole('button', { name: 'ZAPISZ STAŁE ZAJĘCIA', exact: true }).click()
  await expect.poll(async () => (await app.readRecurringWeek())?.items.length).toBe(1)
  await page.getByRole('navigation', { name: 'Główna nawigacja', exact: true }).getByRole('link', { name: 'Start', exact: true }).click()
  await expect(todayCard(page)).toBeVisible()
  await expect.poll(async () => (await app.readWeekPlans()).find((plan) => plan.weekStart === weekStart)?.schedule?.length).toBe(1)
})
