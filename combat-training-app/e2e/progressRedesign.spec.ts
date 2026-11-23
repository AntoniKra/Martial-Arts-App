import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'
import type { FocusSkill } from '../src/domain/focus-skill/focusSkill.types'
import { manualWorkoutSession } from '../src/test/manualWorkoutBuilder'

const instant = '2026-11-18T12:00:00.000Z'
const weekStart = '2026-11-16'
test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(instant)) })

test('aligns the weekly tiles at both phone widths in both themes', async ({ app, page }, info) => {
  await app.open('/progress')
  const summary = page.getByRole('region', { name: 'Ten tydzień w liczbach', exact: true })
  const workouts = summary.getByRole('term').filter({ hasText: /^Treningi w tygodniu$/i })
  const progress = summary.getByRole('progressbar', { name: 'Plan tygodnia', exact: true })
  await app.seedSession(manualWorkoutSession({ workoutDate: weekStart, category: 'sparring', parts: ['sparring'],
    sparring: [{ blockId: null, intensity: 'technical', rounds: null }] }))
  await expect(workouts.locator('..').getByRole('definition')).toHaveText('1')
  await expect(progress).toHaveCount(0)
  await expect(summary.getByText('W 1 treningu liczba rund nieznana.', { exact: true })).toBeVisible()
  await app.seedWeekPlan({ weekStart, items: [], schedule: [], targetCount: 3, createdAt: instant, updatedAt: instant, editedAfterWeekEnd: false })
  await expect(progress).toHaveAttribute('aria-valuetext', '1 z 3')
  const cards = ['Plan tygodnia', 'minut', 'rund sparingu'].map((label) =>
    summary.getByRole('term').filter({ hasText: new RegExp(`^${label}$`, 'i') }).locator('..'))
  await expect(cards[2].getByRole('definition')).toHaveText('?')
  const viewport = page.viewportSize()!
  for (const width of info.project.name === 'phone' ? [360, 390] : [viewport.width]) {
    await page.setViewportSize({ ...viewport, width })
    for (const theme of ['dark', 'light'] as const) {
      await app.setTheme(theme)
      await page.evaluate(() => document.fonts.ready)
      const [large, top, bottom] = await Promise.all(cards.map((card) => card.boundingBox()))
      if (!large || !top || !bottom) throw new Error('Expected all three weekly tiles to have a bounding box')
      expect(Math.abs(large.y - top.y)).toBeLessThanOrEqual(1)
      expect(Math.abs(large.y + large.height - bottom.y - bottom.height)).toBeLessThanOrEqual(1)
      expect(Math.abs(top.height - bottom.height)).toBeLessThanOrEqual(1)
      expect(top.x).toBeGreaterThanOrEqual(large.x + large.width)
      expect(Math.abs(top.x - bottom.x)).toBeLessThanOrEqual(1)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    }
  }
})

test('presents the same seven available-plan day states on Start and Progress', async ({ app, page }) => {
  await app.open('/')
  const own = { kind: 'own' as const, category: 'bag' as const, workoutPlanId: null, planNameSnapshot: null, omitted: false }
  await app.seedWeekPlan({ weekStart, items: [], targetCount: 3, createdAt: instant, updatedAt: instant, editedAfterWeekEnd: false,
    schedule: [
      { ...own, id: 'past', day: 1 },
      { ...own, id: 'upcoming', day: 3 },
      { ...own, id: 'omitted', day: 4, omitted: true },
    ] })
  await app.seedSession(manualWorkoutSession({ workoutDate: weekStart }))
  const days = page.getByRole('region', { name: 'Ten tydzień', exact: true }).getByRole('img')
  const states = [
    'poniedziałek: wykonany', 'wtorek: nie byłem', 'środa: wolne, dziś', 'czwartek: zaplanowany',
    'piątek: nie byłem', 'sobota: wolne', 'niedziela: wolne',
  ]
  await expect(days).toHaveCount(states.length)
  for (const [index, state] of states.entries()) await expect(days.nth(index)).toHaveAttribute('aria-label', state)
  await app.open('/progress')
  await expect(days).toHaveCount(states.length)
  for (const [index, state] of states.entries()) await expect(days.nth(index)).toHaveAttribute('aria-label', state)
  await expect(days.first()).toHaveText('✓')
  await expect(days.nth(3)).toHaveCSS('border-top-style', 'dashed')
  const row = await days.first().evaluate((dot) => {
    const ribbon = dot.parentElement!.parentElement!
    const first = dot.getBoundingClientRect()
    const lastDot = ribbon.lastElementChild!.querySelector('[role="img"]')!
    const axis = getComputedStyle(ribbon, '::before')
    const box = ribbon.getBoundingClientRect()
    return {
      first: first.x + first.width / 2 - box.x,
      last: box.right - lastDot.getBoundingClientRect().right + lastDot.getBoundingClientRect().width / 2,
      center: first.y + first.height / 2 - box.y,
      lineLeft: parseFloat(axis.left) + ribbon.clientLeft,
      lineRight: parseFloat(axis.right) + ribbon.clientLeft,
      lineCenter: parseFloat(axis.top) + parseFloat(axis.height) / 2 + ribbon.clientTop,
    }
  })
  expect(Math.abs(row.first - row.lineLeft)).toBeLessThanOrEqual(1)
  expect(Math.abs(row.last - row.lineRight)).toBeLessThanOrEqual(1)
  expect(Math.abs(row.center - row.lineCenter)).toBeLessThanOrEqual(1)
})

test('shows only an open note from an active skill and keeps the More rows expandable', async ({ app, page }) => {
  await app.open('/progress')
  const skill: FocusSkill = { id: 'guard', name: 'Powrót do gardy', criterion: 'Ręka wraca do brody',
    createdAt: instant, updatedAt: instant, archivedAt: null,
    openCorrection: { problem: 'Opuszczam rękę', fix: 'Dotykam brody', sessionId: 'current', workoutDate: weekStart } }
  await app.seedSession(manualWorkoutSession({ id: 'current', workoutDate: weekStart }))
  await app.seedFocusSkill({ ...skill, id: 'archived', name: 'Starszy cel', archivedAt: instant,
    openCorrection: { ...skill.openCorrection!, workoutDate: '2026-11-17', problem: 'Schowana notatka' } })
  await app.seedFocusSkill(skill)
  const note = page.getByRole('link', { name: /Ostatnia notatka · 16\.11.*Opuszczam rękę.*Dotykam brody/i })
  await expect(note).toHaveAttribute('href', /workout-sessions\/current\/edit$/)
  await expect(page.getByText('Schowana notatka', { exact: false })).toHaveCount(0)
  await app.seedFocusSkill({ ...skill, openCorrection: null })
  await expect(note).toHaveCount(0)
  const more = page.getByRole('region', { name: 'Więcej', exact: true })
  const sparring = more.getByRole('button', { name: /^Sparing .*4 tyg/ })
  await expect(sparring).toHaveAttribute('aria-expanded', 'false')
  await sparring.click()
  await expect(sparring).toHaveAttribute('aria-expanded', 'true')
  await expect(more.getByRole('region', { name: 'Statystyki', exact: true })).toBeVisible()
  await sparring.click()
  await expect(more.getByRole('region', { name: 'Statystyki', exact: true })).toHaveCount(0)
  await expect(more.getByRole('button', { name: /^(Samopoczucie|Masa ciała)/ })).toHaveCount(0)
})
