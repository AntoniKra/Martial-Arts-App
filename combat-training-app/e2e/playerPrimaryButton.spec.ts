import { mkdirSync } from 'node:fs'
import path from 'node:path'

import type { Page } from '@playwright/test'

import { block, continuousExercise, roundsExercise, workoutPlan } from '../src/test/workoutBuilders'
import { expect, test } from './fixtures'

const reviewDirectory = path.join('docs', 'reviews', 'issue-59')

async function checkGeometry(page: Page, label: string, bottomInset = 0) {
  const primary = page.getByRole('button', { name: label, exact: true })
  const viewport = page.viewportSize()!
  // Viewport units and emulated env() insets can update after the protocol call resolves.
  await expect(page.getByRole('main')).toHaveCSS('min-height', `${viewport.height}px`)
  await expect(primary.locator('..').locator('..').locator('..')).toHaveCSS('padding-bottom', `${16 + bottomInset}px`)
  const geometry = await primary.evaluate((element) => {
    const rect = (node: Element) => {
      const { x, y, width, height, bottom } = node.getBoundingClientRect()
      return { x, y, width, height, bottom }
    }
    const footer = element.parentElement!.parentElement!.parentElement!
    const box = rect(element)
    const hitsButton = (x: number, y: number) => element.contains(document.elementFromPoint(x, y))
    return {
      box,
      icon: rect(element.querySelector('svg')!),
      footer: rect(footer),
      footerPadding: getComputedStyle(footer).paddingBottom,
      cornerHits: hitsButton(box.x + 1, box.y + 1),
      topHits: hitsButton(box.x + box.width / 2, box.y + 1),
      ringHits: hitsButton(box.x + box.width / 2, box.y - 2),
    }
  })
  const boundary = viewport.height - bottomInset
  const visibleWidth = Math.min(viewport.width, geometry.box.x + geometry.box.width) - Math.max(0, geometry.box.x)
  const visibleHeight = Math.min(viewport.height, geometry.box.bottom) - Math.max(0, geometry.box.y)
  expect(geometry.box.width).toBe(128)
  expect(geometry.box.height).toBe(128)
  expect(visibleWidth).toBeGreaterThanOrEqual(120)
  expect(visibleHeight).toBeGreaterThanOrEqual(100)
  expect(geometry.footer.y - geometry.box.y).toBeCloseTo(15)
  expect(geometry.box.bottom - boundary).toBeCloseTo(16)
  expect(boundary - geometry.box.y).toBeGreaterThanOrEqual(128 * 0.75)
  expect(geometry.footerPadding).toBe(`${16 + bottomInset}px`)
  expect(geometry.icon.width).toBe(38)
  expect(geometry.icon.height).toBe(38)
  expect(geometry.icon.bottom).toBeLessThanOrEqual(boundary)
  expect(geometry).toMatchObject({ cornerHits: false, topHits: true, ringHits: false })

  for (const name of ['Poprzedni etap', 'Następny etap']) {
    const side = (await page.getByRole('button', { name, exact: true }).boundingBox())!
    expect([side.width, side.height]).toEqual([48, 48])
    expect(side.y + side.height / 2).toBe(geometry.box.y + geometry.box.height / 2)
  }
  const next = (await page.getByText('Następnie', { exact: true }).locator('..').locator('p').last().boundingBox())!
  // Leave at least 24 px even when including the 4 px ring around the circle.
  expect(geometry.box.y - 4 - next.y - next.height).toBeGreaterThanOrEqual(24)
  expect(await page.evaluate(() => ({
    x: scrollX,
    y: scrollY,
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    scrolled: [...document.querySelectorAll('main, main div')].some((element) => element.scrollTop !== 0 || element.scrollLeft !== 0),
    overflowing: [...document.querySelectorAll('main div')].some((element) => getComputedStyle(element).overflowY === 'auto' && element.scrollHeight > element.clientHeight + 1),
  }))).toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height, scrolled: false, overflowing: false })
  return { visibleWidth, visibleHeight, gap: geometry.box.y - 4 - next.y - next.height, aboveSafeArea: boundary - geometry.box.y }
}

for (const theme of ['dark', 'light'] as const) {
  test(`keeps the large primary control visible, separated and usable in ${theme} theme`, async ({ app, page, context }, testInfo) => {
    await app.open('/')
    await app.setTheme(theme)
    const exercise = { ...roundsExercise('exercise-1', 2, 60, 30), exerciseNameSnapshot: 'Praca na nogach' }
    const next = { ...continuousExercise('exercise-2', 60), exerciseNameSnapshot: 'Walka z cieniem' }
    const plan = { ...workoutPlan([block('block-1', [exercise, next])]), nameSnapshot: 'Technika bokserska' }
    await app.seedPlan(plan)
    await app.open(`/workouts/${plan.id}`)
    await app.openPlayer()
    await app.freezeClock()
    await page.evaluate(() => document.fonts.ready)
    await checkGeometry(page, 'Rozpocznij trening')
    await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click()
    await checkGeometry(page, 'Zacznij teraz')
    await page.getByRole('button', { name: 'Zacznij teraz', exact: true }).click()
    await expect(page.getByText('PRACA', { exact: true })).toBeVisible()

    const viewports = [page.viewportSize()!]
    if (testInfo.project.name === 'phone') viewports.push({ width: 390, height: 844 })
    const measurements = []
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      measurements.push({ viewport, theme, state: 'work', ...await checkGeometry(page, 'Pauza') })
      if (testInfo.project.name === 'phone') {
        mkdirSync(reviewDirectory, { recursive: true })
        await page.screenshot({ path: path.join(reviewDirectory, `work-${theme}-${viewport.width}x${viewport.height}.png`) })
      }
      const primary = page.getByRole('button', { name: 'Pauza', exact: true })
      const box = (await primary.boundingBox())!
      await page.mouse.click(box.x + 1, box.y + 1)
      await expect(primary).toBeVisible()
      await page.getByRole('button', { name: 'Poprzedni etap', exact: true }).focus()
      await page.keyboard.press('Tab')
      await expect(primary).toBeFocused()
      await checkGeometry(page, 'Pauza')
      await page.keyboard.press('Space')
      await expect(page.getByText('WSTRZYMANO', { exact: true })).toBeVisible()
      measurements.push({ viewport, theme, state: 'paused', ...await checkGeometry(page, 'Wznów') })
      if (testInfo.project.name === 'phone') {
        await page.screenshot({ path: path.join(reviewDirectory, `paused-${theme}-${viewport.width}x${viewport.height}.png`) })
      }
      // The bottom of the visible circle remains clickable despite viewport clipping.
      await page.mouse.click(box.x + box.width / 2, viewport.height - 4)
      await expect(page.getByRole('button', { name: 'Pauza', exact: true })).toBeVisible()
    }

    const session = await context.newCDPSession(page)
    await session.send('Emulation.setSafeAreaInsetsOverride', { insets: { bottom: 34 } })
    measurements.push({ viewport: page.viewportSize(), theme, state: 'safe-area-work', ...await checkGeometry(page, 'Pauza', 34) })
    await page.getByRole('button', { name: 'Pauza', exact: true }).click()
    measurements.push({ viewport: page.viewportSize(), theme, state: 'safe-area-paused', ...await checkGeometry(page, 'Wznów', 34) })
    await testInfo.attach('primary-control-measurements', { body: JSON.stringify(measurements, null, 2), contentType: 'application/json' })
  })
}
