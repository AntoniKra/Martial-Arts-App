import { test, expect } from './fixtures'

test('persists Firestore timings including repeated work and excluding a pause', async ({ app, page }) => {
  await app.createPlan('Powtorzona runda')
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.runFor(10_000)
  await page.getByRole('button', { name: 'Pauza', exact: true }).click()
  await page.clock.runFor(90_000)
  // The interrupted ten seconds add duration only; the pause adds neither duration nor work.
  await page.getByRole('button', { name: 'Poprzedni etap', exact: true }).click()
  await page.getByRole('button', { name: 'Wznów', exact: true }).click()
  await page.clock.runFor(60_000)
  // Complete the first round again: each completed attempt must contribute work.
  await page.getByRole('button', { name: 'Poprzedni etap', exact: true }).click()
  await page.clock.fastForward(210_000)
  await app.expectWorkoutSaved()
  await expect.poll(async () => (await app.readSessions()).length).toBe(1)
  const envelope = { sessions: await app.readSessions() }
  expect(envelope).toMatchObject({ sessions: [{
    source: 'plan', status: 'completed', durationSeconds: 280, workSeconds: 240, sparringSeconds: 0,
    completion: { completed: 2, planned: 2, unit: 'exercise' },
    workoutDate: '2026-11-03', timezone: 'Europe/Warsaw', category: 'technique',
  }] })
  expect(envelope.sessions).toHaveLength(1)
})

test('does not save a run without work and resets the message on restart', async ({ app, page }, testInfo) => {
  await app.createPlan('Bez pracy')
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  for (let index = 0; index < 4; index += 1) {
    await page.getByRole('button', { name: 'Następny etap', exact: true }).click()
  }
  await expect(page.getByRole('heading', { name: 'Nie zapisano treningu', exact: true })).toBeVisible()
  await expect(page.getByText('Trening niezapisany', { exact: true })).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('Zapisujemy tylko rundy i ćwiczenia, które dobiegły do końca czasu. Tym razem żadne nie dobiegło.')
  expect(await app.readSessions()).toHaveLength(0)
  await page.screenshot({ path: testInfo.outputPath('no-work.png'), fullPage: true })
  await page.getByRole('button', { name: 'Uruchom ponownie', exact: true }).click()
  await app.startWorkout()
  await page.clock.fastForward(210_000)
  await app.expectWorkoutSaved()
})

test('saves partial completion when an exercise round is skipped without work', async ({ app, page }) => {
  await app.createPlan('Pominieta runda')
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.getByRole('button', { name: 'Następny etap', exact: true }).click()
  await page.clock.fastForward(150_000)
  await app.expectWorkoutSaved()
  await expect.poll(async () => (await app.readSessions()).length).toBe(1)
  expect({ sessions: await app.readSessions() })
    .toMatchObject({ sessions: [{
      status: 'partial', durationSeconds: 150, workSeconds: 120,
      completion: { completed: 1, planned: 2, unit: 'exercise' },
    }] })
})

test('does not save a run clicked through after half a second of each exercise', async ({ app, page }) => {
  await app.createPlan('Krotka praca')
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  for (let index = 0; index < 4; index += 1) {
    await page.clock.runFor(500)
    await page.getByRole('button', { name: 'Następny etap', exact: true }).click()
  }
  await expect(page.getByRole('heading', { name: 'Nie zapisano treningu', exact: true })).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('Zapisujemy tylko rundy i ćwiczenia, które dobiegły do końca czasu. Tym razem żadne nie dobiegło.')
  expect(await app.readSessions()).toHaveLength(0)
})

test('keeps two interrupted minutes of a three-minute round in duration but excludes them from work', async ({ app, page }) => {
  await app.createPlan('Przerwana runda trzyminutowa', '3:00')
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.runFor(120_000)
  await expect(page.getByText('Pozostały czas: 1 minuta', { exact: true })).toBeAttached()
  await page.getByRole('button', { name: 'Następny etap', exact: true }).click()
  await page.clock.fastForward(270_000)
  await app.expectWorkoutSaved()
  await expect.poll(async () => (await app.readSessions()).length).toBe(1)
  const envelope = { sessions: await app.readSessions() }
  expect(envelope).toMatchObject({ sessions: [{
    status: 'partial', durationSeconds: 390, workSeconds: 240, sparringSeconds: 0,
    completion: { completed: 1, planned: 2, unit: 'exercise' },
  }] })
  expect((envelope.sessions[0].source === 'manual' ? [] : envelope.sessions[0].stepResults)[0]).toMatchObject({
    kind: 'exercise', plannedDurationSeconds: 180, performedDurationSeconds: 0, outcome: 'skipped',
  })
})
