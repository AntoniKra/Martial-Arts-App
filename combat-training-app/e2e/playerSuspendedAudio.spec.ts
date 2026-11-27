import type { Page } from '@playwright/test'

import { test, expect, openProfile } from './fixtures'
import { block, roundsExercise, workoutPlan } from '../src/test/workoutBuilders'

async function audioCounts(page: Page) {
  return page.evaluate(() => {
    const frequencies = Reflect.get(window, '__suspendedAudioFrequencies') as number[]
    return {
      warnings: frequencies.filter((frequency) => frequency === 2500).length / 3,
      workEnds: frequencies.filter((frequency) => frequency === 520).length,
    }
  })
}

for (const audio of ['deferred', 'native'] as const) {
  test.describe(`${audio} AudioContext resume`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((mode) => {
        const frequencies: number[] = []
        Reflect.set(window, '__suspendedAudioFrequencies', frequencies)
        if (mode === 'native') {
          // Keep the browser's actual suspend/resume promises and audio nodes.
          class TracedAudioContext extends window.AudioContext {
            constructor() {
              super()
              Reflect.set(window, '__suspendedAudioContext', this)
            }
            createOscillator() {
              const oscillator = super.createOscillator()
              const setValueAtTime = oscillator.frequency.setValueAtTime.bind(oscillator.frequency)
              oscillator.frequency.setValueAtTime = (value, time) => {
                frequencies.push(value)
                return setValueAtTime(value, time)
              }
              return oscillator
            }
          }
          window.AudioContext = TracedAudioContext
        } else {
          class DeferredAudioContext {
            state = 'running'
            currentTime = 0
            sampleRate = 44100
            destination = {}
            private pendingResumes: (() => void)[] = []
            constructor() {
              Reflect.set(window, '__suspendedAudioContext', this)
              Reflect.set(window, '__releaseWorkoutAudio', () => {
                this.state = 'running'
                this.pendingResumes.splice(0).forEach((resolve) => resolve())
              })
            }
            suspend() { this.state = 'suspended'; return Promise.resolve() }
            resume() {
              return this.state === 'running' ? Promise.resolve() :
                new Promise<void>((resolve) => this.pendingResumes.push(resolve))
            }
            close() { this.state = 'closed'; return Promise.resolve() }
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
          Object.defineProperty(window, 'AudioContext', { configurable: true, value: DeferredAudioContext })
        }
      }, audio)
    })

    for (const source of ['plan', 'quickTimer'] as const) {
      for (const remainingMs of [9000, 7000, 6999]) {
        test(`preserves the current rest warning at ${remainingMs} ms in ${source}`, async ({ app, page }) => {
          await app.open('/profile')
          // Settings can render before Firestore is ready; wait before handing off its persistent lease.
          await openProfile(page)
          await page.getByRole('radiogroup', { name: 'Sygnał przed końcem rundy', exact: true })
            .getByRole('radio', { name: 'Wyłączony', exact: true }).click()
          await page.getByRole('radiogroup', { name: 'Sygnał przed końcem przerwy', exact: true })
            .getByRole('radio', { name: '10 s', exact: true }).click()
          if (source === 'plan') {
            await app.open('/workouts')
            const plan = workoutPlan([block('b1', [roundsExercise('work', 2, 40, 20)])])
            await app.seedPlan(plan)
            await app.open(`/workouts/${plan.id}`)
            await app.openPlayer()
          } else {
            await app.open('/quick-timer')
            await page.getByRole('button', { name: '3 × 2:00 przerwa 1:00', exact: true }).click()
            await page.getByRole('button', { name: 'Start', exact: true }).click()
            await expect(page.getByRole('button', { name: 'Rozpocznij trening', exact: true })).toBeVisible()
          }
          await app.freezeClock()
          await app.startWorkout()
          await expect.poll(() => page.evaluate(() =>
            (Reflect.get(window, '__suspendedAudioContext') as AudioContext).state)).toBe('running')
          const hiddenAtMs = source === 'plan' ? 35_000 : 119_000
          const restDeadlineMs = source === 'plan' ? 60_000 : 180_000
          await page.clock.runFor(hiddenAtMs)
          expect(await audioCounts(page)).toEqual({ warnings: 0, workEnds: 0 })
          await page.evaluate(async () => {
            await (Reflect.get(window, '__suspendedAudioContext') as AudioContext).suspend()
            Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
            document.dispatchEvent(new Event('visibilitychange'))
          })
          expect(await page.evaluate(() =>
            (Reflect.get(window, '__suspendedAudioContext') as AudioContext).state)).toBe('suspended')
          const now = await page.evaluate(() => Date.now())
          // Skip intervals while hidden; visibilitychange must reconcile the production hook.
          await page.clock.setSystemTime(new Date(now + restDeadlineMs - hiddenAtMs - remainingMs))
          await page.evaluate(() => {
            Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
            document.dispatchEvent(new Event('visibilitychange'))
          })
          await expect(page.getByText('ODPOCZYNEK', { exact: true })).toBeVisible()
          await expect(page.getByText(`Pozostały czas: ${Math.ceil(remainingMs / 1000)} sekund`, { exact: true })).toBeAttached()
          if (audio === 'deferred') {
            expect(await audioCounts(page)).toEqual({ warnings: 0, workEnds: 0 })
            await page.evaluate(() => (Reflect.get(window, '__releaseWorkoutAudio') as () => void)())
          }
          await expect.poll(() => page.evaluate(() =>
            (Reflect.get(window, '__suspendedAudioContext') as AudioContext).state)).toBe('running')
          const expected = remainingMs >= 7000 ? 1 : 0
          await expect.poll(async () => (await audioCounts(page)).warnings).toBe(expected)
          // A due warning wins the batch; its stale transition gong must never replace it.
          expect((await audioCounts(page)).workEnds).toBe(expected === 1 ? 0 : 1)
          await page.evaluate(() => {
            document.dispatchEvent(new Event('visibilitychange'))
            document.dispatchEvent(new Event('visibilitychange'))
          })
          await page.clock.runFor(remainingMs + 500)
          expect((await audioCounts(page)).warnings).toBe(expected)
        })
      }
    }
  })
}
