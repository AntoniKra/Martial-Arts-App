import { block, roundsExercise, workoutPlan } from '../src/test/workoutBuilders'
import { test, expect } from './fixtures'

// Cause (#64): seedPlan used to return after the emulator REST write only. The
// open tab may not have applied that write into the persistent Firestore cache
// yet. A reload then reads an empty cache; if Listen does not answer within the
// 5s primary-lease window (same as the expect timeout), home keeps
// "Nie masz jeszcze zapisanego planu" — the CI and local failure snapshot.
// This test stalls Listen after seed so the handoff cannot hide behind a late
// server response.
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
