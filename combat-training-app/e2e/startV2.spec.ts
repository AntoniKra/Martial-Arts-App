import { selectRpe } from './rpeSlider'
import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'
import { test, expect } from './fixtures'
import { generateScheduledWeek } from '../src/domain/week-plan/scheduledWeek'
import type { WeekActivity } from '../src/domain/week-plan/weekPlan.types'
import { block, continuousExercise, roundsExercise, workoutPlan } from '../src/test/workoutBuilders'
import { manualWorkoutSession } from '../src/test/manualWorkoutBuilder'
import { sessionStep, workoutSession } from '../src/test/workoutSessionBuilders'
import { HOME_INTRO_SESSION_KEY } from '../src/features/home/homeIntro'

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

async function expectSingleLineLabels(labels: Locator) {
  await labels.first().page().evaluate(() => document.fonts.ready)
  expect(await labels.evaluateAll((elements) => elements.map((element) => {
    const range = document.createRange()
    range.selectNodeContents(element)
    const rects = range.getClientRects()
    return rects.length === 1 && rects[0].right <= element.parentElement!.getBoundingClientRect().right
  }))).toEqual(Array<boolean>(await labels.count()).fill(true))
}

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(instant)) })

for (const theme of ['dark', 'light'] as const) {
  test(`mockup A: card parameters, exact CSS, single timer row and unchanged Progress in ${theme}`, async ({ app, page }) => {
    // Mockup A is a phone layout; its exact values (min-height 360 px and others) apply below md.
    await page.setViewportSize({ width: 390, height: 844 })
    await app.open('/workouts'); await app.setTheme(theme)
    await app.seedPlan({ ...plan, blocks: [block('rounds', [roundsExercise('rounds', 6, 180, 60)])] })
    await app.seedWeekPlan(week([{ ...club, day: 3, clubName: 'Klub testowy' }, own]))
    await app.open('/')
    const quick = page.getByRole('region', { name: 'Szybki start', exact: true })
    await expect(quick.locator('.home-plan-badge')).toHaveText('Aktywny plan')
    await expect(quick.locator('.home-plan-badge')).toHaveCSS('color', theme === 'dark' ? 'rgb(240, 117, 58)' : 'rgb(154, 55, 14)')
    await expect(quick.locator('.home-plan-badge')).toHaveCSS('border-top-color', 'rgba(240, 117, 58, 0.35)')
    await expect(quick.locator('.home-plan-badge')).toHaveCSS('background-color', 'rgba(240, 117, 58, 0.1)')
    await expect(quick.locator('.home-param-chip')).toHaveText(['6 rund × 3 min', 'Przerwa 60 s', '23:00', '1 blok'])
    await expect(page.locator('.home-discipline-tag')).toHaveCount(0)
    const action = quick.getByRole('link', { name: 'Rozpocznij plan', exact: true })
    await expect(action).toHaveCSS('min-height', '56px')
    await expect(action).toHaveCSS('text-transform', 'uppercase')
    await expect(action).toHaveCSS('justify-content', 'center')
    await expect(action).toHaveCSS('font-size', '14px')
    await expect(action).toHaveCSS('letter-spacing', '0.84px')
    await expect(action).toHaveCSS('background-image', 'linear-gradient(135deg, rgb(88, 8, 20) 0%, rgb(117, 10, 26) 55%, rgb(136, 12, 30) 100%)')
    await expect(quick).toHaveCSS('min-height', '360px')
    await expect(quick).toHaveCSS('padding', '18px 16px 16px')
    await expect(quick.locator('.storm-decoration')).toHaveCSS('opacity', '0.65')
    await expect(quick.locator('.storm-decoration')).toHaveCSS('width', '320px')
    await expect(action).toHaveAttribute('aria-describedby', /.+/)
    // The weekly snapshot can remount Quick Start; resolve its current id in one DOM read.
    await expect.poll(() => action.evaluate((element) => document.getElementById(element.getAttribute('aria-describedby') ?? '')?.className)).toBe('sr-only')
    await expect(action).toHaveAccessibleDescription('Boks')
    await expect(weekCard(page).getByRole('img').first()).toHaveCSS('border-radius', '50%')
    await expect(weekCard(page).getByRole('img').first()).toHaveCSS('width', '26px')
    await expect(weekCard(page).getByText('So', { exact: true })).toHaveCSS('text-transform', 'none')
    const timerRow = page.locator('.home-other-plans')
    await expect(timerRow).toHaveCount(1)
    await expect(timerRow).toHaveAttribute('href', '/workouts')
    await expect(timerRow.locator('a')).toHaveCount(0)
    await timerRow.click()
    await page.getByRole('link', { name: 'Stoper rund', exact: true }).click()
    await expect(page).toHaveURL('/quick-timer')
    await app.open('/')
    await app.seedSession(manualWorkoutSession({ workoutDate: '2026-11-16', category: 'bag', parts: ['bag'], rpe: 0 }))
    const done = weekCard(page).getByRole('img', { name: 'poniedziałek: wykonany', exact: true })
    await expect(done).toHaveText('✓')
    await expect(page.locator('.home-session-status')).toContainText('Ukończony')
    await expect(page.locator('.home-recent-session .rpe-badge')).toHaveText('RPE 0')
    await accessible(page)
    await app.open('/progress')
    const progressDot = page.getByRole('img', { name: 'poniedziałek: wykonany', exact: true })
    await expect(progressDot).toHaveCSS('border-radius', '50%')
    await expect(progressDot).toHaveCSS('width', '26px')
    await expect(progressDot.locator('svg')).toHaveCount(1)
    await expect(page.locator('.home-week-day')).toHaveCount(0)
    await accessible(page)
  })

  test(`mockup A: club title, time and optional club chip in ${theme}`, async ({ app, page }) => {
    await app.open('/'); await app.setTheme(theme)
    await app.seedWeekPlan(week([{ ...club, clubName: 'Klub testowy' }]))
    const card = todayCard(page)
    await expect(card.getByRole('heading', { level: 2 })).toHaveText('Muay Thai')
    await expect(card.locator('.home-plan-badge')).toHaveText('Muay Thai · Klub')
    await expect(card.locator('.home-param-chip')).toHaveText(['19:00–20:30', 'Klub testowy'])
    await expect(card.locator('.storm-decoration')).toHaveCSS('opacity', '0.65')
    await expect(card.getByRole('link', { name: 'Wpisz trening po zajęciach', exact: true })).toHaveCSS('height', '56px')
    await accessible(page)
    await app.seedWeekPlan(week([club]))
    await expect(card.locator('.home-param-chip')).toHaveText(['19:00–20:30'])
    await accessible(page)
  })
}

