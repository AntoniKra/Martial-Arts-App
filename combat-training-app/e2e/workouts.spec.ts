import { test, expect } from './fixtures'

test('creates a plan in the builder and persists it on the list', async ({ app, page }) => {
  const planUrl = await app.createPlan('Plan z kreatora')
  await app.open('/workouts')
  const plan = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Plan z kreatora', exact: true }) })
  await expect(plan).toHaveCount(1)
  await plan.getByRole('link', { name: 'Zobacz plan', exact: true }).click()
  await expect(page).toHaveURL(planUrl)
  await expect(page.getByRole('heading', { name: 'Plan z kreatora', exact: true })).toBeVisible()
})

test('renames and deletes a plan while preserving the completed workout', async ({ app, page }) => {
  const planUrl = await app.createPlan('Plan przed edycją')
  await app.openPlayer()
  await app.finishWorkout()
  await app.open(planUrl)
  await page.getByRole('link', { name: 'Edytuj plan', exact: true }).click()
  await page.getByRole('textbox', { name: 'Nazwa planu' }).fill('Plan po edycji')
  await app.savePlan()
  await expect(page.getByRole('heading', { name: 'Plan po edycji', exact: true })).toBeVisible()
  await app.open('/workouts')
  await page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Plan po edycji', exact: true }) })
    .getByRole('link', { name: 'Zobacz plan', exact: true }).click()
  await page.getByRole('button', { name: 'Usuń plan', exact: true }).click()
  // The confirmation replaces the first button, so the visible name stays „Usuń plan” (WCAG 2.5.3).
  await page.getByRole('button', { name: 'Usuń plan', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Plan został usunięty.' }))
    .toHaveText('Plan został usunięty. Treningi w historii pozostają dostępne.')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Brak zapisanych planów', exact: true })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Plan został usunięty.' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Plan po edycji', exact: true })).toHaveCount(0)
  const history = await app.openHistory()
  await expect(history.getByRole('heading', { name: 'Plan przed edycją', exact: true })).toBeVisible()
  await expect(history.getByRole('article')).toHaveCount(1)
  await expect(history.getByText('2/2 ćwiczeń', { exact: true })).toBeVisible()
})

test('"Poprzedni" restarts the step after three seconds and goes back before that', async ({ app, page }) => {
  await app.createPlan('Trening z cofaniem')
  await app.openPlayer()
  await app.freezeClock()
  await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click()
  const previous = page.getByRole('button', { name: 'Poprzedni etap', exact: true })

  // First step: always restarts.
  await page.clock.runFor(10_000)
  await expect(page.getByText('Pozostały czas: 50 sekund', { exact: true })).toBeAttached()
  await previous.click()
  await expect(page.getByText('Pozostały czas: 1 minuta', { exact: true })).toBeAttached()

  // Rest after the first round, within three seconds: back to the round.
  await page.clock.runFor(62_000)
  await expect(page.getByText('Pozostały czas: 28 sekund', { exact: true })).toBeAttached()
  await previous.click()
  await expect(page.getByText('Pozostały czas: 1 minuta', { exact: true })).toBeAttached()

  // Rest again, after more than three seconds: the rest starts over.
  await page.clock.runFor(65_000)
  await expect(page.getByText('Pozostały czas: 25 sekund', { exact: true })).toBeAttached()
  await previous.click()
  await expect(page.getByText('Pozostały czas: 30 sekund', { exact: true })).toBeAttached()
})

test('plays, pauses and resumes through rounds and rest with correct history totals', async ({ app, page }) => {
  await app.createPlan('Trening z zegarem')
  await app.openPlayer()
  await app.freezeClock()
  await expect(page.getByText('Pozostały czas: 1 minuta', { exact: true })).toBeAttached()
  await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click()
  await page.clock.runFor(10_000)
  await expect(page.getByText('Pozostały czas: 50 sekund', { exact: true })).toBeAttached()
  await page.getByRole('button', { name: 'Pauza', exact: true }).click()
  await page.clock.runFor(90_000)
  await expect(page.getByText('WSTRZYMANO', { exact: true })).toBeVisible()
  await expect(page.getByText('Pozostały czas: 50 sekund', { exact: true })).toBeAttached()
  await page.getByRole('button', { name: 'Wznów', exact: true }).click()
  await page.clock.runFor(50_000)
  await expect(page.getByText('Pozostały czas: 30 sekund', { exact: true })).toBeAttached()
  await page.clock.runFor(30_000)
  await expect(page.getByText('Pozostały czas: 1 minuta', { exact: true })).toBeAttached()
  await page.clock.runFor(60_000)
  await expect(page.getByRole('heading', { name: 'Walka z cieniem', exact: true })).toBeVisible()
  await page.clock.runFor(60_000)
  await app.expectWorkoutSaved()

  const history = await app.openHistory()
  await expect(history.getByRole('article')).toHaveCount(1)
  await expect(history.getByRole('heading', { name: 'Trening z zegarem', exact: true })).toBeVisible()
  // Per domain-model.md: 210 seconds include round rest, but exclude the 90-second pause.
  // UI rounds up to 4 min; including the pause would incorrectly show 5 min.
  await expect(history.getByText('4 min', { exact: true })).toBeVisible()
  await expect(history.getByText('11:05', { exact: true })).toBeVisible()
  await expect(history.getByText('2/2 ćwiczeń', { exact: true })).toBeVisible()
  await expect(history.getByText('2/2 rund', { exact: true })).toBeVisible()
})
