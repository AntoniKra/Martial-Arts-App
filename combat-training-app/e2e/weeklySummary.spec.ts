import AxeBuilder from '@axe-core/playwright'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { Page, TestInfo } from '@playwright/test'
import { test, expect } from './fixtures'
import { createVerifiedAccount, signIn } from './authEmulator'
import { block, continuousExercise, workoutPlan } from '../src/test/workoutBuilders'
import { sessionStep, workoutSession } from '../src/test/workoutSessionBuilders'
import type { ManualWorkoutSession, QuickTimerWorkoutSession } from '../src/domain/workout-session/workoutSession.types'

const weekStart = '2026-11-09', instant = '2026-11-10T10:00:00.000Z'
const plan = { ...workoutPlan([block('bag', [continuousExercise('one', 60)], 'bag')]), id: 'weekly-bag', nameSnapshot: 'Worek tygodnia' }
const first = workoutSession({ id: 'first', workoutPlanId: plan.id, workoutDate: weekStart, category: 'bag',
  durationSeconds: 1800.25, workSeconds: 1200, sparringSeconds: 0, stepResults: [sessionStep()] })
const manual: ManualWorkoutSession = { id: 'manual', source: 'manual', status: 'completed', disciplineKey: 'boxing',
  category: 'sparring', workoutDate: '2026-11-15', timezone: 'Europe/Warsaw', durationSeconds: 900, workSeconds: 600,
  sparringSeconds: 600, completion: null, note: null, rpe: 7, rpeRecordedAt: instant, sparring: [], createdAt: instant, updatedAt: instant }
const quick: QuickTimerWorkoutSession = { ...manual, id: 'quick', source: 'quickTimer', status: 'partial', category: 'bag',
  workoutDate: '2026-11-11', startedAt: instant, completedAt: instant, durationSeconds: 1200.25, workSeconds: 900,
  sparringSeconds: 0, completion: { completed: 1, planned: 2, unit: 'round' }, stepResults: [sessionStep()], rpe: 0 }
const summary = (page: Page) => page.getByRole('region', { name: 'Podsumowanie treningów', exact: true })
const form = (page: Page) => page.getByRole('form', { name: 'Edytuj plan tygodnia', exact: true })

async function checkLayout(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
}

async function capture(page: Page, info: TestInfo, name: string) {
  if (process.env.CAPTURE_WEEKLY_SUMMARY_SCREENSHOTS !== '1' || info.project.name !== 'phone') return
  const folder = path.join(tmpdir(), 'weekly-summary-basics')
  await mkdir(folder, { recursive: true })
  await page.evaluate(() => document.fonts.ready)
  await summary(page).evaluate((element) => element.scrollIntoView({ block: 'center' }))
  const file = path.join(folder, `${name}-360x800.png`)
  await page.screenshot({ path: file })
  await info.attach(name, { path: file, contentType: 'image/png' })
}

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(instant)) })