test('review regression: legacy exact-plan credits agree on Start, Progress and the migrated week', async ({ app, page }) => {
  await app.open('/')
  await app.seedWeekPlan({ weekStart, items: [{ id: 'legacy', kind: 'plan', workoutPlanId: 'deleted-plan', planNameSnapshot: 'Plan historyczny' }],
    createdAt: new Date(instant).toISOString(), updatedAt: new Date(instant).toISOString(), editedAfterWeekEnd: false })
  await app.seedSession(manualWorkoutSession({ workoutDate: '2026-11-17', category: 'bag', parts: ['bag'] }))
  await expect(weekCard(page)).toContainText('Ukończone: 0 z 1 jednostki')
  await weekCard(page).getByRole('link', { name: 'Plan tygodnia →', exact: true }).click()
  await expect(page.getByText('0 z 1 treningów', { exact: true })).toBeVisible()
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  await expect(page.locator('.status-badge').filter({ hasText: /^Plan$/ })).toBeVisible()
  expect((await app.readWeekPlans())[0].schedule).toBeUndefined()
  await page.getByRole('region', { name: 'Dowolny dzień · kiedy pasuje', exact: true }).getByRole('button', { name: 'Dodaj', exact: true }).click()
  const sheet = page.getByRole('form', { name: 'Dodaj lub edytuj trening', exact: true })
  await sheet.getByRole('combobox', { name: 'Rodzaj treningu', exact: true }).selectOption('pads')
  await sheet.getByRole('button', { name: 'Zapisz', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect.poll(async () => (await app.readWeekPlans())[0].schedule?.[0]?.legacyGoal?.kind).toBe('plan')
  await expect(page.getByText('0 z 2 treningów', { exact: true })).toBeVisible()
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  await app.seedSession(workoutSession({ id: 'exact-completed', workoutPlanId: 'deleted-plan', workoutDate: '2026-11-17', category: 'bag', durationSeconds: 60 }))
  await expect(page.getByText('✓ Zaliczone', { exact: true })).toHaveCount(1)
  await expect(page.getByText('1 z 2 treningów', { exact: true })).toBeVisible()
  await app.open('/')
  await expect(weekCard(page)).toContainText('Ukończone: 1 z 2 jednostek')
  await app.open('/progress')
  // Progress C (#180) shows completed vs planned workouts in the first tile instead of the old summary line.
  await expect(page.getByLabel('Ten tydzień w liczbach', { exact: true })).toContainText('1 / 2')
})
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
    await expect(entry).toHaveCSS('text-transform', 'uppercase')
    expect(action!.y).toBeGreaterThan((await todayCard(page).boundingBox())!.y)
    expect(action!.y + action!.height).toBeLessThan(844 - 72)
    await expect(weekCard(page).getByRole('link', { name: '+ Wykonaj w dowolny dzień: Worek', exact: true })).toHaveAttribute('href', `/progress/week/${weekStart}#flexible-workouts`)
    await expect(weekCard(page).getByRole('link', { name: /^Stoper i inne plany/ })).toHaveAttribute('href', '/workouts')
    await expect(weekCard(page)).toContainText('Ukończone: 0 z 2 jednostek')
    await expect(page.getByRole('img', { name: 'wtorek: zaplanowany, dziś', exact: true })).toBeVisible()
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
    await expect(form(page).getByRole('slider', { name: 'RPE od 0 do 10' })).toHaveAttribute('aria-valuetext', 'Nie wybrano RPE')
    const sparring = form(page).getByRole('region', { name: 'Szczegóły sparingu', exact: true })
    await expect(sparring.getByRole('radio', { checked: true })).toHaveCount(0)
    await expect(sparring.getByRole('spinbutton')).toHaveValue('')
    await selectRpe(form(page), 7)
    await sparring.getByRole('radio', { name: /^Techniczny/ }).check()
    await form(page).getByRole('button', { name: 'Zapisz', exact: true }).click()
    await expect(page).toHaveURL('/')
    await expect(todayCard(page)).toContainText('✓ Zaliczone')
    await expect(todayCard(page).getByRole('link', { name: 'Wpisz trening po zajęciach', exact: true })).toHaveCount(0)
    await expect(weekCard(page)).toContainText('Ukończone: 1 z 2 jednostek')
    const lastSession = page.getByRole('region', { name: 'Ostatnia sesja', exact: true })
    await expect(lastSession).toContainText('90 min')
    await expect(lastSession.locator('.rpe-badge')).toHaveText('RPE 7')
    await expect.poll(async () => (await app.readSessions()).length).toBe(1)
    await accessible(page)
  })

  test(`shows a rest day, the next club class and quick start in ${theme}`, async ({ app, page }) => {
    await page.clock.setFixedTime(new Date('2026-11-18T10:00:00Z'))
    await app.open('/workouts'); await app.setTheme(theme); await app.seedPlan(plan)
    await app.seedWeekPlan(week([{ ...club, day: 3 }, { id: 'rest', kind: 'rest', day: 2 }, own]))
    await app.open('/')
    await expect(page.locator('.home-next-workout')).toContainText('Następny: Muay Thai')
    const quick = page.getByRole('region', { name: 'Szybki start', exact: true })
    await expect(quick.getByRole('link', { name: 'Rozpocznij plan', exact: true })).toHaveAttribute('href', '/workouts/bag/active')
    await expect(quick.getByRole('link', { name: 'Stoper', exact: true })).toHaveAttribute('href', '/quick-timer')
    await expect(quick.getByRole('link', { name: /^Trening w klubie/ })).toHaveAttribute('href', '/workout-sessions/new')
    await expect(page.getByRole('img', { name: 'środa: wolne, dziś', exact: true })).toBeVisible()
    await accessible(page)
    // Owner review of #205: quick start tiles and the card badge stay on one line on narrow phones.
    await page.setViewportSize({ width: 360, height: 800 })
    await expectSingleLineLabels(quick.locator('.home-plan-badge, .home-action-tiles a > span:last-child'))
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

for (const theme of ['dark', 'light'] as const) {
  test(`@issue204 shows the oldest club first and discloses other tasks in ${theme}`, async ({ app, page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await app.open('/')
    await app.setTheme(theme)
    await app.seedWeekPlan(week([club], '2026-11-09'))
    await app.seedWeekPlan(week([{ ...club, disciplineKey: 'k1', day: 0 }]))
    const completedAt = '2026-11-16T20:00:00.000Z'
    const session = workoutSession({ workoutPlanNameSnapshot: 'Boks — technika i siła', stepResults: [sessionStep()],
      workoutDate: '2026-11-16', startedAt: '2026-11-16T19:00:00.000Z', completedAt, createdAt: completedAt, updatedAt: completedAt })
    await app.seedSession(session)

    const todo = page.getByRole('region', { name: 'Do uzupełnienia', exact: true })
    const expander = todo.getByRole('button', { name: /^\+2 więcej Pozostałe zadania$/i })
    const rate = todo.getByRole('link', { name: /^Oceń trening \(RPE\)/ })
    const write = todo.getByRole('link', { name: 'Wpisz', exact: true })
    await expect(todo.locator('.todo-section-header .home-neutral-badge')).toHaveText('3 zadania')
    await expect(todo.getByText('wt 10.11 · Muay Thai · klub', { exact: true })).toBeVisible()
    await expect(expander).toHaveAttribute('aria-expanded', 'false')
    await expect(expander).toHaveCSS('min-height', '44px')
    await expect(expander).toHaveAttribute('aria-controls', /.+/)
    await expect(rate).toHaveCount(0)
    await expect(write).toHaveCount(1)
    await expectSingleLineLabels(todo.locator('.home-neutral-badge:visible, .todo-more-pill, .home-secondary-action:visible > span:last-child'))
    await accessible(page)
    await expander.click()
    await expect(expander).toHaveAttribute('aria-expanded', 'true')
    await expect(todo.getByText('pon 16.11 · K-1 · klub', { exact: true })).toBeVisible()
    await expect(rate).toHaveAttribute('href', `/workout-sessions/${session.id}/feedback?rpe=1`)
    await expect(rate).toContainText('Boks — technika i siła · pon 16.11')
    await accessible(page)
    await expander.click()

    await write.click()
    await expect(form(page).getByLabel('Data', { exact: true })).toHaveValue('2026-11-10')
    await expect(form(page).getByRole('radio', { name: 'Muay Thai', exact: true })).toBeChecked()
    await expect(form(page).getByRole('radio', { name: '90 min', exact: true })).toBeChecked()
    await expect(form(page).getByRole('checkbox', { checked: true })).toHaveCount(3)
    await page.getByRole('button', { name: 'Zamknij', exact: true }).click()
    await expect(page).toHaveURL('/')
    await todo.getByRole('button', { name: 'Nie byłem', exact: true }).click()
    await expect.poll(async () => (await app.readWeekPlans()).find((plan) => plan.weekStart === '2026-11-09')?.schedule?.[0].omitted).toBe(true)
    const singleRemaining = todo.getByRole('button', { name: /^\+1 więcej Ocena RPE sesji$/i })
    await expect(singleRemaining).toHaveAttribute('aria-expanded', 'false')
    await singleRemaining.click()
    await rate.click()
    await expect(page.getByRole('heading', { name: 'Jak ciężki był cały trening?', exact: true })).toBeVisible()
  })
}

test('moves only this week with undo and consciously skips today from home', async ({ app, page }) => {
  await app.open('/'); await app.seedWeekPlan(week([club]))
  await expect(todayCard(page)).toBeVisible()
  await todayCard(page).getByRole('button', { name: 'Przenieś dzień', exact: true }).click()
  await todayCard(page).getByRole('combobox', { name: 'Przenieś na…', exact: true }).selectOption('3')
  await expect(todayCard(page)).toHaveCount(0)
  await expect(page.locator('.home-next-workout')).toContainText('Następny: Muay Thai')
  // The move must reach the emulator before the week is re-seeded, or the late write overwrites the seed.
  await expect.poll(async () => (await app.readWeekPlans()).find((plan) => plan.weekStart === weekStart)?.schedule?.[0]).toMatchObject({ day: 3 })
  await weekCard(page).getByRole('link', { name: 'Plan tygodnia →', exact: true }).click()
  await expect(page.getByRole('listitem', { name: 'Czwartek 2026-11-19', exact: true })).toContainText('Muay Thai')
  await page.getByRole('navigation', { name: 'Główna nawigacja', exact: true }).getByRole('link', { name: 'Start', exact: true }).click()
  // Returning mounts the same weekly actions; undo is local to that mounted view.
  await app.open('/')
  await app.seedWeekPlan(week([club]))
  await expect(todayCard(page)).toBeVisible()
  await todayCard(page).getByRole('button', { name: 'Przenieś dzień', exact: true }).click()
  await todayCard(page).getByRole('combobox', { name: 'Przenieś na…', exact: true }).selectOption('3')
  await expect(todayCard(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Cofnij', exact: true }).click()
  await expect(todayCard(page)).toBeVisible()
  await todayCard(page).getByRole('button', { name: 'Nie byłem', exact: true }).click()
  await expect(todayCard(page)).toHaveCount(0)
  await expect(page.getByRole('img', { name: 'wtorek: nie byłem, dziś', exact: true })).toBeVisible()
  await expect.poll(async () => (await app.readWeekPlans()).find((plan) => plan.weekStart === weekStart)?.schedule?.[0]).toMatchObject({ day: 1, omitted: true })
  await weekCard(page).getByRole('link', { name: 'Plan tygodnia →', exact: true }).click()
  await expect(page.getByRole('listitem', { name: 'Wtorek 2026-11-17', exact: true })).toContainText('– Nie byłem')
  expect(await app.readRecurringWeek()).toBeUndefined()
})

for (const theme of ['dark', 'light'] as const) {
  for (const ending of ['tap', 'timeout', 'reduced'] as const) {
    test(`greeting is non-blocking, once per session, ending with ${ending} in ${theme}`, async ({ app, page }) => {
      await app.open('/workouts'); await app.setTheme(theme); await app.seedPlan(plan)
      await app.seedWeekPlan(week([club]))
      await app.open('/')
      await expect(todayCard(page)).toBeVisible()
      const navigation = page.getByRole('navigation', { name: 'Główna nawigacja', exact: true })
      await navigation.getByRole('link', { name: 'Postęp', exact: true }).click()
      await expect(page.locator('.home-view')).toHaveCount(0)
      await page.emulateMedia({ reducedMotion: ending === 'reduced' ? 'reduce' : 'no-preference' })
      await page.evaluate((key) => sessionStorage.removeItem(key), HOME_INTRO_SESSION_KEY)
      await page.clock.install({ time: new Date(instant) })
      await page.clock.pauseAt(new Date(new Date(instant).getTime() + 1000))
      await navigation.getByRole('link', { name: 'Start', exact: true }).click()
      await page.clock.runFor(50)
      const root = page.locator('.home-view')
      const spark = todayCard(page).locator('.home-intro-spark')
      await expect(todayCard(page).getByRole('link', { name: 'Wpisz trening po zajęciach', exact: true })).toBeVisible()
      if (ending === 'reduced') {
        await expect(root).not.toHaveAttribute('data-home-intro')
        await expect(spark).toBeHidden()
        expect(await page.evaluate((key) => sessionStorage.getItem(key), HOME_INTRO_SESSION_KEY)).toBeNull()
        expect(await todayCard(page).evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0)
        return
      }
      // React may commit the ready card after the first clock frame.
      await expect.poll(async () => {
        await page.clock.runFor(16)
        return {
          intro: await root.getAttribute('data-home-intro'),
          claimed: await page.evaluate((key) => sessionStorage.getItem(key), HOME_INTRO_SESSION_KEY),
          reduced: await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
        }
      }).toEqual({ intro: 'true', claimed: 'true', reduced: false })
      await expect(spark).toHaveCSS('pointer-events', 'none')
      await expect(spark).toHaveCSS('animation-duration', '0.8s')
      if (ending === 'tap') {
        // The same tap dismisses the greeting and executes the underlying action.
        await todayCard(page).getByRole('button', { name: 'Przenieś dzień', exact: true }).click()
        await expect(todayCard(page).getByRole('combobox', { name: 'Przenieś na…', exact: true })).toBeVisible()
      } else {
        await page.clock.runFor(800)
      }
      await expect(root).not.toHaveAttribute('data-home-intro')
      await expect(spark).toBeHidden()
      expect(await page.evaluate((key) => sessionStorage.getItem(key), HOME_INTRO_SESSION_KEY)).toBe('true')
      // Auth/Firestore boot after a reload needs its normal timers again.
      await page.clock.resume()
      await page.getByRole('navigation', { name: 'Główna nawigacja', exact: true }).getByRole('link', { name: 'Postęp', exact: true }).click()
      await page.getByRole('navigation', { name: 'Główna nawigacja', exact: true }).getByRole('link', { name: 'Start', exact: true }).click()
      await expect(todayCard(page)).toBeVisible()
      await expect(root).not.toHaveAttribute('data-home-intro')
      await app.open('/')
      await expect(todayCard(page)).toBeVisible()
      await expect(root).not.toHaveAttribute('data-home-intro')
      await expect(spark).toBeHidden()
    })
  }
}

for (const theme of ['dark', 'light'] as const) {
  test(`@issue204 renders the empty Start and library entry in ${theme}`, async ({ app, page }) => {
    await app.open('/')
    await app.setTheme(theme)
    const empty = page.getByRole('region', { name: 'Zacznij swój pierwszy trening', exact: true })
    const library = page.getByRole('link', { name: /^Baza ćwiczeń i kombinacji/ })
    await expect(empty).toContainText('Pierwszy krok')
    await expect(empty).toContainText('Nowy profil')
    await expect(empty).toHaveCSS('min-height', '330px')
    await expect(empty.getByRole('heading')).toHaveCSS('font-size', '26px')
    await expect(empty.locator('.storm-decoration')).toHaveCSS('opacity', '0.35')
    await expect(empty.getByRole('link', { name: 'Utwórz plan', exact: true })).toHaveAttribute('href', '/workouts/new')
    await expect(empty.getByRole('link', { name: 'Stoper', exact: true })).toHaveAttribute('href', '/quick-timer')
    await expect(library).toHaveAttribute('href', '/exercises')
    await expect(page.getByRole('region')).toHaveCount(1)
    for (const width of [360, 390]) {
      await page.setViewportSize({ width, height: width === 360 ? 800 : 844 })
      await expectSingleLineLabels(empty.locator('.home-neutral-badge, .home-action-tiles a > span:last-child, .home-primary-action > span'))
      await accessible(page)
    }
    await library.click()
    await expect(page).toHaveURL('/exercises')
    await app.open('/')
    await empty.getByRole('link', { name: 'Trening w klubie', exact: true }).click()
    await expect(form(page)).toBeVisible()
    await expect(form(page).getByRole('checkbox', { checked: true })).toHaveCount(0)
    await expect(form(page).getByRole('slider', { name: 'RPE od 0 do 10' })).toHaveAttribute('aria-valuetext', 'Nie wybrano RPE')
  })
}

test('does not overwrite a corrupt week or invent progress and recovers after a valid snapshot', async ({ app, page }) => {
  await app.open('/'); await app.seedInvalidWeekPlan(weekStart)
  await expect(page.getByRole('alert')).toContainText('Nie udało się odczytać lub zapisać')
  await expect(weekCard(page)).toHaveCount(0)
  await expect(todayCard(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Spróbuj ponownie', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await app.seedWeekPlan(week([club]))
  await expect(todayCard(page)).toBeVisible()
  await expect(weekCard(page)).toContainText('Ukończone: 0 z 1 jednostki')
})

test('creates the current snapshot from existing recurring classes when home is first opened', async ({ app, page }) => {
  await app.open(`/progress/week/${weekStart}`)
  await page.getByRole('button', { name: /^Stały tydzień/ }).click()
  await page.getByRole('button', { name: 'Dodaj trening: wtorek', exact: true }).click()
  const editor = page.getByRole('form', { name: 'Dodaj lub edytuj trening', exact: true })
  await editor.getByRole('radio', { name: 'Muay Thai', exact: true }).check()
  await editor.getByLabel('Od', { exact: true }).fill('19:00')
  await editor.getByLabel('Do', { exact: true }).fill('20:30')
  await editor.getByRole('button', { name: 'Technika', exact: true }).click()
  await editor.getByRole('button', { name: 'Zapisz', exact: true }).click()
  await expect.poll(async () => (await app.readRecurringWeek())?.items.length).toBe(1)
  await page.getByRole('navigation', { name: 'Główna nawigacja', exact: true }).getByRole('link', { name: 'Start', exact: true }).click()
  await expect(todayCard(page)).toBeVisible()
  await expect.poll(async () => (await app.readWeekPlans()).find((plan) => plan.weekStart === weekStart)?.schedule?.length).toBe(1)
})
