import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'

import { test, expect } from './fixtures'

const exitButton = (page: Page) => page.getByRole('button', { name: 'Zakończ trening', exact: true })
const exitDialog = (page: Page) => page.getByRole('dialog', { name: 'Zakończyć trening?', exact: true })

async function openExit(page: Page) {
  await exitButton(page).click()
  await expect(exitDialog(page)).toBeVisible()
  await expect(exitDialog(page)).toHaveAccessibleDescription('Trening jest wstrzymany. Zapiszą się tylko dokończone rundy.')
}

async function confirmDiscard(page: Page) {
  await exitDialog(page).getByRole('button', { name: 'Porzuć bez zapisu…', exact: true }).click()
  const confirmation = page.getByRole('dialog', { name: 'Porzucić trening?', exact: true })
  await expect(confirmation).toHaveAccessibleDescription('Dane z tego treningu przepadną. Tej operacji nie można cofnąć.')
  await confirmation.getByRole('button', { name: 'Porzuć', exact: true }).click()
}

test('ends early after a completed round, records every step and shows partial status in both histories', async ({ app, page }) => {
  await app.createPlan('Trening czesciowy')
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.fastForward(90_000)
  await page.clock.runFor(5_000)
  await openExit(page)
  await page.clock.fastForward(120_000)
  await exitDialog(page).getByRole('button', { name: 'Zakończ i zapisz', exact: true }).click()
  await page.clock.resume()
  await expect(page.getByText('Trening częściowy', { exact: true })).toBeVisible()
  await expect(page.getByText('Wpis jest już w dzienniku. Oceny dopisują się do niego.', { exact: true })).toBeVisible()
  await expect.poll(async () => (await app.readSessions()).length).toBe(1)
  const sessions = await app.readSessions()
  expect(sessions).toHaveLength(1)
  expect(sessions[0]).toMatchObject({
    status: 'partial', durationSeconds: 95, workSeconds: 60,
    completion: { completed: 0, planned: 2, unit: 'exercise' },
    stepResults: [
      { kind: 'exercise', outcome: 'completed', performedDurationSeconds: 60 },
      { kind: 'roundRest', outcome: 'completed', performedDurationSeconds: 30 },
      { kind: 'exercise', outcome: 'skipped', performedDurationSeconds: 0 },
      { kind: 'exercise', outcome: 'skipped', performedDurationSeconds: 0 },
    ],
  })
  await page.getByRole('link', { name: 'Wróć do planu', exact: true }).click()
  const history = await app.openHistory()
  await expect(history.getByText('Częściowy', { exact: true })).toBeVisible()
  await app.open('/')
  await expect(page.getByRole('link').filter({ hasText: 'Trening czesciowy' }).getByText('Częściowy', { exact: true })).toBeVisible()
})

test('does not save an interrupted first round and allows a fresh completed run', async ({ app, page }) => {
  await app.createPlan('Bez ukonczonej rundy')
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.runFor(500)
  await openExit(page)
  await exitDialog(page).getByRole('button', { name: 'Zakończ i zapisz', exact: true }).click()
  await page.clock.resume()
  await expect(page.getByRole('heading', { name: 'Nie zapisano treningu', exact: true })).toBeVisible()
  await expect(page.getByText('Trening niezapisany', { exact: true })).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('Zapisujemy tylko rundy i ćwiczenia, które dobiegły do końca czasu. Tym razem żadne nie dobiegło.')
  expect(await app.readSessions()).toHaveLength(0)
  await page.getByRole('button', { name: 'Uruchom ponownie', exact: true }).click()
  await app.startWorkout()
  await page.clock.fastForward(210_000)
  await app.expectWorkoutSaved()
  expect(await app.readSessions()).toHaveLength(1)
})

test('blocks the header link and discards without saving even after completed work', async ({ app, page }) => {
  const planUrl = await app.createPlan('Porzucony trening')
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.fastForward(60_000)
  await page.getByRole('link', { name: 'Wróć do planu', exact: true }).click()
  await expect(exitDialog(page)).toBeVisible()
  await expect(page).toHaveURL(`${planUrl}/active`)
  await confirmDiscard(page)
  await expect(page).toHaveURL(planUrl)
  expect(await app.readSessions()).toHaveLength(0)
})

