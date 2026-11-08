import type { Locator } from '@playwright/test'

import { block, continuousExercise, roundsExercise, workoutBreak, workoutPlan } from '../src/test/workoutBuilders'
import { test, expect } from './fixtures'

async function measure(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element)
    const { x, y, width, height } = element.getBoundingClientRect()
    return { size: style.fontSize, family: style.fontFamily, weight: style.fontWeight, color: style.color, x, y, width, height }
  })
}

for (const theme of ['dark', 'light'] as const) {
  test(`keeps player text, timer and controls readable without scrolling in ${theme} theme`, async ({ app, page }, testInfo) => {
    await app.open('/')
    await app.setTheme(theme)
    const exercise = { ...roundsExercise('exercise-1', 2, 60, 30), exerciseNameSnapshot: 'Praca na nogach' }
    const nextExercise = { ...continuousExercise('exercise-2', 60), exerciseNameSnapshot: 'Walka z cieniem' }
    const plan = { ...workoutPlan([block('block-1', [exercise, workoutBreak('break-1', 30), nextExercise])]), nameSnapshot: 'Technika bokserska' }
    await page.evaluate((plan) => localStorage.setItem('combat-training.workout-plans', JSON.stringify({ schemaVersion: 1, plans: [plan] })), plan)
    await app.open(`/workouts/${plan.id}`)
    await app.openPlayer()
    await app.freezeClock()
    await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click()
    await page.evaluate(() => document.fonts.ready)

    const measurements: Record<string, unknown> = {}
    const heading = page.getByRole('heading', { level: 1 })
    const nextLabel = page.getByText('Następnie', { exact: true })
    const nextName = nextLabel.locator('..').locator('p').nth(1)
    const timer = page.locator('span[aria-hidden="true"]').filter({ hasText: /^\d+:\d{2}$/ })
    const capture = async (state: string, stateLabel: string) => {
      await expect(page.getByText(stateLabel, { exact: true })).toBeVisible()
      const samples = {
        heading: await measure(heading),
        state: await measure(page.getByText(stateLabel, { exact: true })),
        timer: await measure(timer),
        nextLabel: await measure(nextLabel),
        nextName: await measure(nextName),
        controls: await Promise.all(['Poprzedni etap', state === 'paused' ? 'Wznów' : 'Pauza', 'Następny etap']
          .map((name) => measure(page.getByRole('button', { name, exact: true })))),
      }
      measurements[state] = samples
      const viewport = page.viewportSize()!
      const geometry = await page.evaluate(() => ({
        scrollY,
        scrollX,
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        overflowing: [...document.querySelectorAll('main div')].some((element) => element.scrollHeight > element.clientHeight + 1 && getComputedStyle(element).overflowY === 'auto'),
      }))
      expect(geometry).toEqual({ scrollY: 0, scrollX: 0, width: viewport.width, height: viewport.height, overflowing: false })
      for (const sample of [samples.timer, ...samples.controls]) {
        expect(sample.y).toBeGreaterThanOrEqual(0)
        expect(sample.y + sample.height).toBeLessThanOrEqual(viewport.height)
        expect(sample.x).toBeGreaterThanOrEqual(0)
        expect(sample.x + sample.width).toBeLessThanOrEqual(viewport.width)
      }
      expect(samples.timer.size).toBe(viewport.width >= 640 ? '64px' : '56px')
      expect(samples.timer.width).toBeGreaterThan(0)
      expect(samples.heading.size).toBe('24px')
      expect(samples.state.size).toBe('16px')
      expect(samples.nextLabel.size).toBe('12px')
      expect(samples.nextName.size).toBe('14px')
      expect(samples.controls.map(({ width, height }) => [width, height])).toEqual([[48, 48], [64, 64], [48, 48]])
      if (testInfo.project.name === 'phone' && (state !== 'break' || theme === 'dark')) {
        const name = state === 'break' ? 'smallest-break-dark' : `${state}-${theme}`
        const path = testInfo.outputPath(`${name}.png`)
        await page.screenshot({ path })
        await testInfo.attach(name, { path, contentType: 'image/png' })
      }
    }

    const round = await measure(page.getByText('Runda 1 z 2', { exact: true }))
    expect(round.size).toBe('16px')
    const headingBox = (await heading.boundingBox())!
    expect(round.y - headingBox.y - headingBox.height).toBe(8)
    measurements.round = round
    await capture('work', 'PRACA')
    await page.getByRole('button', { name: 'Pauza', exact: true }).click()
    const paused = await measure(page.getByText('WSTRZYMANO', { exact: true }))
    expect(paused.size).toBe('16px')
    measurements.pausedLabel = paused
    await capture('paused', 'PRACA')
    await page.getByRole('button', { name: 'Wznów', exact: true }).click()
    await page.getByRole('button', { name: 'Następny etap', exact: true }).click()
    await capture('rest', 'ODPOCZYNEK')
    await page.getByRole('button', { name: 'Następny etap', exact: true }).click()
    await page.getByRole('button', { name: 'Następny etap', exact: true }).click()
    await capture('break', 'PRZERWA')
    await testInfo.attach(`player-text-sizes-${theme}`, {
      body: JSON.stringify({ viewport: page.viewportSize(), theme, measurements }, null, 2),
      contentType: 'application/json',
    })
  })
}
