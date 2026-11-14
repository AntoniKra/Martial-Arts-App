import AxeBuilder from '@axe-core/playwright'
import { block, continuousExercise, workoutPlan } from '../src/test/workoutBuilders'
import { sessionStep, workoutSession } from '../src/test/workoutSessionBuilders'
import { test, expect } from './fixtures'

test.use({ screenshot: 'off', trace: 'off', video: 'off' })

const plan = { ...workoutPlan([block('bag', Array.from({ length: 5 }, (_, index) => continuousExercise(`exercise-${index}`, 180)), 'bag')]), nameSnapshot: 'Worek 5 × 3:00' }
const first = workoutSession({ id: 'first', workoutPlanId: plan.id, workoutPlanNameSnapshot: plan.nameSnapshot,
  startedAt: '2026-11-06T10:00:00.000Z', completedAt: '2026-11-06T10:52:10.800Z', workoutDate: '2026-11-06',
  durationSeconds: 3130.8, workSeconds: 900, category: 'bag', completion: { completed: 5, planned: 5, unit: 'exercise' },
  stepResults: Array.from({ length: 5 }, (_, index) => sessionStep({ playbackStepId: `step-${index}`, workoutItemId: `exercise-${index}`,
    blockId: 'bag', blockType: 'bag', plannedDurationSeconds: 180, performedDurationSeconds: 180 })),
  rpe: 7, rpeRecordedAt: '2026-11-06T11:02:10.800Z', note: 'Notatka pierwszego treningu.',
  exerciseRatings: [{ workoutItemId: 'exercise-0', nameSnapshot: 'Previous rating', blockType: 'bag', rating: 2 }],
})
const second = { ...first, id: 'second', status: 'partial' as const, startedAt: '2026-11-13T10:00:00.000Z',
  completedAt: '2026-11-13T10:55:00.000Z', workoutDate: '2026-11-13', durationSeconds: 3300, workSeconds: 720,
  completion: { completed: 4, planned: 5, unit: 'exercise' as const }, rpe: 8, rpeRecordedAt: '2026-11-13T11:05:00.000Z',
  stepResults: first.stepResults.map((step, index) => index === 4 ? { ...step, outcome: 'skipped' as const, performedDurationSeconds: 0 } : step),
  exerciseRatings: [], note: 'Notatka drugiego treningu.',
}
const previousHeading = 'Poprzednio ten plan: 6 lis'

test('compares seeded plan runs, reports changed run durations, and opens the first summary', async ({ app, page }) => {
  await app.open('/workouts')
  await app.seedPlan({ ...plan, updatedAt: first.completedAt })
  await app.seedSession(first); await app.seedSession(second)
  await app.open(`/workout-sessions/${second.id}/feedback`)
  const previous = page.getByRole('region', { name: previousHeading, exact: true })
  await expect(previous).toBeVisible()
  await expect(page.locator('header dl dd')).toHaveText(['55:00', '12:00', '4/5'])
  await expect(previous.locator('dd')).toHaveText(['52:10', '15:00', '5/5'])
  await expect(previous.locator('dt')).toHaveText(['Trening', 'Praca', 'Ćwiczenia'])
  await expect(previous.getByText('RPE: 7', { exact: true })).toBeVisible()
  await expect(previous.getByText('Plan zmieniono po tamtym treningu.', { exact: true })).toHaveCount(0)
  await expect(previous.getByRole('radio')).toHaveCount(0)
  await expect(previous.getByText('Previous rating', { exact: true })).toHaveCount(0)
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
  }
  await app.seedPlan({ ...plan, updatedAt: '2026-11-14T10:00:00.000Z' })
  await expect(previous.getByText('Plan zmieniono po tamtym treningu.', { exact: true })).toHaveCount(0)
  // A timer correction alone does not establish that the plan changed.
  await app.seedPlan({ ...plan, updatedAt: first.completedAt })
  await app.seedSession({ ...second, durationSeconds: 3315, workSeconds: 735, stepResults: second.stepResults.map((step, index) => index === 0
    ? { ...step, plannedDurationSeconds: 195, performedDurationSeconds: 195 } : step) })
  await app.open(`/workout-sessions/${second.id}/feedback`)
  await expect(page.locator('header dl dd')).toHaveText(['55:15', '12:15', '4/5'])
  await expect(previous.getByText('Plan zmieniono po tamtym treningu.', { exact: true })).toHaveCount(0)
  await app.seedPlan({ ...plan, blocks: [block('bag', Array.from({ length: 5 }, (_, index) => continuousExercise(`exercise-${index}`, index === 0 ? 195 : 180)), 'bag')],
    updatedAt: '2026-11-07T10:00:00.000Z' })
  await expect(previous.getByText('Plan zmieniono po tamtym treningu.', { exact: true })).toBeVisible()
  await previous.getByRole('link', { name: 'Zobacz', exact: true }).click()
  await expect(page).toHaveURL(/\/workout-sessions\/first\/feedback$/)
  await expect(page.getByRole('heading', { name: /Poprzednio ten plan/ })).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Notatka do treningu · opcjonalnie', exact: true })).toHaveValue('Notatka pierwszego treningu.')
})

test('compares deleted plans by run layout and distinguishes absent RPE from zero', async ({ app, page }) => {
  await app.open('/workouts')
  await app.seedPlan(plan)
  await app.seedSession({ ...first, rpe: null, rpeRecordedAt: null }); await app.seedSession(second)
  await app.open(`/workout-sessions/${second.id}/feedback`)
  const previous = page.getByRole('region', { name: previousHeading, exact: true })
  await expect(previous.getByText('RPE: brak', { exact: true })).toBeVisible()
  await app.removeWorkoutDocument('workoutPlans', plan.id)
  await expect(page.getByText('Plan zmieniono po tamtym treningu.', { exact: true })).toHaveCount(0)
  await expect(previous.locator('dd')).toHaveText(['52:10', '15:00', '5/5'])
  await app.seedSession({ ...first, rpe: 0 })
  await expect(previous.getByText('RPE: 0', { exact: true })).toBeVisible()
  await app.seedSession({ ...second, stepResults: [second.stepResults[1], second.stepResults[0], ...second.stepResults.slice(2)] })
  await expect(previous.getByText('Plan zmieniono po tamtym treningu.', { exact: true })).toBeVisible()
  await previous.getByRole('link', { name: 'Zobacz', exact: true }).click()
  await expect(page).toHaveURL(/\/workout-sessions\/first\/feedback$/)
  await expect(page.getByRole('heading', { name: /Poprzednio ten plan/ })).toHaveCount(0)
})
