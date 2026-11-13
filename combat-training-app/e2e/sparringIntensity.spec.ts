import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'
import { roundsExercise, workoutPlan } from '../src/test/workoutBuilders'

test('changes planned sparring intensity offline and includes saved hard rounds in the week', async ({ app, page, context }) => {
  const plan = { ...workoutPlan([
    { id: 'technical', blockType: 'sparring', sparringIntensity: 'technical', items: [roundsExercise('three-rounds', 3, 60, 0)] },
    { id: 'unknown', blockType: 'sparring', sparringIntensity: null, items: [roundsExercise('one-round', 1, 60, 0)] },
  ]), nameSnapshot: 'Sparing techniczny i dowolny' }
  await app.open('/workouts')
  await app.seedPlan(plan)
  await app.open(`/workouts/${plan.id}`)
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.fastForward(240_000)
  await app.expectWorkoutSaved()
  const feedbackPath = new URL(page.url()).pathname
  const first = page.getByRole('group', { name: 'Sparing 1 · intensywność (opcjonalnie)', exact: true })
  const second = page.getByRole('group', { name: 'Sparing 2 · intensywność (opcjonalnie)', exact: true })
  await expect(first.getByRole('button', { name: /^Techniczny/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(second.getByRole('button', { pressed: true })).toHaveCount(0)
  // Selecting the active option again restores the optional empty value.
  await second.getByRole('button', { name: /^Lekki/ }).click()
  await second.getByRole('button', { name: /^Lekki/ }).click()
  await expect(second.getByRole('button', { pressed: true })).toHaveCount(0)
  const original = (await app.readSessions())[0]
  expect(original.sparring).toEqual([
    { blockId: 'technical', intensity: 'technical', rounds: 3 }, { blockId: 'unknown', intensity: null, rounds: 1 },
  ])
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
  }
  await context.setOffline(true)
  await first.getByRole('button', { name: /^Twardy/ }).click()
  await page.getByRole('textbox', { name: 'Notatka do treningu · opcjonalnie', exact: true }).fill('Twardy sparing zamiast technicznego.')
  await page.getByRole('button', { name: 'Gotowe', exact: true }).click()
  await expect(page).toHaveURL(/\/workouts\?tab=history$/)
  await expect(page.getByText('Czeka na wysłanie', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Podsumowanie', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`${feedbackPath}$`))
  await expect(first.getByRole('button', { name: /^Twardy/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(second.getByRole('button', { pressed: true })).toHaveCount(0)
  await context.setOffline(false)
  await expect.poll(async () => (await app.readSessions())[0]?.sparring[0]?.intensity).toBe('hard')
  const saved = (await app.readSessions())[0]
  expect(saved).toEqual({ ...original, sparring: [{ ...original.sparring[0], intensity: 'hard' }, original.sparring[1]],
    note: 'Twardy sparing zamiast technicznego.', updatedAt: saved.updatedAt })
  await app.open('/progress/week/2026-11-02')
  const summary = page.getByRole('region', { name: 'Podsumowanie treningów', exact: true })
  const rounds = summary.locator('dl > div').filter({ has: page.locator('dt', { hasText: /^Twarde rundy sparingu$/ }) })
  await expect(rounds.getByRole('definition').first()).toHaveText('3')
  await expect(rounds.getByText('Intensywność znana w 0 z 1 treningów ze sparingiem', { exact: true })).toBeVisible()
})
