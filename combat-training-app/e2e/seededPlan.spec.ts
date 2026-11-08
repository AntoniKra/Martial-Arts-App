import { block, roundsExercise, workoutPlan } from '../src/test/workoutBuilders'
import { test, expect } from './fixtures'

// Deterministic form of the fontCascade flake (#64): once seedPlan returns, a
// reload must show the plan even if the next page never gets a Listen response.
test('shows a seeded plan after reload even when the next listen does not answer', async ({ app, page }) => {
  let stall = false
  await page.route('**/Listen/channel**', async (route) => {
    if (!stall) {
      await route.continue()
      return
    }
    await route.abort()
  })
  await page.goto('/login')
  await app.setTheme('dark')
  await app.open('/')
  const exercise = { ...roundsExercise('exercise-1', 2, 60, 30), exerciseNameSnapshot: 'Praca na nogach' }
  const plan = { ...workoutPlan([block('block-1', [exercise])]), nameSnapshot: 'Technika bokserska' }
  await app.seedPlan(plan)
  stall = true
  await page.context().setOffline(true)
  await page.context().setOffline(false)
  await app.open('/')
  await expect(page.getByRole('heading', { name: plan.nameSnapshot, exact: true })).toBeVisible()
})
