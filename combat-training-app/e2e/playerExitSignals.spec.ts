import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'
import { block, continuousExercise, roundsExercise, workoutBreak, workoutPlan } from '../src/test/workoutBuilders'

const exit = 'Zakończyć trening?'
const discard = 'Porzucić trening?'

test('keeps completed work when the second discard confirmation is cancelled by Return or Escape', async ({ app, page }) => {
  await app.createPlan('Potwierdzenie porzucenia')
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.fastForward(60_000)
  await page.getByRole('button', { name: 'Zakończ trening', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: exit, exact: true })
  await dialog.getByRole('button', { name: 'Porzuć bez zapisu…', exact: true }).click()
  const confirmation = page.getByRole('dialog', { name: discard, exact: true })
  await expect(confirmation.getByRole('button', { name: 'Wróć', exact: true })).toBeFocused()
  await confirmation.getByRole('button', { name: 'Wróć', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Wróć do treningu', exact: true })).toBeFocused()
  await dialog.getByRole('button', { name: 'Porzuć bez zapisu…', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  await page.clock.fastForward(60_000)
  await expect(page.getByText('Pozostały czas: 30 sekund', { exact: true })).toBeAttached()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Pauza', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Zakończ trening', exact: true }).click()
  await dialog.getByRole('button', { name: 'Zakończ i zapisz', exact: true }).click()
  await app.expectWorkoutSaved()
  expect((await app.readSessions())[0]).toMatchObject({ status: 'partial', workSeconds: 60, durationSeconds: 60 })
})

test('counts remaining work from a round rest, preserves a pause and hides skip in a standalone break', async ({ app, page }) => {
  await app.open('/workouts')
  const plan = workoutPlan([block('b', [roundsExercise('round', 3, 40, 20), workoutBreak('break', 20), continuousExercise('last', 40)])])
  await app.seedPlan(plan)
  await app.open(`/workouts/${plan.id}`)
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.fastForward(40_000)
  await page.getByRole('button', { name: 'Pauza', exact: true }).click()
  await page.getByRole('button', { name: 'Zakończ trening', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: exit, exact: true })
  await dialog.getByRole('button', { name: 'Pomiń resztę ćwiczenia (2 rundy)', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Przerwa', exact: true })).toBeVisible()
  await expect(page.locator('.arc-phase-opening')).toHaveText('WSTRZYMANO')
  await expect(page.getByRole('button', { name: 'Wznów', exact: true })).toBeVisible()
  await page.clock.fastForward(60_000)
  await expect(page.getByText('Pozostały czas: 20 sekund', { exact: true })).toBeAttached()
  await page.getByRole('button', { name: 'Zakończ trening', exact: true }).click()
  await expect(dialog.getByRole('button')).toHaveText(['Wróć do treningu', 'Zakończ i zapisz', 'Porzuć bez zapisu…'])
})

test('uses the same exit confirmation and remaining round count in the quick timer', async ({ app, page }) => {
  await app.open('/quick-timer')
  await page.getByRole('button', { name: '3 × 2:00 przerwa 1:00', exact: true }).click()
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Rozpocznij trening', exact: true })).toBeVisible()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.fastForward(120_000)
  await page.getByRole('button', { name: 'Zakończ trening', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: exit, exact: true })
  await dialog.getByRole('button', { name: 'Porzuć bez zapisu…', exact: true }).click()
  await page.getByRole('dialog', { name: discard, exact: true }).getByRole('button', { name: 'Wróć', exact: true }).click()
  await dialog.getByRole('button', { name: 'Pomiń resztę ćwiczenia (2 rundy)', exact: true }).click()
  await app.expectWorkoutSaved()
  expect((await app.readSessions())[0]).toMatchObject({ source: 'quickTimer', status: 'partial', workSeconds: 120 })
})

async function useOfflineAudio(page: Page, seconds: number) {
  await page.addInitScript((seconds) => {
    // Render production Web Audio nodes offline, so peak checks do not depend on device volume.
    const contexts: OfflineAudioContext[] = []
    Reflect.set(window, '__previewContexts', contexts)
    class RenderedAudioContext {
      private audio = new OfflineAudioContext(1, seconds * 44100, 44100)
      private createdAt = Date.now()
      state = 'running'
      constructor() { contexts.push(this.audio) }
      get currentTime() { return (Date.now() - this.createdAt) / 1000 }
      get sampleRate() { return this.audio.sampleRate }
      get destination() { return this.audio.destination }
      resume() { return Promise.resolve() }
      close() { this.state = 'closed'; return Promise.resolve() }
      createBuffer(...args: Parameters<AudioContext['createBuffer']>) { return this.audio.createBuffer(...args) }
      createBufferSource() { return this.audio.createBufferSource() }
      createGain() { return this.audio.createGain() }
      createOscillator() { return this.audio.createOscillator() }
      createDynamicsCompressor() { return this.audio.createDynamicsCompressor() }
      createBiquadFilter() { return this.audio.createBiquadFilter() }
    }
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: RenderedAudioContext })
  }, seconds)
}

test('previews three loud unclipped knocks followed by the round end gong through real Web Audio nodes', async ({ app, page }) => {
  await useOfflineAudio(page, 4)
  await app.open('/profile')
  await app.freezeClock()
  await page.getByRole('button', { name: 'Odsłuchaj', exact: true }).click()
  await page.clock.runFor(1200)
  const peaks = await page.evaluate(async () => {
    const context = (Reflect.get(window, '__previewContexts') as OfflineAudioContext[])[0]
    const buffer = await context.startRendering()
    const samples = buffer.getChannelData(0)
    return [[0, 0.2], [0.32, 0.52], [0.64, 0.84], [1.2, 2.1], [0, 4]].map(([start, end]) => {
      let peak = 0
      for (let i = Math.floor(start * buffer.sampleRate); i < Math.floor(end * buffer.sampleRate); i += 1) {
        peak = Math.max(peak, Math.abs(samples[i]))
      }
      return peak
    })
  })
  for (const peak of peaks) {
    expect(peak, `Signal peaks: ${peaks.join(', ')}`).toBeGreaterThan(0.75)
    expect(peak, `Signal peaks: ${peaks.join(', ')}`).toBeLessThan(1)
  }
})


test('keeps every transition gong and round or rest warning loud and below full scale', async ({ app, page }) => {
  await useOfflineAudio(page, 110)
  await app.open('/workouts')
  const plan = workoutPlan([block('b', [roundsExercise('work', 2, 40, 20)])])
  await app.seedPlan(plan)
  await app.open(`/workouts/${plan.id}`)
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.runFor(100_000)
  const peaks = await page.evaluate(async () => {
    const context = (Reflect.get(window, '__previewContexts') as OfflineAudioContext[])[0]
    const buffer = await context.startRendering()
    const samples = buffer.getChannelData(0)
    return [0, 30, 40, 50, 60, 90, 100].map((start) => {
      let peak = 0
      for (let i = start * buffer.sampleRate; i < (start + 2) * buffer.sampleRate; i += 1) {
        peak = Math.max(peak, Math.abs(samples[i]))
      }
      return peak
    })
  })
  for (const peak of peaks) {
    expect(peak, `Signal peaks: ${peaks.join(', ')}`).toBeGreaterThan(0.75)
    expect(peak, `Signal peaks: ${peaks.join(', ')}`).toBeLessThan(1)
  }
})
