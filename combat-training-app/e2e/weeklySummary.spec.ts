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
  category: 'sparring', workoutDate: '2026-11-15', timezone: 'Europe/Warsaw', durationSeconds: 900, workSeconds: null,
  sparringSeconds: null, completion: null, note: null, rpe: 7, rpeRecordedAt: instant, focusRatings: [],
  sparring: [{ blockId: null, intensity: 'technical', rounds: null }], createdAt: instant, updatedAt: instant }
const { focusRatings: _manualRatings, ...timedFields } = manual
const quick: QuickTimerWorkoutSession = { ...timedFields, id: 'quick', source: 'quickTimer', status: 'partial', category: 'bag',
  workoutDate: '2026-11-11', startedAt: instant, completedAt: instant, durationSeconds: 1200.25, workSeconds: 900,
  sparringSeconds: 0, completion: { completed: 1, planned: 2, unit: 'round' }, stepResults: [sessionStep()], rpe: 0 }
const loadHint = 'Jednostki umowne: minuty treningu × RPE', partialHint = 'Suma obejmuje tylko treningi z RPE.'
const phoneViewports = [{ width: 360, height: 800 }, { width: 390, height: 844 }] as const
const summary = (page: Page) => page.getByRole('region', { name: 'Podsumowanie treningów', exact: true })
// Sparring intensity has its own scenario in sparringIntensity.spec.ts.
const totals = (page: Page) => summary(page).locator(':scope > dl > div')
  .filter({ hasNot: page.locator('dt', { hasText: /^Twarde rundy sparingu$/ }) }).getByRole('definition')
const loadDetails = (page: Page) => summary(page).getByRole('list', { name: 'Szczegóły obciążenia', exact: true }).getByRole('listitem')
const form = (page: Page) => page.getByRole('form', { name: 'Edytuj plan tygodnia', exact: true })

async function checkLayout(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
}

async function checkPhoneLayouts(page: Page, info: TestInfo, onEach?: (viewport: typeof phoneViewports[number]) => Promise<void>) {
  if (info.project.name !== 'phone') { await checkLayout(page); return }
  for (const viewport of phoneViewports) {
    await page.setViewportSize(viewport); await checkLayout(page); await onEach?.(viewport)
  }
  await page.setViewportSize(phoneViewports[0])
}

async function capture(page: Page, info: TestInfo, name: string, viewport: typeof phoneViewports[number] = phoneViewports[0]) {
  if (process.env.CAPTURE_WEEKLY_SUMMARY_SCREENSHOTS !== '1' || info.project.name !== 'phone') return
  const folder = path.join(tmpdir(), 'weekly-training-load')
  await mkdir(folder, { recursive: true })
  await page.evaluate(() => document.fonts.ready)
  await summary(page).evaluate((element) => element.scrollIntoView({ block: 'start' }))
  const file = path.join(folder, `${name}-${viewport.width}x${viewport.height}.png`)
  await page.screenshot({ path: file })
  await info.attach(name, { path: file, contentType: 'image/png' })
}

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(instant)) })

