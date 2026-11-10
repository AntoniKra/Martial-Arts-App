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

test('archives offline with two plans, keeps history, and restores without restoring CEL', async ({ app, page, context }, info) => {
  await app.open('/workouts')
  await app.seedFocusSkill(skill)
  await app.seedPlan(plan)
  await app.seedPlan({ ...plan, id: 'pads-plan', nameSnapshot: 'Tarcze' })
  await app.seedSession(workoutSession({ id: 'rated', focusRatings: [rating(3)], stepResults: [sessionStep()] }))
  await app.open('/progress')
  await page.getByRole('link', { name: /Powrót do gardy/ }).click()
  await page.getByRole('button', { name: 'Schowaj ćwiczenie celu', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Schowaj ćwiczenie celu', exact: true })
  await expect(dialog.getByRole('listitem')).toHaveText(['Worek', 'Tarcze'])
  await expect(dialog.getByRole('button', { name: 'Anuluj', exact: true })).toBeFocused()
  await accessible(page)
  await capture(page, info, 'archive-dialog')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Schowaj ćwiczenie celu', exact: true })).toBeFocused()
  await page.getByRole('button', { name: 'Schowaj ćwiczenie celu', exact: true }).click()
  await context.setOffline(true)
  await dialog.getByRole('button', { name: 'Schowaj i zdejmij CEL', exact: true }).click()
  await expect(page).toHaveURL(/\/progress$/)
  await expect(page.getByRole('status').filter({ hasText: 'Czeka na wysłanie' })).toBeVisible()
  await page.getByText('Schowane (1)', { exact: true }).click()
  await page.getByRole('link', { name: /Powrót do gardy/ }).click()
  await expect(page.getByText('Jedna ocena: 3 (02.11)', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Przywróć', exact: true })).toBeVisible()
  await context.setOffline(false)
  await expect.poll(async () => (await app.readFocusSkills())[0]?.archivedAt).not.toBeNull()
  await expect.poll(async () => (await app.readPlans()).flatMap((entry) => entry.blocks.flatMap((value) => value.items))
    .filter((item) => item.type === 'exercise' && item.focusSkillId !== null)).toHaveLength(0)
  // Keep the same Firestore client through this user flow. Repeated page reloads
  // transfer its IndexedDB primary lease and can defer server writes for five seconds.
  const nav = page.getByRole('navigation', { name: 'Główna nawigacja' }).filter({ visible: true })
  for (const name of ['Worek', 'Tarcze']) {
    await nav.getByRole('link', { name: 'Treningi', exact: true }).click()
    await page.getByRole('article').filter({ has: page.getByRole('heading', { name, exact: true }) })
      .getByRole('link', { name: 'Zobacz plan', exact: true }).click()
    await expect(page.getByText('CEL', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Exercise first', { exact: true })).toBeVisible()
  }
  await nav.getByRole('link', { name: 'Postęp', exact: true }).click()
  await page.getByText('Schowane (1)', { exact: true }).click()
  await page.getByRole('link', { name: /Powrót do gardy/ }).click()
  await page.getByRole('button', { name: 'Przywróć', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Schowaj ćwiczenie celu', exact: true })).toBeVisible()
  await expect.poll(async () => (await app.readFocusSkills())[0]?.archivedAt).toBeNull()
  expect((await app.readPlans()).flatMap((entry) => entry.blocks.flatMap((value) => value.items))
    .filter((item) => item.type === 'exercise' && item.focusSkillId !== null)).toHaveLength(0)
  await app.open('/workouts/bag-plan/edit')
  await page.getByRole('switch', { name: 'Ćwiczenie celu · Oceniaj po treningu', exact: true }).click()
  await expect(page.getByRole('radio', { name: /^Powrót do gardy/ })).toBeVisible()
})

test('deletes only a skill without session entries and preserves its plan exercises', async ({ app, page }) => {
  await app.open('/workouts')
  await app.seedFocusSkill(skill)
  await app.seedPlan(plan)
  await app.open('/progress/focus-skills/guard')
  await page.getByRole('button', { name: 'Usuń ćwiczenie celu', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Usuń ćwiczenie celu', exact: true })
  await expect(dialog.getByText('Usunąć ćwiczenie celu? Nie ma jeszcze ocen.', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('listitem')).toHaveText(['Worek'])
  await dialog.getByRole('button', { name: 'Usuń', exact: true }).click()
  await expect(page).toHaveURL(/\/progress$/)
  await expect.poll(() => app.readFocusSkills()).toEqual([])
  await expect.poll(async () => (await app.readPlans())[0].blocks[0].items[0]).toMatchObject({ type: 'exercise', focusSkillId: null })
  // A null assessment is still a historical reference and must forbid deletion.
  await app.seedFocusSkill(skill)
  await app.seedSession(workoutSession({ focusRatings: [rating(null)], stepResults: [sessionStep()] }))
  await app.open('/progress/focus-skills/guard')
  await expect(page.getByRole('button', { name: 'Schowaj ćwiczenie celu', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Usuń ćwiczenie celu', exact: true })).toHaveCount(0)
})

test('shows and saves an existing archived reference but never offers it as a new selection', async ({ app, page }, info) => {
  await app.open('/workouts')
  await app.seedFocusSkill({ ...skill, archivedAt: instant })
  await app.seedPlan(plan)
  await app.open('/workouts/bag-plan/edit')
  await expect(page.getByText('Powrót do gardy · Schowane', { exact: true })).toBeVisible()
  await expect(page.getByText(/Wybrane ćwiczenie celu jest niedostępne/)).toHaveCount(0)
  await expect(page.getByRole('radio', { name: /^Powrót do gardy/ })).toHaveCount(0)
  await accessible(page)
  await capture(page, info, 'builder-archived')
  await app.savePlan()
  await expect(page.getByText('CEL', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Edytuj plan', exact: true }).click()
  await page.getByRole('switch', { name: 'Ćwiczenie celu · Oceniaj po treningu', exact: true }).click()
  await page.getByRole('switch', { name: 'Ćwiczenie celu · Oceniaj po treningu', exact: true }).click()
  await expect(page.getByRole('radio', { name: /^Powrót do gardy/ })).toHaveCount(0)
  await expect(page.getByText('Powrót do gardy · Schowane', { exact: true })).toHaveCount(0)
})