test('returns to the same running step, excludes dialog time and preserves a pre-existing pause', async ({ app, page }) => {
  await app.createPlan('Powrot do cwiczen')
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.runFor(10_000)
  await openExit(page)
  await page.clock.fastForward(120_000)
  await exitDialog(page).getByRole('button', { name: 'Wróć do treningu', exact: true }).click()
  await expect(page.getByText('Runda 1 z 2', { exact: true })).toBeVisible()
  await expect(page.getByText('Pozostały czas: 50 sekund', { exact: true })).toBeAttached()
  await expect(page.getByRole('button', { name: 'Pauza', exact: true })).toBeVisible()
  await page.clock.runFor(5_000)
  await page.getByRole('button', { name: 'Pauza', exact: true }).click()
  await openExit(page)
  await page.clock.fastForward(120_000)
  await page.keyboard.press('Escape')
  await expect(exitButton(page)).toBeFocused()
  await expect(page.getByRole('button', { name: 'Wznów', exact: true })).toBeVisible()
  await page.clock.fastForward(120_000)
  await expect(page.getByText('Pozostały czas: 45 sekund', { exact: true })).toBeAttached()
  await page.getByRole('button', { name: 'Wznów', exact: true }).click()
  await page.clock.fastForward(195_000)
  await app.expectWorkoutSaved()
  expect((await app.readSessions())[0]).toMatchObject({ durationSeconds: 210, workSeconds: 180 })
})

test('blocks browser back, cancels it and can block it again before discarding', async ({ app, page }) => {
  const planUrl = await app.createPlan('Wstecz w przegladarce')
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.goBack()
  await expect(exitDialog(page)).toBeVisible()
  await expect(page).toHaveURL(`${planUrl}/active`)
  await page.keyboard.press('Escape')
  await expect(exitButton(page)).toBeFocused()
  await expect(page.getByRole('button', { name: 'Pauza', exact: true })).toBeVisible()
  await page.goBack()
  await expect(exitDialog(page)).toBeVisible()
  await confirmDiscard(page)
  await expect(page).toHaveURL(planUrl)
  expect(await app.readSessions()).toHaveLength(0)
})

test('discards by continuing browser back without leaving the player behind in backward history', async ({ app, page }) => {
  const planUrl = await app.createPlan('Historia po porzuceniu')
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.fastForward(60_000)
  await page.goBack()
  await expect(exitDialog(page)).toBeVisible()
  await confirmDiscard(page)
  await expect(page).toHaveURL(planUrl)
  await expect(page.getByRole('heading', { name: 'Historia po porzuceniu', exact: true })).toBeVisible()
  expect(await app.readSessions()).toHaveLength(0)
  await page.goBack()
  await expect(page).toHaveURL('/workouts')
  await expect(page.getByRole('heading', { name: 'Treningi', exact: true })).toBeVisible()
  await expect(exitDialog(page)).toHaveCount(0)
})

test('discards from the exit button by navigating to the plan without saving', async ({ app, page }) => {
  const planUrl = await app.createPlan('Porzucenie z menu')
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.fastForward(60_000)
  await openExit(page)
  await confirmDiscard(page)
  await expect(page).toHaveURL(planUrl)
  expect(await app.readSessions()).toHaveLength(0)
})

test('leaves without confirmation before start and after completion and shows completed status in both histories', async ({ app, page }) => {
  const planUrl = await app.createPlan('Ukonczony trening')
  await app.openPlayer()
  await page.getByRole('link', { name: 'Wróć do planu', exact: true }).click()
  await expect(page).toHaveURL(planUrl)
  await expect(exitDialog(page)).toHaveCount(0)
  await app.openPlayer()
  await app.finishWorkout()
  await page.getByRole('link', { name: 'Wróć do planu', exact: true }).click()
  await expect(page).toHaveURL(planUrl)
  const history = await app.openHistory()
  await expect(history.getByText('Ukończony', { exact: true })).toBeVisible()
  await app.open('/')
  await expect(page.getByRole('link').filter({ hasText: 'Ukonczony trening' }).getByText('Ukończony', { exact: true })).toBeVisible()
})

