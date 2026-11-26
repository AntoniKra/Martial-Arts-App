import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'
import { block, continuousExercise, workoutPlan } from '../src/test/workoutBuilders'
import { sessionStep, workoutSession } from '../src/test/workoutSessionBuilders'
import { manualWorkoutSession } from '../src/test/manualWorkoutBuilder'
import { generateScheduledWeek } from '../src/domain/week-plan/scheduledWeek'
import type { WeekActivity } from '../src/domain/week-plan/weekPlan.types'

test.use({ screenshot: 'off', trace: 'off', video: 'off' })
const instant = '2026-11-17T10:00:00Z', weekStart = '2026-11-16'
const plan = { ...workoutPlan([block('bag', [continuousExercise('exercise', 60)], 'bag')]), id: 'bag', nameSnapshot: 'Moj worek' }
const back = (page: Page) => page.getByRole('button', { name: 'Wstecz', exact: true })
const close = (page: Page) => page.getByRole('button', { name: 'Zamknij', exact: true })
async function expectBackChevron(page: Page) {
  await expect(back(page)).toHaveCSS('width', '44px')
  await expect(back(page)).toHaveCSS('height', '44px')
  await expect(back(page).locator('svg[aria-hidden="true"] path')).toHaveAttribute('d', 'm15 18-6-6 6-6')
}
async function accessible(page: Page) {
  await expect(page.locator('h1')).toHaveCount(1)
  // Colour transitions (motion tokens) must settle before axe samples contrast.
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((animation) => Number.isFinite(animation.effect?.getComputedTiming().endTime ?? Infinity))
    .map((animation) => animation.finished.catch(() => undefined))))
  expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(instant)) })

