import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'

import { test, expect } from './fixtures'
import { block, continuousExercise, roundsExercise, workoutBreak, workoutPlan } from '../src/test/workoutBuilders'

const settingLabel = 'Sygnał 10 s przed końcem rundy i przerwy'
const storageKey = 'combat-training.endWarningEnabled'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Observe the production synthesizer's calls without depending on an audio device or autoplay.
    const frequencies: number[] = []
    Object.defineProperty(window, '__workoutAudioFrequencies', { value: frequencies })
    class CountingAudioContext {
      state = 'running'
      currentTime = 0
      sampleRate = 44100
      destination = {}
      resume() { return Promise.resolve() }
      close() { return Promise.resolve() }
      createBuffer() { return {} }
      createBufferSource() { return { connect() {}, disconnect() {}, start() {} } }
      createOscillator() {
        return { type: 'sine', frequency: { setValueAtTime(value: number) { frequencies.push(value) } },
          connect() {}, disconnect() {}, start() {}, stop() {} }
      }
      createGain() {
        return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
          connect() {}, disconnect() {} }
      }
    }
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: CountingAudioContext })
  })
})

async function warningCount(page: Page) {
  return page.evaluate(() => {
    const frequencies = Reflect.get(window, '__workoutAudioFrequencies') as number[]
    return frequencies.filter((frequency) => frequency === 1400).length / 3
  })
}

async function expectWarnings(page: Page, count: number) {
  expect(await warningCount(page)).toBe(count)
}

for (const theme of ['dark', 'light'] as const) {
  test(`shows an accessible remembered device setting in ${theme}`, async ({ app, page }, testInfo) => {
    await app.open('/workouts')
    const plan = { ...workoutPlan([block('b1', [roundsExercise('round', 2, 40, 40)])]),
      nameSnapshot: 'Rundy na worku' }
    await app.seedPlan(plan)
    await app.open(`/workouts/${plan.id}`)
    await app.setTheme(theme)
    const setting = page.getByRole('switch', { name: settingLabel, exact: true })
    await expect(setting).toBeChecked()
    const label = setting.locator('..')
    const box = (await label.boundingBox())!
    expect(box.height).toBeGreaterThanOrEqual(44)
    expect(box.width).toBeGreaterThanOrEqual(44)
    await setting.focus()
    await setting.press('Space')
    await expect(setting).not.toBeChecked()
    await app.open(`/workouts/${plan.id}`)
    await expect(setting).not.toBeChecked()
    await setting.check()
    await page.evaluate(() => document.fonts.ready)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width)
    expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) =>
      impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
    if (process.env.CAPTURE_SCREENSHOTS === '1' && testInfo.project.name === 'phone' && testInfo.repeatEachIndex === 0) {
      const screenshotPath = path.resolve('docs/screenshots/issue-103', `end-warning-setting-${theme}-360x800.png`)
      await page.screenshot({ path: screenshotPath })
      await testInfo.attach(`end-warning-setting-${theme}`, { path: screenshotPath, contentType: 'image/png' })
    }
  })
}

test('warns once at ten seconds in rounds, rests, breaks and final continuous work, never in preparation', async ({ app, page }) => {
  await app.open('/workouts')
  const plan = workoutPlan([block('b1', [roundsExercise('round', 2, 40, 40),
    workoutBreak('break', 40), continuousExercise('continuous', 40)])])
  await app.seedPlan(plan)
  await app.open(`/workouts/${plan.id}`)
  await page.getByRole('radiogroup', { name: 'Przygotowanie przed startem', exact: true })
    .getByRole('radio', { name: '30 s', exact: true }).click()
  await app.openPlayer()
  await app.freezeClock()
  await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click()
  await page.clock.runFor(20_000)
  await expectWarnings(page, 0)
  await page.clock.runFor(10_000)
  for (let step = 0; step < 5; step += 1) {
    await page.clock.runFor(29_750)
    await expectWarnings(page, step)
    await page.clock.runFor(250)
    await expectWarnings(page, step + 1)
    await page.clock.runFor(9750)
    await expectWarnings(page, step + 1)
    await page.clock.runFor(250)
  }
  await app.expectWorkoutSaved()
  await expectWarnings(page, 5)
})

