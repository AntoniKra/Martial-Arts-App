import type { Page } from '@playwright/test'
import { block, continuousExercise, roundsExercise, workoutPlan } from '../src/test/workoutBuilders'
import { sessionStep, workoutSession } from '../src/test/workoutSessionBuilders'
import type { QuickTimerWorkoutSession } from '../src/domain/workout-session/workoutSession.types'
import { expect, test } from './fixtures'

test.use({ screenshot: 'off', trace: 'off', video: 'off' })

const plan = workoutPlan([
  block('technique', [{ ...continuousExercise('focus', 60), focusSkillId: 'guard' }, continuousExercise('other', 60)]),
  block('sparring', [roundsExercise('round', 1, 60, 0)], 'sparring'),
])
const current = workoutSession({
  id: 'current', workoutPlanId: plan.id,
  stepResults: [
    sessionStep({ playbackStepId: 'focus', workoutItemId: 'focus', blockId: 'technique' }),
    sessionStep({ playbackStepId: 'other', workoutItemId: 'other', blockId: 'technique', nameSnapshot: 'Praca na nogach' }),
    sessionStep({ playbackStepId: 'round', workoutItemId: 'round', blockId: 'sparring', blockType: 'sparring', roundNumber: 1, roundCount: 1 }),
  ],
  focusRatings: [{ workoutItemId: 'focus', focusSkillId: 'guard', skillNameSnapshot: 'Powrot do gardy',
    criterionSnapshot: 'Reka wraca do brody.', blockType: 'technique', assessment: null, correction: null, previousCorrectionCheck: null }],
  sparring: [{ blockId: 'sparring', intensity: null, rounds: 1 }],
  rpe: 5, rpeRecordedAt: '2026-11-02T10:10:00.000Z',
})
const previous = { ...current, id: 'previous', startedAt: '2026-11-01T09:00:00.000Z',
  completedAt: '2026-11-01T10:00:00.000Z', workoutDate: '2026-11-01', note: 'Poprzednia notatka.' }
const quick: QuickTimerWorkoutSession = {
  id: 'quick', source: 'quickTimer', disciplineKey: 'boxing', category: 'bag', status: 'completed',
  startedAt: current.startedAt, completedAt: current.completedAt, workoutDate: current.workoutDate, timezone: current.timezone,
  createdAt: current.createdAt, updatedAt: current.updatedAt, durationSeconds: 60, workSeconds: 60, sparringSeconds: 0,
  stepResults: [sessionStep({ blockType: 'bag', roundNumber: 1, roundCount: 1 })],
  completion: { completed: 1, planned: 1, unit: 'round' }, sparring: [], note: null,
  rpe: current.rpe, rpeRecordedAt: current.rpeRecordedAt,
}
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Odrzucić zmiany?', exact: true })
const note = (page: Page) => page.getByRole('textbox', { name: 'Notatka do treningu · opcjonalnie', exact: true })
const history = (page: Page) => page.getByRole('link', { name: 'Wróć do historii', exact: true })

test('keeps the note and URL on return, then discards it to open the previous run', async ({ app, page }) => {
  await app.open('/workouts')
  await app.seedSession(previous)
  await app.seedSession(current)
  await app.open('/workout-sessions/current/feedback')
  await note(page).fill('Nowa notatka.')
  const url = page.url()
  await page.getByRole('link', { name: 'Zobacz', exact: true }).click()
  await expect(dialog(page)).toBeVisible()
  await expect(dialog(page)).toHaveAccessibleDescription('Oceny i notatka nie zostaną zapisane.')
  await dialog(page).getByRole('button', { name: 'Wróć do edycji', exact: true }).click()
  await expect(dialog(page)).toHaveCount(0)
  await expect(note(page)).toHaveValue('Nowa notatka.')
  await expect(page).toHaveURL(url)
  await page.getByRole('link', { name: 'Zobacz', exact: true }).click()
  await dialog(page).getByRole('button', { name: 'Odrzuć zmiany', exact: true }).click()
  await expect(page).toHaveURL('/workout-sessions/previous/feedback')
  await expect(note(page)).toHaveValue(previous.note)
  await expect(dialog(page)).toHaveCount(0)
  expect((await app.readSessions()).find(({ id }) => id === current.id)?.note).toBeNull()
})

test('leaves a clean plan summary and a restored note without a dialog', async ({ app, page }) => {
  await app.open('/workouts')
  await app.seedSession(current)
  await app.open('/workout-sessions/current/feedback')
  await note(page).fill('Zmiana do cofniecia.')
  await note(page).fill('')
  await history(page).click()
  await expect(page).toHaveURL('/workouts?tab=history')
  await expect(dialog(page)).toHaveCount(0)
})

