import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'
import { block, roundsExercise, workoutPlan } from '../src/test/workoutBuilders'

for (const theme of ['dark', 'light'] as const) {
  test(`records fifteen extra seconds and shows variant two in ${theme}`, async ({ app, page }, testInfo) => {
    await app.createPlan('Korekta czasu rundy', '3:00')
    await app.setTheme(theme)
    await app.openPlayer()
    await app.freezeClock()
    const add = page.getByRole('button', { name: 'Dodaj 15 sekund / 15 s', exact: true })
    await expect(add).toHaveCount(0)
    await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click()
    await expect(add).toHaveCount(0)
    await app.startWorkout()
    await add.click()
    await expect(page.getByText('Pozostały czas: 3 minuty i 15 sekund', { exact: true })).toBeAttached()
    await expect(page.locator('p[aria-live="polite"]', { hasText: '+15 s' })).toBeVisible()
    for (const label of ['Dodaj 15 sekund / 15 s', 'Odejmij 15 sekund / 15 s']) {
      const button = page.getByRole('button', { name: label, exact: true })
      await expect(button.getByText('15 s', { exact: true })).toBeVisible()
      const box = (await button.boundingBox())!
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width)
    }
    expect((await page.locator('svg[viewBox="0 0 260 260"]').boundingBox())!.width).toBe(260)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width)
    await page.clock.runFor(1000)
    await expect(page.locator('p[aria-live="polite"]', { hasText: '+15 s' })).toHaveCount(0)
    await page.evaluate(() => document.fonts.ready)
    if (process.env.CAPTURE_SCREENSHOTS === '1' && testInfo.project.name === 'phone') {
      const screenshotPath = path.resolve('docs/screenshots/issue-91', `variant-2-${theme}.png`)
      await page.screenshot({ path: screenshotPath })
      await testInfo.attach(`variant-2-${theme}`, { path: screenshotPath, contentType: 'image/png' })
    }
    await page.clock.resume()
    await page.clock.setFixedTime(new Date('2026-11-03T10:00:01.000Z'))
    expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) =>
      impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
    await page.clock.setFixedTime(new Date('2026-11-03T10:07:45.000Z'))
    await app.expectWorkoutSaved()
    const session = (await app.readSessions())[0]
    expect(session).toMatchObject({ status: 'completed', durationSeconds: 465, workSeconds: 435,
      completion: { completed: 2, planned: 2, unit: 'exercise' } })
    if (session.source === 'manual') throw new Error('Expected a plan session')
    expect(session.stepResults[0]).toMatchObject({ plannedDurationSeconds: 195, performedDurationSeconds: 195, outcome: 'completed' })
    await expect(add).toHaveCount(0)
  })
}

test('recovers running and exact paused corrections, then returns to the plan duration', async ({ app, page }) => {
  await app.createPlan('Wznowienie korekty')
  await app.openPlayer()
  const time = Date.parse('2026-11-12T10:00:00.000Z')
  await page.clock.setFixedTime(new Date(time))
  await app.startWorkout()
  await page.getByRole('button', { name: 'Dodaj 15 sekund / 15 s', exact: true }).click()
  await page.reload()
  await expect(page.getByText('Pozostały czas: 1 minuta i 15 sekund', { exact: true })).toBeAttached()
  await page.clock.setFixedTime(new Date(time + 375))
  await page.getByRole('button', { name: 'Pauza', exact: true }).click()
  await page.getByRole('button', { name: 'Odejmij 15 sekund / 15 s', exact: true }).click()
  await expect(page.getByText('Pozostały czas: 1 minuta', { exact: true })).toBeAttached()
  await page.getByRole('button', { name: 'Dodaj 15 sekund / 15 s', exact: true }).click()
  await page.goto('about:blank')
  await page.clock.setFixedTime(new Date(time + 600_000))
  await page.goto('/workouts')
  await expect(page.getByRole('button', { name: 'Wznów', exact: true })).toBeVisible()
  await expect(page.getByText('Pozostały czas: 1 minuta i 15 sekund', { exact: true })).toBeAttached()
  await page.getByRole('button', { name: 'Wznów', exact: true }).click()
  await page.clock.setFixedTime(new Date(time + 674_000))
  await expect(page.getByText('Pozostały czas: 1 sekunda', { exact: true })).toBeAttached()
  await page.clock.setFixedTime(new Date(time + 674_625))
  await expect(page.getByText('ODPOCZYNEK', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Poprzedni etap', exact: true }).click()
  await expect(page.getByText('Pozostały czas: 1 minuta', { exact: true })).toBeAttached()
  await page.clock.setFixedTime(new Date(time + 884_625))
  await app.expectWorkoutSaved()
  const session = (await app.readSessions())[0]
  expect(session).toMatchObject({ workSeconds: 255, completion: { completed: 2, planned: 2, unit: 'exercise' } })
  if (session.source === 'manual') throw new Error('Expected a plan session')
  expect(session.stepResults[0]).toMatchObject({ plannedDurationSeconds: 75, performedDurationSeconds: 75, outcome: 'completed' })
})

for (const paused of [false, true]) {
  test(`subtracting at ten seconds completes normally, paused=${paused}`, async ({ app, page }) => {
    await app.createPlan('Koniec po korekcie')
    await app.openPlayer()
    await app.freezeClock()
    await app.startWorkout()
    await page.clock.runFor(50_000)
    if (paused) await page.getByRole('button', { name: 'Pauza', exact: true }).click()
    await page.getByRole('button', { name: 'Odejmij 15 sekund / 15 s', exact: true }).click()
    await expect(page.getByText('ODPOCZYNEK', { exact: true })).toBeVisible()
    await expect(page.getByText('Pozostały czas: 30 sekund', { exact: true })).toBeAttached()
    if (paused) {
      await expect(page.getByRole('button', { name: 'Wznów', exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Wznów', exact: true }).click()
    }
    await page.getByRole('button', { name: 'Dodaj 15 sekund / 15 s', exact: true }).click()
    await expect(page.getByText('Pozostały czas: 45 sekund', { exact: true })).toBeAttached()
    await page.clock.fastForward(165_000)
    await app.expectWorkoutSaved()
    const session = (await app.readSessions())[0]
    // 50 s of the 1:00 round were worked before the cut, so the round records 50 s.
    expect(session).toMatchObject({ status: 'completed', workSeconds: 170 })
    if (session.source === 'manual') throw new Error('Expected a plan session')
    expect(session.stepResults[0]).toMatchObject({ plannedDurationSeconds: 50, performedDurationSeconds: 50, outcome: 'completed' })
  })
}

test('restarting an adjusted paused stage resets to the plan target', async ({ app, page }) => {
  await app.open('/')
  const plan = workoutPlan([block('bag', [roundsExercise('jab', 2, 180, 30)], 'bag')])
  await app.seedPlan(plan)
  await app.open(`/workouts/${plan.id}`)
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.getByRole('button', { name: 'Dodaj 15 sekund / 15 s', exact: true }).click()
  await page.getByRole('button', { name: 'Dodaj 15 sekund / 15 s', exact: true }).click()
  await page.getByRole('button', { name: 'Pauza', exact: true }).click()
  await page.getByRole('button', { name: 'Poprzedni etap', exact: true }).click()
  await expect(page.getByText('Pozostały czas: 3 minuty', { exact: true })).toBeAttached()
  await page.getByRole('button', { name: 'Wznów', exact: true }).click()
  await page.clock.fastForward(390_000)
  await app.expectWorkoutSaved()
  expect((await app.readSessions())[0]).toMatchObject({ workSeconds: 360, durationSeconds: 390 })
})