test('keeps a disabled preference for the current workout even if storage changes after start', async ({ app, page }) => {
  await app.open('/workouts')
  const plan = workoutPlan([block('b1', [continuousExercise('work', 40)])])
  await app.seedPlan(plan)
  await app.open(`/workouts/${plan.id}`)
  await page.getByRole('switch', { name: settingLabel, exact: true }).uncheck()
  await app.open(`/workouts/${plan.id}`)
  await expect(page.getByRole('switch', { name: settingLabel, exact: true })).not.toBeChecked()
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.evaluate((key) => localStorage.setItem(key, 'true'), storageKey)
  await page.clock.runFor(30_000)
  await expectWarnings(page, 0)
  await page.clock.runFor(10_000)
  await app.expectWorkoutSaved()
  await expectWarnings(page, 0)
})

test('pauses at twelve seconds and warns at ten after resume without replaying below ten', async ({ app, page }) => {
  await app.open('/workouts')
  const plan = workoutPlan([block('b1', [continuousExercise('work', 40)])])
  await app.seedPlan(plan)
  await app.open(`/workouts/${plan.id}`)
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.runFor(28_000)
  await page.getByRole('button', { name: 'Pauza', exact: true }).click()
  await page.clock.runFor(30_000)
  await expectWarnings(page, 0)
  await page.getByRole('button', { name: 'Wznów', exact: true }).click()
  await page.clock.runFor(1750)
  await expectWarnings(page, 0)
  await page.clock.runFor(250)
  await expectWarnings(page, 1)
  await page.clock.runFor(1000)
  await page.getByRole('button', { name: 'Pauza', exact: true }).click()
  await page.clock.runFor(30_000)
  await page.getByRole('button', { name: 'Wznów', exact: true }).click()
  await page.clock.runFor(5000)
  await expectWarnings(page, 1)
})

test('rearms after adding time and previous, and applies the lateness limit to subtraction', async ({ app, page }) => {
  await app.open('/workouts')
  const plan = workoutPlan([block('b1', [continuousExercise('work', 60)])])
  await app.seedPlan(plan)
  await app.open(`/workouts/${plan.id}`)
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  const add = page.getByRole('button', { name: 'Dodaj 15 sekund / 15 s', exact: true })
  const subtract = page.getByRole('button', { name: 'Odejmij 15 sekund / 15 s', exact: true })
  await page.clock.runFor(50_000)
  await expectWarnings(page, 1)
  await add.click()
  await page.clock.runFor(15_000)
  await expectWarnings(page, 2)
  await add.click()
  await page.clock.runFor(1000)
  await subtract.click()
  await expectWarnings(page, 3)
  await add.click()
  await page.clock.runFor(2250)
  await subtract.click()
  await expectWarnings(page, 3)
  await page.getByRole('button', { name: 'Poprzedni etap', exact: true }).click()
  await page.clock.runFor(50_000)
  await expectWarnings(page, 4)
})

test('skips a late threshold and does not replay it when reloaded below ten seconds', async ({ app, page }) => {
  await app.open('/workouts')
  const plan = workoutPlan([block('b1', [continuousExercise('work', 40)])])
  await app.seedPlan(plan)
  await app.open(`/workouts/${plan.id}`)
  await app.openPlayer()
  const time = Date.parse('2026-11-13T10:00:00Z')
  await page.clock.setFixedTime(new Date(time))
  await app.startWorkout()
  // An overdue timer samples the deadline once, as after a suspended tab.
  await page.clock.setFixedTime(new Date(time + 33_001))
  await expect(page.getByText('Pozostały czas: 7 sekund', { exact: true })).toBeAttached()
  await expectWarnings(page, 0)
  await page.reload()
  await page.getByRole('button', { name: 'Dźwięk wyłączony — stuknij, aby włączyć', exact: true }).click()
  await page.clock.setFixedTime(new Date(time + 34_000))
  await expect(page.getByText('Pozostały czas: 6 sekund', { exact: true })).toBeAttached()
  await expectWarnings(page, 0)
})