test('finishes the whole exercise instead of the next round and preserves earlier completed work', async ({ app, page }) => {
  await app.createPlan('Koniec cwiczenia')
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.fastForward(90_000)
  await page.clock.runFor(5_000)
  await openExit(page)
  await exitDialog(page).getByRole('button', { name: /Pomiń resztę ćwiczenia/ }).click()
  await expect(page.getByRole('heading', { name: 'Walka z cieniem', exact: true })).toBeVisible()
  await expect(exitDialog(page)).not.toBeVisible()
  await page.clock.fastForward(60_000)
  await app.expectWorkoutSaved()
  expect((await app.readSessions())[0]).toMatchObject({ status: 'partial', durationSeconds: 155, workSeconds: 120,
    stepResults: [{ outcome: 'completed' }, { outcome: 'completed' }, { outcome: 'skipped', performedDurationSeconds: 0 }, { outcome: 'completed' }],
  })
})

test('finishes all remaining rounds from the first round without crediting interrupted work', async ({ app, page }) => {
  await app.createPlan('Pominiete rundy')
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.runFor(10_000)
  await openExit(page)
  await exitDialog(page).getByRole('button', { name: /Pomiń resztę ćwiczenia/ }).click()
  await expect(page.getByRole('heading', { name: 'Walka z cieniem', exact: true })).toBeVisible()
  await page.clock.fastForward(60_000)
  await app.expectWorkoutSaved()
  expect((await app.readSessions())[0]).toMatchObject({ status: 'partial', durationSeconds: 70, workSeconds: 60,
    stepResults: [{ outcome: 'skipped' }, { outcome: 'skipped' }, { outcome: 'skipped' }, { outcome: 'completed' }],
  })
})

test.describe('offline with the PWA cache', () => {
  // Lazy routes need the same precache used by the installed application.
  test.use({ serviceWorkers: 'allow' })

  test('queues an early save offline and starts a new completed session from the plan', async ({ app, page, context }) => {
    await app.createPlan('Ponowienie treningu')
    await app.prepareOffline()
    await app.openPlayer()
    await app.freezeClock()
    await app.startWorkout()
    await page.clock.fastForward(60_000)
    await page.evaluate(async () => { await navigator.serviceWorker.ready })
    await context.setOffline(true)
    await openExit(page)
    await exitDialog(page).getByRole('button', { name: 'Zakończ i zapisz', exact: true }).click()
    await page.clock.resume()
    await expect(page.getByText('Trening częściowy', { exact: true })).toBeVisible()
    await expect(page.getByText('Czeka na wysłanie', { exact: true })).toBeVisible()
    expect(await app.readSessions()).toHaveLength(0)
    await context.setOffline(false)
    await expect.poll(async () => (await app.readSessions()).length).toBe(1)
    await page.getByRole('link', { name: 'Wróć do planu', exact: true }).click()
    await app.openPlayer()
    await app.startWorkout()
    await page.clock.fastForward(210_000)
    await app.expectWorkoutSaved()
    await expect.poll(async () => (await app.readSessions()).length).toBe(2)
    expect((await app.readSessions()).map((session) => session.status).sort()).toEqual(['completed', 'partial'])
  })
})

for (const theme of ['dark', 'light'] as const) {
  test(`supports keyboard, traps dialog focus and has an accessible exit dialog in ${theme} theme`, async ({ app, page }) => {
    await app.createPlan('Dostepne zakonczenie')
    await app.setTheme(theme)
    await app.openPlayer()
    await app.startWorkout()
    await exitButton(page).focus()
    await page.keyboard.press('Enter')
    const buttons = exitDialog(page).getByRole('button')
    await expect(buttons).toHaveText(['Wróć do treningu', 'Pomiń resztę ćwiczenia (2 rundy)', 'Zakończ i zapisz', 'Porzuć bez zapisu…'])
    await expect(buttons.first()).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(buttons.last()).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(buttons.first()).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(buttons.nth(1)).toBeFocused()
    await page.evaluate(() => document.fonts.ready)
    expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
    await page.keyboard.press('Escape')
    await expect(exitDialog(page)).not.toBeVisible()
    await expect(exitButton(page)).toBeFocused()
    await expect(page.getByRole('button', { name: 'Pauza', exact: true })).toBeVisible()
  })
}