for (const session of [current, quick]) {
  test(`saves ${session.source} feedback and navigates to history without a dialog`, async ({ app, page }) => {
    await app.open('/workouts')
    await app.seedSession(session)
    await app.open(`/workout-sessions/${session.id}/feedback`)
    await note(page).fill('Zapisana notatka.')
    await page.getByRole('button', { name: 'Gotowe', exact: true }).click()
    await expect(page).toHaveURL('/workouts?tab=history')
    await expect(dialog(page)).toHaveCount(0)
    await expect.poll(async () => (await app.readSessions()).find(({ id }) => id === session.id)?.note).toBe('Zapisana notatka.')
  })

  test(`protects ${session.source} feedback again after the save callback rejects`, async ({ app, page }) => {
    await app.open('/workouts')
    await app.seedSession(session)
    await app.open(`/workout-sessions/${session.id}/feedback`)
    await note(page).fill('Niezapisana notatka.')
    // Fail timestamp creation inside onSave once, before any repository write.
    await page.evaluate(() => {
      const original = Date.prototype.toISOString
      Date.prototype.toISOString = function () {
        Date.prototype.toISOString = original
        throw new Error('Simulated feedback save failure')
      }
    })
    await page.getByRole('button', { name: 'Gotowe', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText('Nie udało się zapisać ocen. Spróbuj ponownie.')
    await history(page).click()
    await expect(dialog(page)).toBeVisible()
    await dialog(page).getByRole('button', { name: 'Wróć do edycji', exact: true }).click()
    await expect(note(page)).toHaveValue('Niezapisana notatka.')
    await expect(page).toHaveURL(`/workout-sessions/${session.id}/feedback`)
    expect((await app.readSessions()).find(({ id }) => id === session.id)?.note).toBeNull()
  })
}

test('warns on browser back from a quick timer summary with a changed note', async ({ app, page }) => {
  await app.open('/workouts')
  await app.seedSession(quick)
  const historyRegion = await app.openHistory()
  const historyUrl = page.url()
  await historyRegion.getByRole('link', { name: 'Podsumowanie', exact: true }).click()
  await expect(note(page)).toHaveValue('')
  await note(page).fill('Notatka stopera.')
  const url = page.url()
  await page.goBack()
  await expect(dialog(page)).toBeVisible()
  await dialog(page).getByRole('button', { name: 'Wróć do edycji', exact: true }).click()
  await expect(note(page)).toHaveValue('Notatka stopera.')
  await expect(page).toHaveURL(url)
  await page.goBack()
  await dialog(page).getByRole('button', { name: 'Odrzuć zmiany', exact: true }).click()
  await expect(page).toHaveURL(historyUrl)
})

test('protects focus ratings, other ratings and sparring intensity, allowing restored values', async ({ app, page }) => {
  await app.open('/workouts')
  await app.seedSession(current)
  await app.open('/workout-sessions/current/feedback')
  const focus = page.getByRole('article', { name: 'Powrot do gardy', exact: true })
  const other = page.getByRole('article', { name: 'Praca na nogach', exact: true })
  await focus.getByRole('radio', { name: /^3 / }).check()
  await history(page).click()
  await expect(dialog(page)).toBeVisible()
  await dialog(page).getByRole('button', { name: 'Wróć do edycji', exact: true }).click()
  await focus.getByRole('button', { name: 'Wyczyść ocenę', exact: true }).click()
  await page.getByText('Oceń pozostałe ćwiczenia · 2, opcjonalnie', { exact: true }).click()
  await other.getByRole('radio', { name: /^4 / }).check()
  await history(page).click()
  await expect(dialog(page)).toBeVisible()
  await dialog(page).getByRole('button', { name: 'Wróć do edycji', exact: true }).click()
  await other.getByRole('button', { name: 'Wyczyść ocenę', exact: true }).click()
  const intensity = page.getByRole('button', { name: /^Techniczny/ })
  await intensity.click()
  await page.getByRole('link', { name: 'Wróć do planu', exact: true }).click()
  await expect(dialog(page)).toBeVisible()
  await dialog(page).getByRole('button', { name: 'Wróć do edycji', exact: true }).click()
  await intensity.click()
  await history(page).click()
  await expect(page).toHaveURL('/workouts?tab=history')
  await expect(dialog(page)).toHaveCount(0)
})

test('protects quick timer category and intensity and allows restored values', async ({ app, page }) => {
  await app.open('/workouts')
  await app.seedSession({ ...quick, category: 'sparring', sparringSeconds: 60,
    sparring: [{ blockId: null, intensity: null, rounds: 1 }] })
  await app.open('/workout-sessions/quick/feedback')
  const intensity = page.getByRole('button', { name: /^Techniczny/ })
  await intensity.click()
  await history(page).click()
  await expect(dialog(page)).toBeVisible()
  await dialog(page).getByRole('button', { name: 'Wróć do edycji', exact: true }).click()
  await intensity.click()
  await page.getByRole('button', { name: 'Worek', exact: true }).click()
  await history(page).click()
  await expect(dialog(page)).toBeVisible()
  await dialog(page).getByRole('button', { name: 'Wróć do edycji', exact: true }).click()
  await page.getByRole('button', { name: 'Sparing', exact: true }).click()
  await history(page).click()
  await expect(page).toHaveURL('/workouts?tab=history')
  await expect(dialog(page)).toHaveCount(0)
})

test('saves RPE independently without making a clean feedback form dirty', async ({ app, page }) => {
  await app.open('/workouts')
  await app.seedSession({ ...current, completedAt: new Date().toISOString(), rpe: null, rpeRecordedAt: null })
  await app.open('/workout-sessions/current/feedback')
  await page.getByRole('button', { name: 'Oceń teraz', exact: true }).click()
  await page.getByRole('radiogroup', { name: 'RPE od 0 do 10', exact: true }).getByRole('radio', { name: '6', exact: true }).check()
  await page.getByRole('button', { name: 'Zapisz RPE 6', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Zapisano RPE 6' })).toBeVisible()
  await expect(page.getByText('Czeka na wysłanie', { exact: true })).toHaveCount(0)
  await history(page).click()
  await expect(page).toHaveURL('/workouts?tab=history')
  await expect(dialog(page)).toHaveCount(0)
})
