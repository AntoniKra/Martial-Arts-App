import AxeBuilder from '@axe-core/playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { Page, TestInfo } from '@playwright/test'
import { test, expect } from './fixtures'
import type { FocusSkill } from '../src/domain/focus-skill/focusSkill.types'
import type { FocusRating } from '../src/domain/workout-session/workoutSession.types'
import { block, continuousExercise, workoutPlan } from '../src/test/workoutBuilders'
import { sessionStep, workoutSession } from '../src/test/workoutSessionBuilders'

const instant = '2026-11-01T10:00:00.000Z'
const skill: FocusSkill = { id: 'guard', name: 'Powrót do gardy', criterion: 'Ręka wraca do brody.',
  archivedAt: null, createdAt: instant, updatedAt: instant,
  openCorrection: { problem: 'Opuszczam rękę.', fix: 'Dotykam rękawicą policzka.', sessionId: 'old', workoutDate: '2026-11-01' } }
const rating = (assessment: FocusRating['assessment'], changes: Partial<FocusRating> = {}): FocusRating => ({
  workoutItemId: 'first', focusSkillId: skill.id, skillNameSnapshot: skill.name, criterionSnapshot: skill.criterion,
  blockType: 'bag', assessment, correction: null, previousCorrectionCheck: null, ...changes,
})
const plan = { ...workoutPlan([block('bag', [{ ...continuousExercise('first', 60), focusSkillId: skill.id }], 'bag')]),
  id: 'bag-plan', nameSnapshot: 'Worek' }

async function capture(page: Page, info: TestInfo, name: string) {
  if (process.env.CAPTURE_SCREENSHOTS !== '1' || info.project.name !== 'phone') return
  const folder = path.resolve('docs/screenshots/issue-76')
  await mkdir(folder, { recursive: true })
  const file = path.join(folder, `${name}-360x800.png`)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: file, fullPage: true })
  await info.attach(name, { path: file, contentType: 'image/png' })
}

async function accessible(page: Page) {
  expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) =>
    impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
}

test('shows current-criterion summaries per place, all assessments and active progress navigation', async ({ app, page }, info) => {
  await app.open('/workouts')
  await app.seedFocusSkill(skill)
  await app.seedPlan(plan)
  const dates = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05']
  const ratings = [
    [rating(1, { criterionSnapshot: 'Stare kryterium' })],
    [rating(2), rating(4, { blockType: 'pads', workoutItemId: 'second' })],
    [rating(3), rating(3, { blockType: 'pads', workoutItemId: 'second' })],
    [rating(4), rating('unableToRate', { blockType: 'pads', workoutItemId: 'second' })],
    [rating(5), rating(null, { blockType: 'pads', workoutItemId: 'second' })],
  ]
  for (const [index, focusRatings] of ratings.entries()) await app.seedSession(workoutSession({
    id: `session-${index}`, workoutDate: dates[index], focusRatings, stepResults: [sessionStep()],
    workoutPlanId: plan.id, workoutPlanNameSnapshot: `Plan ${index}`,
  }))
  await page.getByRole('navigation', { name: 'Główna nawigacja' }).filter({ visible: true }).getByRole('link', { name: 'Postęp', exact: true }).click()
  const nav = page.getByRole('navigation', { name: 'Główna nawigacja' }).filter({ visible: true })
  await expect(nav.getByRole('link', { name: 'Postęp', exact: true })).toHaveAttribute('aria-current', 'page')
  if (info.project.name === 'phone') {
    await expect(nav.getByRole('link')).toHaveText(['Start', 'Nowy', 'Treningi', 'Postęp'])
    for (const link of await nav.getByRole('link').all()) {
      const box = await link.boundingBox()
      expect(box?.width).toBeGreaterThanOrEqual(44)
      expect(box?.height).toBeGreaterThanOrEqual(44)
    }
  }
  await expect(page.getByText('Oceny według obecnego kryterium: 6', { exact: true })).toBeVisible()
  await accessible(page)
  await app.setTheme('dark')
  await capture(page, info, 'progress-list')
  await page.getByRole('link', { name: /Powrót do gardy/ }).click()
  await expect(nav.getByRole('link', { name: 'Postęp', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText('Środkowa ocena: 3,5 (z 4 ocen)', { exact: true })).toBeVisible()
  await expect(page.getByText('Ostatnie 3: 3, 4, 5', { exact: true })).toBeVisible()
  await expect(page.getByText('Wcześniejsze: 2', { exact: true })).toBeVisible()
  await expect(page.getByText('Oceny: 4, 3', { exact: true })).toBeVisible()
  await expect(page.getByText('Nie umiem ocenić: 1', { exact: true })).toBeVisible()
  await expect(page.getByText('Starsze oceny według poprzedniego kryterium nie są liczone (1)', { exact: true })).toBeVisible()
  const history = page.getByRole('region', { name: 'Wszystkie oceny', exact: true })
  await expect(history.getByRole('link')).toHaveCount(8)
  await expect(history.getByRole('link').first()).toContainText('05.11.2026')
  await expect(history.getByRole('link').last()).toContainText('według poprzedniego kryterium')
  await expect(page.getByRole('region', { name: 'Oceny według daty treningu', exact: true }).locator('svg').first().getByText('Zmiana kryterium')).toHaveCount(1)
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    await accessible(page)
    await capture(page, info, `trend-${theme}`)
  }
  await history.getByRole('link').first().click()
  await expect(page).toHaveURL(/\/workout-sessions\/session-4\/feedback$/)
})

test('shows empty and unknown-id states', async ({ app, page }) => {
  await app.open('/progress')
  await expect(page.getByRole('link', { name: 'Nowy plan', exact: true })).toBeVisible()
  await app.open('/progress/focus-skills/missing')
  await expect(page.getByRole('heading', { name: 'Nie znaleziono ćwiczenia celu', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Wróć do listy', exact: true }).click()
  await expect(page).toHaveURL(/\/progress$/)
})
