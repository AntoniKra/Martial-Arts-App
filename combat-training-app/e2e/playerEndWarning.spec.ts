import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'

import { test, expect, openProfile } from './fixtures'
import { block, continuousExercise, roundsExercise, workoutBreak, workoutPlan } from '../src/test/workoutBuilders'

const settingLabel = 'Sygnał przed końcem rundy'
const storageKey = 'combat-training.endWarnings'

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
      createDynamicsCompressor() {
        const parameter = () => ({ setValueAtTime() {} })
        return { threshold: parameter(), knee: parameter(), ratio: parameter(), attack: parameter(), release: parameter(), connect() {} }
      }
      createBiquadFilter() {
        return { type: 'bandpass', frequency: { setValueAtTime() {} }, Q: { setValueAtTime() {} }, connect() {}, disconnect() {} }
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
    return frequencies.filter((frequency) => frequency === 2500).length / 3
  })
}

async function expectWarnings(page: Page, count: number) {
  expect(await warningCount(page)).toBe(count)
}

async function setWarningTimes(page: Page, round: string, rest: string) {
  await page.getByRole('radiogroup', { name: settingLabel, exact: true }).getByRole('radio', { name: round, exact: true }).click()
  await page.getByRole('radiogroup', { name: 'Sygnał przed końcem przerwy', exact: true }).getByRole('radio', { name: rest, exact: true }).click()
}

async function openQuickTimer(page: Page, restSeconds = 60) {
  await page.getByRole('button', { name: 'Worek', exact: true }).click()
  await page.getByRole('combobox', { name: 'Dyscyplina', exact: true }).selectOption('boxing')
  await page.getByRole('button', { name: '3 × 2:00 · przerwa 1:00', exact: true }).click()
  if (restSeconds !== 60) {
    await page.getByRole('button', { name: 'Własny', exact: true }).click()
    for (let seconds = 60; seconds > restSeconds; seconds -= 5) {
      await page.getByRole('button', { name: 'Zmniejsz: Przerwa między rundami', exact: true }).click()
    }
  }
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Rozpocznij trening', exact: true })).toBeVisible()
}

