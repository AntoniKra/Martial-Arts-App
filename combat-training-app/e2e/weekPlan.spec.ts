import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect, openProfile } from './fixtures'
import { createVerifiedAccount, signIn } from './authEmulator'
import { block, continuousExercise, workoutPlan } from '../src/test/workoutBuilders'
import { workoutSession } from '../src/test/workoutSessionBuilders'
import { manualWorkoutSession } from '../src/test/manualWorkoutBuilder'
import type { WeekPlan, WeekPlanItem } from '../src/domain/week-plan/weekPlan.types'

test.use({ serviceWorkers: 'allow', screenshot: 'off', trace: 'off' })
const weekStart = '2026-11-09', instant = '2026-11-10T10:00:00.000Z'
const plan = { ...workoutPlan([block('bag', [continuousExercise('one', 60)], 'bag')]), id: 'bag-plan', nameSnapshot: 'Worek tygodnia' }
const goal = (items: WeekPlanItem[], start = weekStart): WeekPlan => ({ weekStart: start, items, createdAt: instant, updatedAt: instant, editedAfterWeekEnd: false })
const category = (id: string, value: 'technique' | 'pads' | 'bag' = 'technique'): WeekPlanItem => ({ id, kind: 'category', category: value })
const form = (page: Page) => page.getByRole('form', { name: 'Dodaj lub edytuj trening', exact: true })
const flexible = (page: Page) => page.getByRole('region', { name: 'Dowolny dzień · kiedy pasuje', exact: true })
async function add(page: Page, value = 'bag') {
  await flexible(page).getByRole('button', { name: 'Dodaj', exact: true }).click()
  await form(page).getByRole('combobox', { name: 'Rodzaj treningu', exact: true }).selectOption(value)
}
async function save(page: Page) {
  await form(page).getByRole('button', { name: 'Zapisz', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}
async function accessible(page: Page) {
  expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}
test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(instant)) })

for (const reverse of [false, true]) test(`maximizes club parts in either goal order and presents v1 with the new layout, reversed=${reverse}`, async ({ app, page }) => {
  await app.open('/')
  const items = [category('technique'), category('pads', 'pads')]
  await app.seedWeekPlan(goal(reverse ? items.reverse() : items))
  const progress = page.getByRole('region', { name: 'Ten tydzień', exact: true }).getByRole('progressbar')
  await expect(progress).toHaveAttribute('aria-valuenow', '0')
  await app.seedSession(manualWorkoutSession({ id: 'multi', category: 'mixed', parts: ['technique', 'pads'], workoutDate: weekStart }))
  await expect(progress).toHaveAttribute('aria-valuenow', '1')
  await app.seedSession(manualWorkoutSession({ id: 'single', category: 'technique', parts: ['technique'], workoutDate: '2026-11-10' }))
  await expect(progress).toHaveAttribute('aria-valuenow', '2')
  await page.getByRole('link', { name: 'Plan tygodnia →', exact: true }).click()
  await expect(page.getByRole('list', { name: 'Dni planu tygodnia', exact: true }).getByRole('listitem')).toHaveCount(7)
  await expect(flexible(page).getByText('✓ Zaliczone', { exact: true })).toHaveCount(2)
  await expect(page.getByRole('combobox', { name: 'Tydzień', exact: true })).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Cel liczby treningów', exact: true })).toHaveCount(0)
  expect((await app.readWeekPlans())[0].items).toEqual(items)
  expect((await app.readWeekPlans())[0].schedule).toBeUndefined()
  await accessible(page)
})