for (const theme of ['dark', 'light'] as const) {
  test(`A/B/C: main tabs, hidden Start and contextual or direct back in ${theme}`, async ({ app, page }) => {
    await app.open('/workouts'); await app.seedPlan(plan); await app.setTheme(theme); await app.open('/')
    await expect(page.locator('h1')).toHaveText('Start')
    await expect(page.locator('h1')).toHaveClass('sr-only')
    const nav = page.getByRole('navigation', { name: 'Główna nawigacja', exact: true })
    for (const name of ['Plan', 'Postęp', 'Profil']) {
      await nav.getByRole('link', { name, exact: true }).click()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(name === 'Plan' ? 'Plan tygodnia' : name)
      await expect(back(page)).toHaveCount(0)
      await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-size', '28px')
      await accessible(page)
    }
    await app.open('/')
    await page.getByRole('link', { name: 'Stoper', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Szybki stoper')
    await expectBackChevron(page)
    await accessible(page)
    await back(page).click(); await expect(page).toHaveURL('/')
    await app.open('/exercises')
    await expectBackChevron(page)
    await accessible(page)
    await back(page).click(); await expect(page).toHaveURL('/workouts')
    await page.getByRole('link', { name: 'Postęp', exact: true }).click()
    await page.getByRole('radio', { name: 'Historia', exact: true }).check()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Postęp')
    await accessible(page)
    await expect(back(page)).toHaveCount(0)
    await page.getByRole('radio', { name: 'Wykresy', exact: true }).check()
    await expect(page).toHaveURL('/progress')
  })

  test(`C/D: plan details, form close and discard focus in ${theme}`, async ({ app, page }) => {
    await app.open('/workouts'); await app.setTheme(theme); await app.seedPlan(plan)
    await page.getByRole('link', { name: 'Zobacz plan', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(plan.nameSnapshot)
    await expectBackChevron(page)
    await accessible(page)
    await page.getByRole('link', { name: 'Edytuj plan', exact: true }).click()
    await expect(close(page)).toHaveCSS('height', '44px')
    await expect(back(page)).toHaveCount(0)
    await page.getByRole('button', { name: /^Dane planu: / }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dane planu')
    await page.getByRole('textbox', { name: 'Nazwa planu' }).fill('Niezapisana nazwa')
    await accessible(page)
    await close(page).click()
    await expect(page.getByRole('button', { name: /^Dane planu: / })).toBeFocused()
    await accessible(page)
    await close(page).click()
    const dialog = page.getByRole('dialog', { name: 'Odrzucić zmiany?', exact: true })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Wróć do edycji', exact: true })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(close(page)).toBeFocused()
    await expect(page.getByRole('button', { name: /^Dane planu: / })).toContainText('Niezapisana nazwa')
    await close(page).click()
    await dialog.getByRole('button', { name: 'Odrzuć zmiany', exact: true }).click()
    await expect(page).toHaveURL(`/workouts/${plan.id}`)
  })

  test(`D: exercise form confirms closing without saving in ${theme}`, async ({ app, page }) => {
    await app.open('/exercises'); await app.setTheme(theme)
    await page.getByRole('button', { name: 'Nowe ćwiczenie', exact: true }).click()
    await page.getByRole('textbox', { name: 'Nazwa ćwiczenia', exact: true }).fill('Niezapisane cwiczenie')
    await accessible(page)
    await close(page).click()
    const dialog = page.getByRole('dialog', { name: 'Odrzucić zmiany?', exact: true })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(close(page)).toBeFocused()
    await close(page).click()
    await dialog.getByRole('button', { name: 'Odrzuć zmiany', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Moje ćwiczenia')
    expect(await app.readExercises()).toEqual([])
  })

  test(`E: live header has one exit and centered progress in ${theme}`, async ({ app, page }) => {
    await app.open('/workouts'); await app.setTheme(theme); await app.seedPlan(plan)
    await app.open(`/workouts/${plan.id}`); await app.openPlayer()
    const header = page.getByRole('main').locator('header')
    await expect(header.getByRole('button')).toHaveCount(1)
    await expect(header).toContainText('Etap 1 z 1')
    await expect(header.getByRole('link')).toHaveCount(0)
    await app.startWorkout()
    await accessible(page)
    await header.getByRole('button', { name: 'Zakończ trening', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Zakończyć trening?', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Pauza', exact: true })).toBeVisible()
  })

  test(`Start shows next and every flexible card, then removes completed cards in ${theme}`, async ({ app, page }) => {
    const items: WeekActivity[] = [
      { id: 'club', kind: 'club', day: 3, disciplineKey: 'kickboxing', startTime: '18:00', endTime: '19:30', clubName: null, parts: ['technique'] },
      { id: 'own', kind: 'own', day: null, category: 'bag', workoutPlanId: plan.id, planNameSnapshot: plan.nameSnapshot },
      { id: 'own2', kind: 'own', day: null, category: 'conditioning', workoutPlanId: null, planNameSnapshot: null },
    ]
    await app.open('/workouts'); await app.setTheme(theme); await app.seedPlan(plan)
    await app.seedWeekPlan(generateScheduledWeek(weekStart, { id: 'default', items, createdAt: instant, updatedAt: instant }, new Date(instant)))
    await app.open('/')
    const week = page.getByRole('region', { name: 'Ten tydzień', exact: true })
    await expect(week).toContainText('Ukończone: 0 z 3 jednostek')
    await expect(week).toContainText('Postęp: 0%')
    await expect(week.locator('.home-next-workout')).toContainText('Następny: Kickboxing')
    const next = week.getByRole('link', { name: /czwartek.*Kickboxing/ })
    await expect(next).toContainText('klub · 18:00–19:30')
    const flexible = week.getByRole('region', { name: 'W dowolny dzień tego tygodnia', exact: true })
    await expect(flexible.getByRole('link')).toHaveCount(2)
    await accessible(page)
    await next.click()
    await expect(page).toHaveURL(`/progress/week/${weekStart}?day=2026-11-19#day-2026-11-19`)
    await expect(page.getByRole('listitem', { name: 'Czwartek 2026-11-19', exact: true })).toBeFocused()
    await expect(back(page)).toHaveCount(0)
    await page.getByRole('link', { name: 'Start', exact: true }).click(); await expect(page).toHaveURL('/')
    await flexible.getByRole('link').first().click()
    await expect(page).toHaveURL(`/progress/week/${weekStart}#flexible-workouts`)
    await page.getByRole('link', { name: 'Start', exact: true }).click()
    await app.seedSession(workoutSession({ workoutPlanId: plan.id, workoutDate: '2026-11-17', startedAt: new Date(instant).toISOString(), completedAt: '2026-11-17T10:01:00.000Z', category: 'bag', stepResults: [sessionStep({ blockType: 'bag' })] }))
    await expect(flexible.getByRole('link')).toHaveCount(1)
    await app.seedSession(manualWorkoutSession({ id: 'conditioning', workoutDate: '2026-11-17', category: 'conditioning', parts: ['conditioning'] }))
    await expect(flexible).toHaveCount(0)
    await app.seedSession(manualWorkoutSession({ id: 'club-done', workoutDate: '2026-11-19', disciplineKey: 'kickboxing', category: 'technique', parts: ['technique'] }))
    await expect(week.locator('.home-next-workout')).toHaveCount(0)
  })
}

test('Start omits both sections when this week has no outstanding next or flexible workout', async ({ app, page }) => {
  await app.open('/workouts'); await app.seedPlan(plan)
  await app.open('/')
  const week = page.getByRole('region', { name: 'Ten tydzień', exact: true })
  await expect(week.locator('.home-next-workout')).toHaveCount(0)
  await expect(week.getByRole('region', { name: 'W dowolny dzień tego tygodnia', exact: true })).toHaveCount(0)
  await accessible(page)
})
