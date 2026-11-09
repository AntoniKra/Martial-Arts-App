import { test, expect } from './fixtures'
import { block, continuousExercise, workoutPlan } from '../src/test/workoutBuilders'
import type { FocusSkill } from '../src/domain/focus-skill/focusSkill.types'

const instant = '2026-11-01T10:00:00.000Z'
const skill: FocusSkill = {
  id: 'guard', name: 'Powrót do gardy', criterion: 'Ręka wraca do brody.', openCorrection: null,
  archivedAt: null, createdAt: instant, updatedAt: instant,
}
const plan = workoutPlan([block('bag', [
  { ...continuousExercise('first', 60), focusSkillId: skill.id },
], 'bag')])

test('waits for a referenced focus skill missing from cache and starts after Listen reconnects', async ({ app, page, context }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  let stall = false
  await page.route('**/Listen/channel**', (route) => stall ? route.abort() : route.continue())
  await app.open('/workouts')
  await app.seedPlan(plan)
  stall = true
  // Keep the cached plan but prevent the skill's REST write from reaching the tab.
  await context.setOffline(true)
  await app.seedFocusSkill(skill)
  await context.setOffline(false)
  await app.open(`/workouts/${plan.id}`)
  await expect(page.getByRole('heading', { name: plan.nameSnapshot, exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Rozpocznij trening', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Ładowanie treningu', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Rozpocznij trening', exact: true })).toHaveCount(0)

  stall = false
  await context.setOffline(true)
  await context.setOffline(false)
  await expect(page.getByRole('button', { name: 'Rozpocznij trening', exact: true })).toBeVisible()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.fastForward(60_000)
  await app.expectWorkoutSaved()
  expect(await app.readSessions()).toMatchObject([{ source: 'plan', focusRatings: [
    { focusSkillId: skill.id, skillNameSnapshot: skill.name, criterionSnapshot: skill.criterion },
  ] }])
  expect(errors).toEqual([])
})

test('starts without missing ratings after the server confirms an incomplete focus collection', async ({ app, page }) => {
  await app.open('/workouts')
  await app.seedPlan(plan)
  await app.open(`/workouts/${plan.id}`)
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.fastForward(60_000)
  await app.expectWorkoutSaved()
  expect(await app.readSessions()).toMatchObject([{ source: 'plan', focusRatings: [] }])
})

test('bounds the wait for missing focus skills to ten seconds when Listen cannot answer', async ({ app, page, context }) => {
  let stall = false
  await page.route('**/Listen/channel**', (route) => stall ? route.abort() : route.continue())
  await app.open('/workouts')
  await app.seedPlan(plan)
  stall = true
  await context.setOffline(true)
  await context.setOffline(false)
  await app.open(`/workouts/${plan.id}`)
  await expect(page.getByRole('heading', { name: plan.nameSnapshot, exact: true })).toBeVisible()
  // The plan is already loaded; only the referenced skills can block admission.
  await page.clock.install()
  await page.getByRole('link', { name: 'Rozpocznij trening', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Ładowanie treningu', exact: true })).toBeVisible()
  await page.clock.fastForward(10_000)
  await expect(page.getByRole('button', { name: 'Rozpocznij trening', exact: true })).toBeVisible()
})
