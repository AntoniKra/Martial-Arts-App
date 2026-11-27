import type { Page } from '@playwright/test'
import { block, continuousExercise, roundsExercise, workoutPlan } from '../src/test/workoutBuilders'
import { expect, test } from './fixtures'

async function checkGeometry(page: Page, label: string, bottomInset = 0) {
  const viewport = page.viewportSize()!
  const primary = page.getByRole('button', { name: label, exact: true })
  const footer = page.locator('.controls-bottom-bar')
  await expect(page.getByRole('main')).toHaveCSS('min-height', `${viewport.height}px`)
  await expect(footer).toHaveCSS('padding-top', '8px')
  await expect(footer).toHaveCSS('padding-bottom', `${12 + bottomInset}px`)
  const box = (await primary.boundingBox())!
  expect([box.width, box.height]).toEqual([96, 96])
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
  expect(box.y + box.height).toBeCloseTo(viewport.height - bottomInset - 12)
  const shape = primary.locator('.diamond-shape-3b')
  await expect(shape).toHaveCSS('width', '68px')
  await expect(shape).toHaveCSS('height', '68px')
  await expect(shape).toHaveCSS('border-radius', '0px')
  await expect(shape).toHaveCSS('border-width', '0px')
  await expect(shape).toHaveCSS('box-shadow', 'rgba(184, 16, 42, 0.45) 0px 4px 18px 0px')
  await expect(primary.locator('svg')).toHaveCSS('width', '31px')
  await expect(primary.locator('svg')).toHaveCSS('height', '31px')
  for (const name of ['Poprzedni etap', 'Następny etap']) {
    const side = (await page.getByRole('button', { name, exact: true }).boundingBox())!
    expect([side.width, side.height]).toEqual([52, 52])
    expect(side.y + side.height / 2).toBe(box.y + box.height / 2)
  }
  const next = (await page.getByText('Następnie:', { exact: false }).last().boundingBox())!
  expect(box.y - next.y - next.height).toBeGreaterThanOrEqual(24)
  expect(await page.evaluate(() => ({
    x: scrollX,
    y: scrollY,
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    scrolled: [...document.querySelectorAll('main, main div')].some((element) => element.scrollTop !== 0 || element.scrollLeft !== 0),
    overflowing: [...document.querySelectorAll('main div')].some((element) => getComputedStyle(element).overflowY === 'auto' && element.scrollHeight > element.clientHeight + 1),
  }))).toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height, scrolled: false, overflowing: false })
  return box
}

for (const theme of ['dark', 'light'] as const) {
  test(`keeps the diamond fully visible, separated and usable in ${theme} theme`, async ({ app, page, context }, testInfo) => {
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
    const initialViewport = page.viewportSize()!
    if (testInfo.project.name === 'phone') await page.setViewportSize({ width: 360, height: 640 })
    await checkGeometry(page, 'Rozpocznij trening')
    await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click()
    await checkGeometry(page, 'Zacznij teraz')
    await page.getByRole('button', { name: 'Zacznij teraz', exact: true }).click()
    await expect(page.getByText('PRACA', { exact: true })).toBeVisible()

    const viewports = [page.viewportSize()!]
    if (testInfo.project.name === 'phone') viewports.push(initialViewport, { width: 390, height: 844 })
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      const primary = page.getByRole('button', { name: 'Pauza', exact: true })
      const box = await checkGeometry(page, 'Pauza')
      await page.getByRole('button', { name: 'Poprzedni etap', exact: true }).focus()
      await page.keyboard.press('Tab')
      await expect(primary).toBeFocused()
      await page.keyboard.press('Space')
      await expect(page.getByText('WSTRZYMANO', { exact: true })).toBeVisible()
      await checkGeometry(page, 'Wznów')
      // The corner of the 96 px target and the bottom tip both belong to the button.
      await page.mouse.click(box.x + 1, box.y + 1)
      await expect(primary).toBeVisible()
      await page.mouse.click(box.x + box.width / 2, box.y + box.height - 1)
      await expect(page.getByRole('button', { name: 'Wznów', exact: true })).toBeVisible()
      await page.keyboard.press('Space')
      await expect(primary).toBeVisible()
    }

    const session = await context.newCDPSession(page)
    await session.send('Emulation.setSafeAreaInsetsOverride', { insets: { bottom: 34 } })
    await checkGeometry(page, 'Pauza', 34)
    await page.getByRole('button', { name: 'Pauza', exact: true }).click()
    await checkGeometry(page, 'Wznów', 34)
  })
}
