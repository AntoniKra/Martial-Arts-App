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
const previousRegion = 'Poprzednie wykonanie planu'
const previousLinkName = 'Zobacz poprzedni trening z tym planem'

test('compares seeded plan run metrics without repeating the previous date or RPE', async ({ app, page }) => {
  await app.open('/workouts')
  await app.seedPlan({ ...plan, updatedAt: first.completedAt })
  await app.seedSession(first); await app.seedSession(second)
  await app.open(`/workout-sessions/${second.id}/feedback`)
  const hero = page.getByRole('region', { name: 'Podsumowanie czasu sesji', exact: true })
  const previous = hero.getByRole('region', { name: previousRegion, exact: true })
  const previousLink = previous.getByRole('link', { name: previousLinkName, exact: true })
  const metrics = hero.locator(':scope > dl')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trening częściowy')
  await expect(previous).toBeVisible()
  await expect(metrics.locator('dt')).toHaveText(['Czas czystej pracy', 'Trening', 'Ćwiczenia'])
  await expect(metrics.locator('dd')).toHaveText(['12:00', '55:00', '4/5'])
  await expect(metrics.locator('dd').first()).toHaveCSS('font-size', '36px')
  await expect(previous.getByRole('link')).toHaveCount(1)
  await expect(previousLink).toHaveAttribute('href', `/workout-sessions/${first.id}/feedback`)
  await expect(previousLink).toHaveAccessibleDescription(/Trening\s+52:10\s+Praca\s+15:00\s+Ćwiczenia\s+5\/5/)
  await expect(previous.locator('dd')).toHaveText(['52:10', '15:00', '5/5'])
  await expect(previous.locator('dt')).toHaveText(['Trening', 'Praca', 'Ćwiczenia'])
  const linkBox = (await previousLink.boundingBox())!
  const metricsBox = (await previous.locator('dl').boundingBox())!
  expect(linkBox.height).toBeGreaterThanOrEqual(44)
  expect(linkBox.x).toBeLessThanOrEqual(metricsBox.x)
  expect(linkBox.x + linkBox.width).toBeGreaterThanOrEqual(metricsBox.x + metricsBox.width)
  expect(linkBox.y).toBeLessThanOrEqual(metricsBox.y)
  expect(linkBox.y + linkBox.height).toBeGreaterThanOrEqual(metricsBox.y + metricsBox.height)
  await expect(hero.getByText(/Poprzednio ten plan:/)).toHaveCount(0)
  await expect(previous.getByText('RPE: 7', { exact: true })).toHaveCount(0)
  await expect(previous.getByText('Zobacz', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Zapisano RPE 8', { exact: true })).toBeAttached()
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
  await expect(metrics.locator('dd')).toHaveText(['12:15', '55:15', '4/5'])
  await expect(previous.getByText('Plan zmieniono po tamtym treningu.', { exact: true })).toHaveCount(0)
  await app.seedPlan({ ...plan, blocks: [block('bag', Array.from({ length: 5 }, (_, index) => continuousExercise(`exercise-${index}`, index === 0 ? 195 : 180)), 'bag')],
    updatedAt: '2026-11-07T10:00:00.000Z' })
  await expect(previous.getByText('Plan zmieniono po tamtym treningu.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Wstecz', exact: true }).press('Tab')
  await expect(previousLink).toBeFocused()
  await expect(previousLink).toHaveCSS('outline-style', 'solid')
  await expect(previousLink).toHaveCSS('outline-width', '2px')
  await previousLink.press('Enter')
  await expect(page).toHaveURL(`/workout-sessions/${first.id}/feedback`)
  await expect(page.getByText('Zapisano RPE 7', { exact: true })).toBeAttached()
  await expect(page.getByRole('textbox', { name: 'Notatka do treningu · opcjonalnie', exact: true })).toHaveValue('Notatka pierwszego treningu.')
  await expect(page.getByRole('region', { name: previousRegion, exact: true })).toHaveCount(0)
})

test('compares deleted plans by run layout without showing absent or zero previous RPE', async ({ app, page }) => {
  await app.open('/workouts')
  await app.seedPlan(plan)
  await app.seedSession({ ...first, rpe: null, rpeRecordedAt: null }); await app.seedSession(second)
  await app.open(`/workout-sessions/${second.id}/feedback`)
  const previous = page.getByRole('region', { name: previousRegion, exact: true })
  await expect(previous.getByText('RPE: brak', { exact: true })).toHaveCount(0)
  await app.removeWorkoutDocument('workoutPlans', plan.id)
  await expect(page.getByText('Plan zmieniono po tamtym treningu.', { exact: true })).toHaveCount(0)
  await expect(previous.locator('dd')).toHaveText(['52:10', '15:00', '5/5'])
  await app.seedSession({ ...first, rpe: 0 })
  await expect(previous.getByText('RPE: 0', { exact: true })).toHaveCount(0)
  await app.seedSession({ ...second, stepResults: [second.stepResults[1], second.stepResults[0], ...second.stepResults.slice(2)] })
  await expect(previous.getByText('Plan zmieniono po tamtym treningu.', { exact: true })).toBeVisible()
  await previous.getByRole('link', { name: previousLinkName, exact: true }).click()
  await expect(page).toHaveURL(`/workout-sessions/${first.id}/feedback`)
  await expect(page.getByText('Zapisano RPE 0', { exact: true })).toBeAttached()
  await expect(page.getByRole('region', { name: previousRegion, exact: true })).toHaveCount(0)
})
