import AxeBuilder from '@axe-core/playwright'
import type { Page, Locator } from '@playwright/test'
import { test, expect } from './fixtures'
import { generateScheduledWeek } from '../src/domain/week-plan/scheduledWeek'
import type { WeekActivity } from '../src/domain/week-plan/weekPlan.types'
import { block, continuousExercise, workoutPlan } from '../src/test/workoutBuilders'
import { manualWorkoutSession } from '../src/test/manualWorkoutBuilder'

test.use({ screenshot: 'off', trace: 'off', viewport: { width: 390, height: 844 } })
const instant = '2026-11-19T10:00:00.000Z', current = '2026-11-16'
const club: WeekActivity = { id: 'club', day: 3, kind: 'club', disciplineKey: 'muay_thai', startTime: '19:00', endTime: '20:30', parts: ['technique'], clubName: null }

async function accessible(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}

async function reachablePrimary(action: Locator, cardMinHeight = 360) {
  await expect(action).toBeVisible()
  const bounds = await action.boundingBox()
  const card = action.locator('xpath=ancestor::section[1]')
  await expect(card).toHaveCSS('min-height', `${cardMinHeight}px`)
  const cardBounds = await card.boundingBox()
  expect(bounds!.y).toBeGreaterThan(cardBounds!.y)
  await expect(action).toHaveCSS('text-transform', 'uppercase')
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(776)
  expect(bounds!.height).toBeGreaterThanOrEqual(56)
  await expect(action).toHaveCSS('border-radius', '4px')
  await expect(action).toHaveCSS('background-image', /linear-gradient/)
}

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(instant)) })

for (const theme of ['dark', 'light'] as const) {
  test(`keeps storm cards, primary reach and the diamond menu accessible in ${theme}`, async ({ app, page }) => {
    await app.open('/'); await app.setTheme(theme)
    await expect(page.getByRole('heading', { level: 1, name: 'Start', exact: true })).toHaveCount(1)
    await expect(page.getByRole('main')).toHaveCount(1)
    const empty = page.getByRole('region', { name: 'Zacznij swój pierwszy trening', exact: true })
    await reachablePrimary(empty.getByRole('link', { name: 'Utwórz plan', exact: true }), 330)
    await expect(empty.locator('.storm-decoration')).toHaveCSS('pointer-events', 'none')
    await expect(empty.locator('.storm-decoration')).toHaveAttribute('aria-hidden', 'true')
    await expect(empty.locator('.storm-decoration')).toHaveCSS('opacity', '0.35')
    const navigation = page.getByRole('navigation', { name: 'Główna nawigacja', exact: true })
    const create = navigation.getByRole('button', { name: 'Trening', exact: true })
    const diamond = create.locator('.new-workout-diamond')
    await expect(diamond).toHaveCSS('width', '36px')
    await expect(diamond).toHaveCSS('transform', /matrix\(0\.707107, 0\.707107, -0\.707107, 0\.707107/)
    await expect(create.getByText('Trening', { exact: true })).toHaveCSS('top', '4px')
    expect((await create.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await create.click()
    await expect(page.getByRole('dialog', { name: 'Nowy trening', exact: true })).toBeVisible()
    await page.keyboard.press('Escape'); await expect(create).toBeFocused()
    await accessible(page)

    const plan = { ...workoutPlan([block('bag', [continuousExercise('bag', 60)], 'bag')]), id: 'bag', nameSnapshot: 'Worek 6 × 3 min' }
    await app.seedPlan(plan)
    const quick = page.getByRole('region', { name: 'Szybki start', exact: true })
    await reachablePrimary(quick.getByRole('link', { name: 'Rozpocznij plan', exact: true }))
    await expect(quick.locator('.storm-decoration')).toHaveCSS('opacity', '0.65')
    await accessible(page)

    await app.seedWeekPlan(generateScheduledWeek(current, { id: 'default', items: [club, { ...club, id: 'past', day: 1 }, { ...club, id: 'next', day: 5 }], createdAt: instant, updatedAt: instant }, new Date(instant)))
    await app.seedSession(manualWorkoutSession({ id: 'monday', workoutDate: '2026-11-16', rpe: 7 }))
    const today = page.getByRole('region', { name: 'Dziś · Muay Thai · 19:00', exact: true })
    await expect(today).toContainText('Dziś · czwartek, 19 listopada')
    await reachablePrimary(today.getByRole('link', { name: 'Wpisz trening po zajęciach', exact: true }))
    const week = page.getByRole('region', { name: 'Ten tydzień', exact: true })
    await expect(week.getByRole('img')).toHaveCount(7)
    for (const label of ['poniedziałek: wykonany', 'wtorek: nie byłem', 'środa: wolne', 'czwartek: zaplanowany, dziś']) {
      await expect(week.getByRole('img', { name: label, exact: true })).toBeVisible()
    }
    await expect(week.getByRole('progressbar')).toHaveCSS('height', '6px')
    await expect(page.locator('.rpe-badge')).toHaveText('RPE 7')
    for (const width of [320, 360, 390]) {
      await page.setViewportSize({ width, height: 844 })
      await accessible(page)
    }
  })

  test(`shows the unrated state and equal More tiles in ${theme}`, async ({ app, page }) => {
    await app.open('/progress'); await app.setTheme(theme)
    await app.seedFocusSkill({ id: 'guard', name: 'Garda po kopnięciu', criterion: 'Łokieć przy żebrach', archivedAt: null, openCorrection: null, createdAt: instant, updatedAt: instant })
    const skill = page.getByRole('link', { name: /Garda po kopnięciu/ })
    await expect(skill).toContainText('Jeszcze bez ocen')
    await expect(skill).toContainText('Ocenisz po najbliższym treningu')
    await expect(skill).not.toContainText('/5')
    await expect(skill.locator('.accent-fill')).toHaveCount(0)
    await expect(page.getByText('● trening · ◌ zaplanowany · ○ wolne', { exact: true })).toHaveCount(0)
    const tiles = page.getByRole('region', { name: 'Więcej', exact: true }).getByRole('button')
    await expect(tiles).toHaveCount(2)
    const sizes = await tiles.evaluateAll((elements) => elements.map((element) => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })))
    expect(sizes[0]).toEqual(sizes[1]); expect(sizes[0].height).toBe(112)
    await accessible(page)
  })

  test(`returns from another week with Today and hides it on the current week in ${theme}`, async ({ app, page }) => {
    await app.open(`/progress/week/${current}`); await app.setTheme(theme)
    const today = page.getByRole('link', { name: 'Dziś — Wróć do bieżącego tygodnia', exact: true })
    await expect(today).toHaveCount(0)
    await page.getByRole('link', { name: 'Następny tydzień', exact: true }).click()
    await expect(page).toHaveURL('/progress/week/2026-11-23')
    await expect(today).toHaveText('Dziś')
    const next = page.getByRole('link', { name: 'Następny tydzień', exact: true })
    expect((await today.boundingBox())!.x).toBeLessThan((await next.boundingBox())!.x)
    await expect(page.getByRole('list', { name: 'Dni planu tygodnia', exact: true }).getByText('wolne', { exact: true })).toHaveCount(7)
    await accessible(page)
    await today.click()
    await expect(page).toHaveURL(`/progress/week/${current}`)
    await expect(today).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Wstecz', exact: true })).toHaveCount(0)
    await page.goBack()
    await expect(page).toHaveURL('/progress/week/2026-11-23')
  })
}