test('migrates v1 on its first mutation, preserving saved plans, timestamps, categories and journal entries', async ({ app, page }) => {
  await app.open('/workouts'); await app.seedPlan(plan)
  const source = goal([{ id: 'saved', kind: 'plan', workoutPlanId: plan.id, planNameSnapshot: 'Saved snapshot' }, category('category', 'pads')], '2026-11-02')
  await app.seedWeekPlan(source)
  await app.seedSession(manualWorkoutSession({ id: 'history', workoutDate: '2026-11-03' }))
  await app.open('/progress/week/2026-11-02')
  await expect(flexible(page)).toContainText('Saved snapshot')
  expect((await app.readWeekPlans())[0].schedule).toBeUndefined()
  await add(page); await save(page)
  await expect.poll(async () => (await app.readWeekPlans())[0]?.schedule?.length).toBe(3)
  const migrated = (await app.readWeekPlans())[0]
  expect(migrated).toMatchObject({ items: [], createdAt: source.createdAt, editedAfterWeekEnd: true, targetCount: 3 })
  expect(migrated.schedule?.slice(0, 2)).toEqual([
    { id: 'saved', kind: 'own', day: null, category: 'mixed', workoutPlanId: plan.id, planNameSnapshot: 'Saved snapshot', omitted: false, legacyGoal: source.items[0] },
    { id: 'category', kind: 'own', day: null, category: 'pads', workoutPlanId: null, planNameSnapshot: null, omitted: false, legacyGoal: source.items[1] },
  ])
  expect(await app.readSessions()).toHaveLength(1)
  await expect(page.getByText('Plan zmieniony po zakończeniu tygodnia', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Następny tydzień', exact: true }).click()
  await expect(page.getByText('Plan zmieniony po zakończeniu tygodnia', { exact: true })).toHaveCount(0)
})

test('counts partial and outside-plan sessions and reacts to journal deletion without rewriting old plan names', async ({ app, page }) => {
  await app.open('/workouts'); await app.seedPlan(plan)
  await app.seedWeekPlan(goal([{ id: 'saved', kind: 'plan', workoutPlanId: plan.id, planNameSnapshot: 'Historical plan' }]))
  await app.open(`/progress/week/${weekStart}`)
  for (const [id, status] of [['complete', 'completed'], ['partial', 'partial']] as const) {
    await app.seedSession(workoutSession({ id, status, workoutPlanId: plan.id, durationSeconds: 60, workoutDate: '2026-11-10', category: 'bag' }))
  }
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
  await app.seedSession(manualWorkoutSession({ id: 'outside', workoutDate: '2026-11-10', category: 'bag', parts: ['bag'] }))
  await expect(page.getByText('1 z 1 treningów', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Poza planem', exact: true })).toBeVisible()
  await app.removeWorkoutDocument('workoutPlans', plan.id)
  await flexible(page).getByRole('button', { name: 'Opcje: Historical plan', exact: true }).click()
  await expect(flexible(page)).toContainText('Historical plan')
  await expect(flexible(page)).toContainText('Plan niedostępny')
  await app.removeWorkoutDocument('workoutSessions', 'complete')
  await expect(page.getByText('0 z 1 treningów', { exact: true })).toBeVisible()
  await expect(page.getByText('◐ Częściowo', { exact: true })).toBeVisible()
  expect((await app.readWeekPlans())[0].items[0]).toMatchObject({ planNameSnapshot: 'Historical plan' })
})

test('blocks overflow without losing a draft and removes only a chosen weekly occurrence', async ({ app, page }) => {
  await app.open('/workouts'); await app.seedWeekPlan(goal(Array.from({ length: 14 }, (_, i) => category(`entry-${i}`, 'bag'))))
  await app.open(`/progress/week/${weekStart}`)
  await add(page, 'pads')
  await form(page).getByRole('button', { name: 'Zapisz', exact: true }).click()
  await expect(form(page).getByRole('alert')).toBeVisible()
  await expect(form(page).getByRole('combobox', { name: 'Rodzaj treningu', exact: true })).toHaveValue('pads')
  expect((await app.readWeekPlans())[0].items).toHaveLength(14)
  await page.keyboard.press('Escape')
  await flexible(page).getByRole('button', { name: 'Opcje: Worek', exact: true }).first().click()
  await flexible(page).getByRole('button', { name: 'Usuń z tego tygodnia', exact: true }).click()
  await expect.poll(async () => (await app.readWeekPlans())[0]?.schedule?.length).toBe(13)
  await add(page, 'pads'); await save(page)
  await expect.poll(async () => (await app.readWeekPlans())[0]?.schedule?.length).toBe(14)
})

test('saves migration offline, warns on logout, confirms after reconnect and isolates the next account', async ({ app, page, context }) => {
  await app.open('/'); await app.seedWeekPlan(goal([category('one')]))
  const summary = page.getByRole('region', { name: 'Ten tydzień', exact: true })
  await expect(summary.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '1')
  await summary.getByRole('link', { name: 'Plan tygodnia →', exact: true }).click()
  await add(page); await context.setOffline(true); await save(page)
  await expect(page.getByRole('status').filter({ hasText: 'Czeka na wysłanie' })).toBeVisible()
  await openProfile(page); await page.getByRole('button', { name: 'Wyloguj', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape')
  await context.setOffline(false)
  await expect.poll(async () => (await app.readWeekPlans())[0]?.schedule?.length).toBe(2)
  await expect(page.getByText('Czeka na wysłanie', { exact: true })).toHaveCount(0)
  await openProfile(page); await page.getByRole('button', { name: 'Wyloguj', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Zaloguj się', exact: true })).toBeVisible()
  await signIn(page, await createVerifiedAccount(page.request))
  await expect(page.getByRole('link', { name: 'Profil', exact: true })).toBeVisible()
  await page.goto(`/progress/week/${weekStart}`)
  await expect(page.getByRole('progressbar')).toHaveCount(0)
  await expect(page.getByText('0 z 0 treningów', { exact: true })).toBeVisible()
  await expect(flexible(page).getByRole('button', { name: /^Opcje:/ })).toHaveCount(0)
})

test('rejects corrupt and out-of-range weeks, retries safely and keeps workouts available', async ({ app, page }) => {
  await app.open('/workouts'); await app.seedPlan(plan); await app.seedInvalidWeekPlan(weekStart)
  await app.open(`/progress/week/${weekStart}`)
  await expect(page.getByRole('alert')).toContainText('Nie udało się odczytać lub zapisać')
  await expect(page.getByRole('button', { name: /^Dodaj trening:/ })).toHaveCount(0)
  await expect(page.getByRole('progressbar')).toHaveCount(0)
  await page.getByRole('alert').getByRole('button', { name: 'Spróbuj ponownie', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await app.seedWeekPlan(goal([category('fixed')]))
  await expect(flexible(page)).toContainText('Technika')
  await app.open('/progress/week/2026-08-10')
  await expect(page.getByText('Ten tydzień jest poza dostępnym zakresem historii.')).toBeVisible()
  await app.open('/workouts/bag-plan'); await app.openPlayer()
  await expect(page.getByRole('button', { name: 'Rozpocznij trening', exact: true })).toBeVisible()
})

test('refreshes an open home at Monday without moving unfinished goals', async ({ app, page }) => {
  await page.clock.setFixedTime(new Date('2026-11-15T22:59:59.000Z'))
  await app.open('/'); await app.seedWeekPlan(goal([category('sunday')]))
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '1')
  const summary = page.getByRole('region', { name: 'Ten tydzień', exact: true })
  const setGoal = summary.getByRole('link', { name: 'Bez celu · Ustal cel tygodnia', exact: true })
  await expect(setGoal).toHaveCount(0)
  await page.clock.setFixedTime(new Date('2026-11-15T23:00:01.000Z'))
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(summary).toContainText('16–22.11')
  await expect(setGoal).toHaveAttribute('href', '/progress/week/2026-11-16')
  await expect(summary.getByRole('progressbar')).toHaveCount(0)
  expect((await app.readWeekPlans()).map((entry) => entry.weekStart)).toEqual([weekStart])
})

test('keeps long saved names readable and preserves snapshots when the live library is renamed', async ({ app, page }) => {
  const saved = 'Worek techniczny — długa seria ciosów na ciężki worek, wersja A'
  const renamed = 'Worek techniczny — długa seria ciosów na ciężki worek, wersja B'
  await app.open('/workouts'); await app.seedPlan({ ...plan, nameSnapshot: renamed })
  await app.seedWeekPlan(goal([{ id: 'saved', kind: 'plan', workoutPlanId: plan.id, planNameSnapshot: saved }]))
  await app.open(`/progress/week/${weekStart}`)
  await flexible(page).getByRole('button', { name: `Opcje: ${saved}`, exact: true }).click()
  await flexible(page).getByRole('button', { name: 'Edytuj', exact: true }).click()
  const linked = form(page).getByRole('combobox', { name: 'Plan z odtwarzacza (opcjonalnie)', exact: true })
  await expect(linked.locator('option:checked')).toHaveText(renamed)
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    for (const width of [360, 390]) {
      await page.setViewportSize({ width, height: 844 })
      await expect(form(page).getByText(`Zapisana nazwa: ${saved}`, { exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
  }
  await form(page).getByRole('combobox', { name: 'Rodzaj treningu', exact: true }).selectOption('pads')
  await save(page)
  await expect.poll(async () => (await app.readWeekPlans())[0]?.schedule?.[0]).toMatchObject({ workoutPlanId: plan.id, planNameSnapshot: saved, category: 'pads' })
})

test('preserves the open sheet draft through a corrupt week and listener retry', async ({ app, page }) => {
  const original = goal([category('one')])
  await app.open('/'); await app.seedWeekPlan(original)
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '1')
  await page.getByRole('link', { name: 'Plan tygodnia →', exact: true }).click()
  await add(page, 'pads'); await app.seedInvalidWeekPlan(weekStart)
  await form(page).getByRole('button', { name: 'Zapisz', exact: true }).click()
  await expect(form(page).getByRole('alert')).toBeVisible()
  await expect(form(page).getByRole('combobox', { name: 'Rodzaj treningu', exact: true })).toHaveValue('pads')
  await app.seedWeekPlan(original)
  await save(page)
  await expect.poll(async () => (await app.readWeekPlans())[0]?.schedule?.length).toBe(2)
})