test('summarizes all sources, follows live edits and week selection, and preserves the goal editor', async ({ app, page }, info) => {
  await app.open('/workouts'); await app.seedPlan(plan)
  await app.seedWeekPlan({ weekStart, items: [{ id: 'goal', kind: 'plan', workoutPlanId: plan.id, planNameSnapshot: plan.nameSnapshot }],
    createdAt: instant, updatedAt: instant, editedAfterWeekEnd: false })
  for (const entry of [first, quick, manual]) await app.seedSession(entry)
  await app.open(`/progress/week/${weekStart}`)
  const section = summary(page)
  await expect(section.getByText('Treningi: 3', { exact: true })).toBeVisible()
  await expect(section.getByText('Ukończone: 2 · Częściowe: 1', { exact: true })).toBeVisible()
  await expect(section.getByRole('definition')).toHaveText(['66 min', 'Z odpoczynkami, bez pauz.', '45 min', '10 min'])
  await expect(section.getByText('RPE w 2 z 3 treningów', { exact: true })).toBeVisible()
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
  await expect(page.getByText('Częściowe: 0 · Niewykonane: 0 · Dodatkowe: 2', { exact: true })).toBeVisible()
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme); await checkLayout(page); await capture(page, info, `summary-${theme}`)
  }
  await page.getByRole('button', { name: 'Edytuj plan tygodnia', exact: true }).click()
  await page.getByRole('combobox', { name: 'Wybierz plan lub rodzaj', exact: true }).selectOption('c:pads')
  await page.getByRole('button', { name: 'Dodaj pozycję', exact: true }).click()
  await app.seedSession({ ...first, rpe: 6, rpeRecordedAt: instant })
  await expect(section.getByText('RPE w 3 z 3 treningów', { exact: true })).toBeVisible()
  await expect(form(page).getByRole('listitem')).toHaveCount(2)
  await expect(section).toBeVisible()
  await app.removeWorkoutDocument('workoutSessions', quick.id)
  await expect(section.getByText('Treningi: 2', { exact: true })).toBeVisible()
  await expect(section.getByRole('definition')).toHaveText(['46 min', 'Z odpoczynkami, bez pauz.', '30 min', '10 min'])
  await page.getByRole('button', { name: 'Zapisz plan tygodnia', exact: true }).click()
  await expect(form(page)).toHaveCount(0)
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '2')
  await expect(section.getByText('Treningi: 2', { exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Tydzień', exact: true }).selectOption('2026-11-16')
  await expect(section.getByText('Brak treningów w tym tygodniu', { exact: true })).toBeVisible()
  await expect(section.getByText('Treningi: 0', { exact: true })).toBeVisible()
  await expect(section.getByRole('definition')).toHaveText(['0 s', 'Z odpoczynkami, bez pauz.', '0 s', '0 s'])
  await expect(section.getByText(/RPE w|Dane w|Brak danych/)).toHaveCount(0)
  await checkLayout(page); await capture(page, info, 'empty-week')
  await page.getByRole('combobox', { name: 'Tydzień', exact: true }).selectOption(weekStart)
  await expect(section.getByText('RPE w 2 z 2 treningów', { exact: true })).toBeVisible()
})

test('distinguishes unknown time from zero, retries corrupt sessions and ignores a broken goal', async ({ app, page }, info) => {
  await app.open('/workouts')
  await app.seedSession({ ...manual, workSeconds: null, sparringSeconds: null })
  await app.open(`/progress/week/${weekStart}`)
  const section = summary(page)
  await expect(section.getByText('Zarejestrowany czas pracy', { exact: true })).toBeVisible()
  await expect(section.getByRole('definition')).toHaveText(['15 min', 'Z odpoczynkami, bez pauz.', 'Brak danych', 'Dane w 0 z 1 treningów', 'Brak danych', 'Dane w 0 z 1 treningów'])
  await checkLayout(page); await capture(page, info, 'unknown-work')
  await app.seedSession({ ...first, workSeconds: 0, sparringSeconds: 0 })
  await expect(section.getByRole('definition')).toHaveText(['46 min', 'Z odpoczynkami, bez pauz.', '0 s', 'Dane w 1 z 2 treningów', '0 s', 'Dane w 1 z 2 treningów'])
  await app.seedInvalidWeekPlan(weekStart)
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(section.getByText('Treningi: 2', { exact: true })).toBeVisible()
  await app.seedSession({ ...first, id: 'bad', note: 'n'.repeat(1001) })
  await expect(section).toContainText('Historia treningów jest niepełna')
  await expect(section.getByRole('definition')).toHaveCount(0)
  await expect(section.getByText(/Treningi:|RPE w|Brak treningów/)).toHaveCount(0)
  await section.getByRole('button', { name: 'Ponów odczyt podsumowania', exact: true }).click()
  await expect(section).toContainText('Historia treningów jest niepełna')
  await app.removeWorkoutDocument('workoutSessions', 'bad')
  await expect(section.getByText('Treningi: 2', { exact: true })).toBeVisible()
})

test('updates RPE locally offline, confirms after reconnect, and clears totals for the next account', async ({ app, page, context }) => {
  await app.open('/workouts'); await app.seedSession(first)
  await app.open(`/workout-sessions/${first.id}/feedback`)
  const nav = page.getByRole('navigation', { name: 'Główna nawigacja' }).filter({ visible: true })
  // Service workers are blocked in E2E; load lazy routes online in this document first.
  await nav.getByRole('link', { name: 'Postęp', exact: true }).click()
  await page.getByRole('link', { name: 'Ułóż plan tygodnia', exact: true }).click()
  await expect(summary(page).getByText('RPE w 0 z 1 treningów', { exact: true })).toBeVisible()
  await page.goBack(); await page.goBack()
  await page.getByRole('button', { name: 'Oceń teraz', exact: true }).click()
  await page.getByRole('radio', { name: '0 Odpoczynek', exact: true }).check()
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Zapisz RPE 0', exact: true }).click()
  await expect(page.getByText('Zapisano RPE 0', { exact: true })).toBeVisible()
  await nav.getByRole('link', { name: 'Postęp', exact: true }).click()
  await page.getByRole('link', { name: 'Ułóż plan tygodnia', exact: true }).click()
  const section = summary(page)
  await expect(section.getByText('RPE w 1 z 1 treningów', { exact: true })).toBeVisible()
  await expect(section.getByRole('status')).toHaveText('Czeka na wysłanie')
  expect((await app.readSessions())[0].rpe).toBeNull()
  await context.setOffline(false)
  await expect.poll(async () => (await app.readSessions())[0]?.rpe).toBe(0)
  await expect(section.getByText('Czeka na wysłanie', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Wyloguj', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Zaloguj się', exact: true })).toBeVisible()
  const second = await createVerifiedAccount(page.request)
  await signIn(page, second)
  await expect(page.getByRole('button', { name: 'Wyloguj', exact: true })).toBeEnabled()
  await page.goto(`/progress/week/${weekStart}`)
  await expect(section.getByText('Treningi: 0', { exact: true })).toBeVisible()
  await expect(section.getByText('RPE w 1 z 1 treningów', { exact: true })).toHaveCount(0)
})
