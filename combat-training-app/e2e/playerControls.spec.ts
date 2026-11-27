import AxeBuilder from '@axe-core/playwright'
import type { Locator } from '@playwright/test'
import type { FocusSkill } from '../src/domain/focus-skill/focusSkill.types'
import { block, roundsExercise, workoutPlan } from '../src/test/workoutBuilders'
import { expect, test } from './fixtures'

const instant = '2026-11-01T10:00:00.000Z'
const skill: FocusSkill = {
  id: 'guard',
  name: 'Powrót do gardy',
  criterion: 'Po każdym uderzeniu wracam do gardy i przygotowuję się do następnego ciosu bez odsłaniania brody.',
  openCorrection: null,
  archivedAt: null,
  createdAt: instant,
  updatedAt: instant,
}
const exercise = {
  ...roundsExercise('combinations', 2, 60, 30),
  exerciseNameSnapshot: 'Kombinacje bokserskie',
  instruction: 'Jab → prawy prosty → lewy hak na korpus',
  focusSkillId: skill.id,
}
const plan = workoutPlan([block('bag', [exercise])])

async function expectTarget(button: Locator, size: number) {
  await expect(button).toBeInViewport({ ratio: 1 })
  const box = (await button.boundingBox())!
  expect([box.width, box.height]).toEqual([size, size])
}

for (const theme of ['dark', 'light'] as const) {
  test(`player controls fit with a focus card and keep accessible names in ${theme} theme`, async ({ app, page }, info) => {
    test.skip(info.project.name !== 'phone', 'Checks the two specified phone viewports.')
    await page.setViewportSize({ width: 360, height: 640 })
    await app.open('/')
    await app.setTheme(theme)
    await app.seedFocusSkill(skill)
    await app.seedPlan(plan)
    await app.open(`/workouts/${plan.id}`)
    await app.openPlayer()
    await page.clock.setFixedTime(new Date(instant))
    await page.evaluate(() => document.fonts.ready)

    const main = page.getByRole('main')
    const previous = main.getByRole('button', { name: 'Poprzedni etap', exact: true })
    const next = main.getByRole('button', { name: 'Następny etap', exact: true })
    const startNow = main.getByRole('button', { name: 'Zacznij teraz', exact: true })
    const pause = main.getByRole('button', { name: 'Pauza', exact: true })
    const card = main.getByRole('note', { name: 'Element do poprawy', exact: true })

    async function checkLayout(primary: Locator) {
      for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }]) {
        await page.setViewportSize(viewport)
        await expect(card.getByText(skill.name, { exact: true })).toBeVisible()
        await expect(card).toBeInViewport({ ratio: 1 })
        await expectTarget(previous, 52)
        await expectTarget(next, 52)
        await expectTarget(primary, 96)
        const row = main.locator('.controls-row-3b')
        const footer = main.locator('.controls-bottom-bar')
        await expect(row).toHaveCSS('height', '96px')
        await expect(footer).toHaveCSS('padding-top', '8px')
        const cardBox = (await card.boundingBox())!
        const footerBox = (await footer.boundingBox())!
        expect(cardBox.y + cardBox.height).toBeLessThan(footerBox.y)
        await expect.poll(() => page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]))
          .toEqual([viewport.width, viewport.height])
        const { violations } = await new AxeBuilder({ page }).analyze()
        expect(violations).toEqual([])
      }
    }

    await main.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click()
    await expect(startNow).toHaveAttribute('aria-label', 'Zacznij teraz')
    await expect(main.getByText('Zacznij teraz', { exact: true })).toHaveCount(0)
    await expect(previous).toBeDisabled()
    await expect(previous).toHaveCSS('opacity', '0.4')
    await checkLayout(startNow)

    await startNow.click()
    await next.click()
    await expect(main.getByText('ODPOCZYNEK', { exact: true })).toBeVisible()
    await checkLayout(pause)
    for (const side of [previous, next]) {
      await expect(side).toHaveCSS('border-width', '0px')
      await expect(side.locator('svg')).toHaveCSS('width', '24px')
      await expect(side.locator('svg')).toHaveCSS('height', '24px')
      const shape = await side.evaluate((button) => {
        const decoration = getComputedStyle(button, '::before')
        return [decoration.inset, decoration.transform, decoration.getPropertyValue('--player-corner-length'), decoration.getPropertyValue('--player-corner-thickness')]
      })
      expect(shape).toEqual(['4px', 'none', '6px', '1.5px'])
    }
    const corners = await pause.locator('.diamond-shape-3b').evaluate((shape) => {
      const decoration = getComputedStyle(shape, '::before')
      return [decoration.inset, decoration.getPropertyValue('--player-corner-length'), decoration.getPropertyValue('--player-corner-thickness')]
    })
    expect(corners).toEqual(['0px', '16px', '2.5px'])
  })
}