async function returnFromSuspension(page: Page, elapsedMs: number) {
  const warnings = await warningCount(page)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  const before = await page.evaluate(() => Date.now())
  // Change wall time without firing intervals: only visibilitychange may reconcile the hook.
  await page.clock.setSystemTime(new Date(before + elapsedMs))
  await expectWarnings(page, warnings)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

for (const theme of ['dark', 'light'] as const) {
  test(`shows an accessible remembered device setting in ${theme}`, async ({ app, page }, testInfo) => {
    await app.open('/workouts')
    const plan = { ...workoutPlan([block('b1', [roundsExercise('round', 2, 40, 40)])]),
      nameSnapshot: 'Rundy na worku' }
    await app.seedPlan(plan)
    await app.open(`/workouts/${plan.id}`)
    await app.setTheme(theme)
    await openProfile(page)
    const group = page.getByRole('radiogroup', { name: settingLabel, exact: true })
    const setting = group.getByRole('radio', { name: '10 s', exact: true })
    await expect(setting).toBeChecked()
    const label = setting.locator('..')
    const box = (await label.boundingBox())!
    expect(box.height).toBeGreaterThanOrEqual(44)
    expect(box.width).toBeGreaterThanOrEqual(44)
    await setting.focus()
    await setting.press('Home')
    await expect(setting).not.toBeChecked()
    await page.reload()
    await expect(setting).not.toBeChecked()
    await setting.click()
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
  await openProfile(page)
  await page.getByRole('radiogroup', { name: 'Sygnał przed końcem przerwy', exact: true }).getByRole('radio', { name: '10 s', exact: true }).click()
  await page.getByRole('radiogroup', { name: 'Przygotowanie przed startem', exact: true })
    .getByRole('radio', { name: '30 s', exact: true }).click()
  await app.open(`/workouts/${plan.id}`)
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
  await openProfile(page)
  await page.getByRole('radiogroup', { name: settingLabel, exact: true }).getByRole('radio', { name: 'Wyłączony', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('radiogroup', { name: settingLabel, exact: true }).getByRole('radio', { name: 'Wyłączony', exact: true })).toBeChecked()
  await app.open(`/workouts/${plan.id}`)
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ round: '10', rest: '10' })), storageKey)
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

test('uses independent profile warning times in the quick timer and avoids duplicates after a background return', async ({ app, page }) => {
  await app.open('/profile')
  await openProfile(page)
  await page.getByRole('radiogroup', { name: 'Sygnał przed końcem rundy', exact: true }).getByRole('radio', { name: '15 s', exact: true }).click()
  await page.getByRole('radiogroup', { name: 'Sygnał przed końcem przerwy', exact: true }).getByRole('radio', { name: '5 s', exact: true }).click()
  await app.open('/quick-timer')
  await page.getByRole('button', { name: 'Worek', exact: true }).click()
  await page.getByRole('combobox', { name: 'Dyscyplina', exact: true }).selectOption('boxing')
  await page.getByRole('button', { name: '3 × 2:00 · przerwa 1:00', exact: true }).click()
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Rozpocznij trening', exact: true })).toBeVisible()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.runFor(104_750)
  await expectWarnings(page, 0)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.clock.fastForward(1250)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expectWarnings(page, 1)
  await page.clock.runFor(14_000)
  await expectWarnings(page, 1)
  await page.clock.runFor(54_750)
  await expectWarnings(page, 1)
  await page.clock.runFor(250)
  await expectWarnings(page, 2)
  await page.clock.runFor(5000)
  await expectWarnings(page, 2)
})

for (const source of ['plan', 'quickTimer'] as const) {
  for (const remainingMs of [9000, 7000, 6999]) {
    test(`reconciles the real playback hook into the next rest at ${remainingMs} ms in ${source}`, async ({ app, page }) => {
      await app.open('/profile')
      await openProfile(page)
      await setWarningTimes(page, 'Wyłączony', '10 s')
      if (source === 'plan') {
        await app.open('/workouts')
        const plan = workoutPlan([block('b1', [roundsExercise('work', 2, 40, 20)])])
        await app.seedPlan(plan)
        await app.open(`/workouts/${plan.id}`)
        await app.openPlayer()
      } else {
        await app.open('/quick-timer')
        await openQuickTimer(page)
      }
      await app.freezeClock()
      await app.startWorkout()
      const hiddenAtMs = source === 'plan' ? 35_000 : 119_000
      const restDeadlineMs = source === 'plan' ? 60_000 : 180_000
      await page.clock.runFor(hiddenAtMs)
      await expectWarnings(page, 0)
      await returnFromSuspension(page, restDeadlineMs - hiddenAtMs - remainingMs)
      await expect(page.getByText('ODPOCZYNEK', { exact: true })).toBeVisible()
      await expect(page.getByText(`Pozostały czas: ${Math.ceil(remainingMs / 1000)} sekund`, { exact: true })).toBeAttached()
      const expected = remainingMs >= 7000 ? 1 : 0
      await expectWarnings(page, expected)
      await page.evaluate(() => {
        document.dispatchEvent(new Event('visibilitychange'))
        document.dispatchEvent(new Event('visibilitychange'))
      })
      await page.clock.runFor(remainingMs + 500)
      await expectWarnings(page, expected)
    })
  }

  test(`reconciles the real playback hook into the next work warning in ${source}`, async ({ app, page }) => {
    await app.open('/profile')
    // Settings can render before Firestore is ready; wait before handing off its persistent lease.
    await openProfile(page)
    await setWarningTimes(page, '10 s', 'Wyłączony')
    if (source === 'plan') {
      await app.open('/workouts')
      const plan = workoutPlan([block('b1', [roundsExercise('work', 2, 40, 20)])])
      await app.seedPlan(plan)
      await app.open(`/workouts/${plan.id}`)
      await app.openPlayer()
    } else {
      await app.open('/quick-timer')
      await openQuickTimer(page)
    }
    await app.freezeClock()
    await app.startWorkout()
    const hiddenAtMs = source === 'plan' ? 55_000 : 175_000
    const workDeadlineMs = source === 'plan' ? 100_000 : 300_000
    await page.clock.runFor(hiddenAtMs)
    await expectWarnings(page, 1)
    await returnFromSuspension(page, workDeadlineMs - hiddenAtMs - 9000)
    await expect(page.getByText('PRACA', { exact: true })).toBeVisible()
    await expect(page.getByText('Pozostały czas: 9 sekund', { exact: true })).toBeAttached()
    await expectWarnings(page, 2)
    await page.clock.runFor(500)
    await expectWarnings(page, 2)
  })
}

for (const seconds of [5, 10]) {
  test(`keeps equal ${seconds}-second round rests and standalone breaks silent in the real hook`, async ({ app, page }) => {
    await app.open('/profile')
    await openProfile(page)
    await setWarningTimes(page, 'Wyłączony', `${seconds} s`)
    await app.open('/workouts')
    const plan = workoutPlan([block('b1', [roundsExercise('work', 2, 40, seconds), workoutBreak('break', seconds), continuousExercise('last', 40)])])
    await app.seedPlan(plan)
    await app.open(`/workouts/${plan.id}`)
    await app.openPlayer()
    await app.freezeClock()
    await app.startWorkout()
    await page.clock.runFor(40_000)
    await expect(page.locator('.arc-phase-opening')).toHaveText(seconds === 5 ? 'OSTATNIE SEKUNDY' : 'ODPOCZYNEK')
    await expect(page.getByText(`Pozostały czas: ${seconds} sekund`, { exact: true })).toBeAttached()
    await expectWarnings(page, 0)
    await page.clock.runFor(seconds * 1000)
    await page.clock.runFor(40_000)
    await expect(page.locator('.arc-phase-opening')).toHaveText(seconds === 5 ? 'OSTATNIE SEKUNDY' : 'PRZERWA')
    await expect(page.getByText(`Pozostały czas: ${seconds} sekund`, { exact: true })).toBeAttached()
    await expectWarnings(page, 0)
    await page.clock.runFor(seconds * 1000)
    await expectWarnings(page, 0)
  })
}

test('keeps a rest equal to the threshold silent after crossing into it in the quick timer hook', async ({ app, page }) => {
  await app.open('/profile')
  await openProfile(page)
  await setWarningTimes(page, 'Wyłączony', '10 s')
  await app.open('/quick-timer')
  await openQuickTimer(page, 10)
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.runFor(119_000)
  await returnFromSuspension(page, 2000)
  await expect(page.getByText('ODPOCZYNEK', { exact: true })).toBeVisible()
  await expect(page.getByText('Pozostały czas: 9 sekund', { exact: true })).toBeAttached()
  await expectWarnings(page, 0)
  await page.clock.runFor(9500)
  await expectWarnings(page, 0)
})

test('warns only for the current phase when suspension spans multiple stages', async ({ app, page }) => {
  await app.open('/profile')
  await openProfile(page)
  await setWarningTimes(page, 'Wyłączony', '10 s')
  await app.open('/workouts')
  const plan = workoutPlan([block('b1', [roundsExercise('work', 3, 40, 20)])])
  await app.seedPlan(plan)
  await app.open(`/workouts/${plan.id}`)
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.runFor(35_000)
  await returnFromSuspension(page, 76_000)
  await expect(page.getByText('ODPOCZYNEK', { exact: true })).toBeVisible()
  await expect(page.getByText('Pozostały czas: 9 sekund', { exact: true })).toBeAttached()
  await expectWarnings(page, 1)
  await page.clock.runFor(9500)
  await expectWarnings(page, 1)
})