test('summarizes all sources with recorded load, follows live edits and week selection, and preserves the goal editor', async ({ app, page }, info) => {
  await app.open('/workouts'); await app.seedPlan(plan)
  await app.seedWeekPlan({ weekStart, items: [{ id: 'goal', kind: 'plan', workoutPlanId: plan.id, planNameSnapshot: plan.nameSnapshot }],
    createdAt: instant, updatedAt: instant, editedAfterWeekEnd: false })
  for (const entry of [first, quick, manual]) await app.seedSession(entry)
  await app.open(`/progress/week/${weekStart}`)
  const section = summary(page)
  await expect(section.getByText('Treningi: 3', { exact: true })).toBeVisible()
  await expect(section.getByText('Ukończone: 2 · Częściowe: 1', { exact: true })).toBeVisible()
  await expect(totals(page)).toHaveText(['66 min', 'Z odpoczynkami, bez pauz.', '35 min', 'Dane w 2 z 3 treningów', '0 s', 'Dane w 2 z 3 treningów', '105 j.u.', loadHint, 'RPE w 2 z 3 treningów', partialHint, '36 min'])
  await expect(section.getByText('Zarejestrowane obciążenie', { exact: true })).toBeVisible()
  await expect(section.getByText('Czas treningów z RPE', { exact: true })).toBeVisible()
  await expect(section.getByText(/RPE w/)).toHaveCount(1)
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
  await expect(page.getByText('Częściowe: 0 · Niewykonane: 0 · Dodatkowe: 2', { exact: true })).toBeVisible()
  await expect(loadDetails(page)).toHaveCount(0)
  await section.getByText('Szczegóły obciążenia', { exact: true }).click()
  await expect(loadDetails(page)).toHaveCount(3)
  await expect(loadDetails(page).nth(0)).toContainText('Trening poza aplikacją · Sparing15 lis')
  await expect(loadDetails(page).nth(0).getByRole('definition')).toHaveText(['15 min', '7', '105 j.u.'])
  await expect(loadDetails(page).nth(1)).toContainText('Szybki stoper · Worek11 lis')
  await expect(loadDetails(page).nth(1).getByRole('definition')).toHaveText(['21 min', '0', '0 j.u.'])
  await expect(loadDetails(page).nth(2)).toContainText(`${first.workoutPlanNameSnapshot}9 lis`)
  await expect(loadDetails(page).nth(2).getByRole('definition')).toHaveText(['31 min', 'Brak RPE', 'Brak obciążenia'])
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    await checkPhoneLayouts(page, info, async (viewport) => {
      if (viewport.width === (theme === 'dark' ? 360 : 390)) await capture(page, info, `partial-load-${theme}`, viewport)
    })
  }
  await page.getByRole('button', { name: 'Edytuj plan tygodnia', exact: true }).click()
  await page.getByRole('combobox', { name: 'Wybierz plan lub rodzaj', exact: true }).selectOption('c:pads')
  await page.getByRole('button', { name: 'Dodaj pozycję', exact: true }).click()
  await app.seedSession({ ...first, rpe: 0, rpeRecordedAt: instant })
  await expect(section.getByText('RPE w 3 z 3 treningów', { exact: true })).toBeVisible()
  await expect(section.getByText('Obciążenie tygodnia', { exact: true })).toBeVisible()
  await expect(totals(page)).toHaveText(['66 min', 'Z odpoczynkami, bez pauz.', '35 min', 'Dane w 2 z 3 treningów', '0 s', 'Dane w 2 z 3 treningów', '105 j.u.', loadHint, 'RPE w 3 z 3 treningów', '66 min'])
  await expect(loadDetails(page).nth(2).getByRole('definition')).toHaveText(['31 min', '0', '0 j.u.'])
  await app.seedSession({ ...first, rpe: 6, rpeRecordedAt: instant })
  await expect(loadDetails(page).nth(2).getByRole('definition')).toHaveText(['31 min', '6', '180 j.u.'])
  await expect(totals(page).nth(6)).toHaveText('285 j.u.')
  await app.seedSession({ ...first, durationSeconds: 2400.25, rpe: 6, rpeRecordedAt: instant })
  await expect(loadDetails(page).nth(2).getByRole('definition')).toHaveText(['41 min', '6', '240 j.u.'])
  await expect(totals(page)).toHaveText(['76 min', 'Z odpoczynkami, bez pauz.', '35 min', 'Dane w 2 z 3 treningów', '0 s', 'Dane w 2 z 3 treningów', '345 j.u.', loadHint, 'RPE w 3 z 3 treningów', '76 min'])
  await expect(form(page).getByRole('listitem')).toHaveCount(2)
  await expect(section).toBeVisible()
  await app.removeWorkoutDocument('workoutSessions', quick.id)
  await expect(section.getByText('Treningi: 2', { exact: true })).toBeVisible()
  await expect(totals(page)).toHaveText(['56 min', 'Z odpoczynkami, bez pauz.', '20 min', 'Dane w 1 z 2 treningów', '0 s', 'Dane w 1 z 2 treningów', '345 j.u.', loadHint, 'RPE w 2 z 2 treningów', '56 min'])
  await expect(loadDetails(page)).toHaveCount(2)
  await expect(form(page).getByRole('listitem')).toHaveCount(2)
  await page.getByRole('button', { name: 'Zapisz plan tygodnia', exact: true }).click()
  await expect(form(page)).toHaveCount(0)
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '2')
  await expect(section.getByText('Treningi: 2', { exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Tydzień', exact: true }).selectOption('2026-11-16')
  await expect(section.getByText('Brak treningów w tym tygodniu', { exact: true })).toBeVisible()
  await expect(section.getByText('Treningi: 0', { exact: true })).toBeVisible()
  await expect(totals(page)).toHaveText(['0 s', 'Z odpoczynkami, bez pauz.', '0 s', '0 s', '0 j.u.', loadHint, '0 s'])
  await expect(section.getByText(/RPE w|Dane w|Brak danych|Suma obejmuje/)).toHaveCount(0)
  await expect(section.getByText('Szczegóły obciążenia', { exact: true })).toHaveCount(0)
  await checkPhoneLayouts(page, info); await capture(page, info, 'empty-week')
  await page.getByRole('combobox', { name: 'Tydzień', exact: true }).selectOption(weekStart)
  await expect(section.getByText('RPE w 2 z 2 treningów', { exact: true })).toBeVisible()
  await expect(totals(page).nth(6)).toHaveText('345 j.u.')
})

test('distinguishes unknown time and RPE from zero, retries corrupt sessions and ignores a broken goal', async ({ app, page }, info) => {
  await app.open('/workouts')
  await app.seedSession({ ...manual, rpe: 0 })
  await app.open(`/progress/week/${weekStart}`)
  const section = summary(page)
  await expect(section.getByText('Zarejestrowany czas pracy', { exact: true })).toBeVisible()
  await expect(section.getByText('Obciążenie tygodnia', { exact: true })).toBeVisible()
  await expect(totals(page)).toHaveText(['15 min', 'Z odpoczynkami, bez pauz.', 'Brak danych', 'Dane w 0 z 1 treningów',
    'Brak danych', 'Dane w 0 z 1 treningów', '0 j.u.', loadHint, 'RPE w 1 z 1 treningów', '15 min'])
  await expect(section.getByText('0 j.u.', { exact: true }).filter({ visible: true })).toHaveCount(1)
  await checkPhoneLayouts(page, info); await capture(page, info, 'unknown-rpe')
  await app.seedSession({ ...first, workSeconds: 0, sparringSeconds: 0 })
  await expect(totals(page)).toHaveText(['46 min', 'Z odpoczynkami, bez pauz.', '0 s', 'Dane w 1 z 2 treningów',
    '0 s', 'Dane w 1 z 2 treningów', '0 j.u.', loadHint, 'RPE w 1 z 2 treningów', partialHint, '15 min'])
  await app.seedInvalidWeekPlan(weekStart)
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(section.getByText('Treningi: 2', { exact: true })).toBeVisible()
  await app.seedSession({ ...first, id: 'bad', note: 'n'.repeat(1001) })
  await expect(section).toContainText('Historia treningów jest niepełna')
  await expect(section.getByRole('definition')).toHaveCount(0)
  await expect(section.getByText(/Treningi:|RPE w|Brak treningów|j\.u\.|Szczegóły obciążenia/)).toHaveCount(0)
  await section.getByRole('button', { name: 'Ponów odczyt podsumowania', exact: true }).click()
  await expect(section).toContainText('Historia treningów jest niepełna')
  await app.removeWorkoutDocument('workoutSessions', 'bad')
  await expect(section.getByText('Treningi: 2', { exact: true })).toBeVisible()
})

test('updates RPE and load locally offline, confirms after reconnect, and clears totals for the next account', async ({ app, page, context }) => {
  await app.open('/workouts'); await app.seedSession(first)
  await app.open(`/workout-sessions/${first.id}/feedback`)
  const nav = page.getByRole('navigation', { name: 'Główna nawigacja' }).filter({ visible: true })
  // Service workers are blocked in E2E; load lazy routes online in this document first.
  await nav.getByRole('link', { name: 'Postęp', exact: true }).click()
  await page.getByRole('link', { name: 'Ułóż plan tygodnia', exact: true }).click()
  await expect(summary(page).getByText('RPE w 0 z 1 treningów', { exact: true })).toBeVisible()
  await expect(totals(page).nth(4)).toHaveText('Brak danych')
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
  await expect(section.getByText('Obciążenie tygodnia', { exact: true })).toBeVisible()
  await expect(totals(page).nth(4)).toHaveText('0 j.u.')
  await expect(totals(page).last()).toHaveText('31 min')
  await expect(section.getByRole('status')).toHaveText('Czeka na wysłanie')
  expect((await app.readSessions())[0].rpe).toBeNull()
  await context.setOffline(false)
  await expect.poll(async () => (await app.readSessions())[0]?.rpe).toBe(0)
  await expect(section.getByText('Czeka na wysłanie', { exact: true })).toHaveCount(0)
  await expect(totals(page).nth(4)).toHaveText('0 j.u.')
  await page.getByRole('button', { name: 'Wyloguj', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Zaloguj się', exact: true })).toBeVisible()
  const second = await createVerifiedAccount(page.request)
  await signIn(page, second)
  await expect(page.getByRole('button', { name: 'Wyloguj', exact: true })).toBeEnabled()
  await page.goto(`/progress/week/${weekStart}`)
  await expect(section.getByText('Treningi: 0', { exact: true })).toBeVisible()
  await expect(section.getByText('RPE w 1 z 1 treningów', { exact: true })).toHaveCount(0)
  await expect(totals(page).nth(4)).toHaveText('0 j.u.')
  await expect(section.getByText('Szczegóły obciążenia', { exact: true })).toHaveCount(0)
})
