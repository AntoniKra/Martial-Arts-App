import { test, expect } from './fixtures'

test('persists v3 timings including repeated work and excluding a pause', async ({ app, page }) => {
  await app.createPlan('Powtorzona runda')
  await app.openPlayer()
  await app.freezeClock()
  await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click()
  await page.clock.runFor(10_000)
  await page.getByRole('button', { name: 'Pauza', exact: true }).click()
  await page.clock.runFor(90_000)
  // Restarting while paused must retain the first attempt's ten seconds and exclude the pause.
  await page.getByRole('button', { name: 'Poprzedni etap', exact: true }).click()
  await page.getByRole('button', { name: 'Wznów', exact: true }).click()
  await page.clock.fastForward(210_000)
  await app.expectWorkoutSaved()
  const envelope = await page.evaluate(() => JSON.parse(localStorage.getItem('combat-training.workout-sessions') ?? 'null'))
  expect(envelope).toMatchObject({ schemaVersion: 3, sessions: [{
    source: 'plan', status: 'completed', durationSeconds: 220, workSeconds: 190, sparringSeconds: 0,
    completion: { completedExercises: 2, plannedExercises: 2 },
    workoutDate: '2026-11-03', timezone: 'Europe/Warsaw', category: 'technique',
  }] })
  expect(envelope.sessions).toHaveLength(1)
})

test('does not save a run without work and resets the message on restart', async ({ app, page }, testInfo) => {
  await app.createPlan('Bez pracy')
  await app.openPlayer()
  await app.freezeClock()
  await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click()
  for (let index = 0; index < 4; index += 1) {
    await page.getByRole('button', { name: 'Następny etap', exact: true }).click()
  }
  await expect(page.getByRole('status')).toHaveText('Trening bez czasu pracy nie został zapisany.')
  expect(await page.evaluate(() => localStorage.getItem('combat-training.workout-sessions'))).toBeNull()
  await page.screenshot({ path: testInfo.outputPath('no-work.png'), fullPage: true })
  await page.getByRole('button', { name: 'Uruchom ponownie', exact: true }).click()
  await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click()
  await page.clock.fastForward(210_000)
  await app.expectWorkoutSaved()
})

test('saves partial completion when an exercise round is skipped without work', async ({ app, page }) => {
  await app.createPlan('Pominieta runda')
  await app.openPlayer()
  await app.freezeClock()
  await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click()
  await page.getByRole('button', { name: 'Następny etap', exact: true }).click()
  await page.clock.fastForward(150_000)
  await app.expectWorkoutSaved()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('combat-training.workout-sessions') ?? 'null')))
    .toMatchObject({ schemaVersion: 3, sessions: [{
      status: 'partial', durationSeconds: 150, workSeconds: 120,
      completion: { completedExercises: 1, plannedExercises: 2 },
    }] })
})

test('saves subsecond work without a minimum-time threshold', async ({ app, page }) => {
  await app.createPlan('Krotka praca')
  await app.openPlayer()
  await app.freezeClock()
  await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click()
  await page.clock.runFor(500)
  for (let index = 0; index < 4; index += 1) {
    await page.getByRole('button', { name: 'Następny etap', exact: true }).click()
  }
  await app.expectWorkoutSaved()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('combat-training.workout-sessions') ?? 'null')))
    .toMatchObject({ schemaVersion: 3, sessions: [{
      status: 'partial', durationSeconds: 0.5, workSeconds: 0.5,
      completion: { completedExercises: 0, plannedExercises: 2 },
    }] })
})
