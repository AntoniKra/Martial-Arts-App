import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'
import type { FocusSkill } from '../src/domain/focus-skill/focusSkill.types'
import { block, roundsExercise, workoutBreak, workoutPlan } from '../src/test/workoutBuilders'
import { expect, test } from './fixtures'

const instant = '2026-11-01T10:00:00.000Z'
const skill: FocusSkill = {
  id: 'counter', name: 'Kontra po zejściu',
  criterion: 'Kończę zejście w pozycji, z której mogę od razu skontrować. Po zejściu wracam do gardy i powtarzam ruch w stałym rytmie.',
  openCorrection: null, archivedAt: null, createdAt: instant, updatedAt: instant,
}
const exercise = {
  ...roundsExercise('combinations', 2, 60, 30),
  exerciseNameSnapshot: 'Kombinacje bokserskie',
  instruction: 'Jab → prawy prosty → lewy hak na korpus',
  focusSkillId: skill.id,
}
const plan = workoutPlan([block('bag', [exercise, workoutBreak('break', 30), roundsExercise('plain', 1, 60, 0)])])

async function expectInViewport(page: Page, locator: Locator) {
  await expect(locator).toBeVisible()
  const box = (await locator.boundingBox())!
  const viewport = page.viewportSize()!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
}

for (const theme of ['dark', 'light'] as const) {
  test(`shows the round focus cue at the right time and fits both phones in ${theme} theme`, async ({ app, page }, info) => {
    await app.open('/')
    await app.setTheme(theme)
    await app.seedFocusSkill(skill)
    await app.seedPlan(plan)
    await app.open(`/workouts/${plan.id}`)
    await app.openPlayer()
    await page.clock.setFixedTime(new Date(instant))
    await page.evaluate(() => document.fonts.ready)

    const main = page.getByRole('main')
    const card = main.getByRole('note', { name: 'Element do poprawy', exact: true })
    const badge = main.getByText(`★ ${skill.name}`, { exact: true })
    const arc = main.locator('.timer-svg-2b')
    const next = main.getByText(/^Następnie:/)
    const nextButton = main.getByRole('button', { name: 'Następny etap' })
    const viewports = info.project.name === 'phone'
      ? [{ width: 360, height: 640 }, { width: 390, height: 844 }]
      : [page.viewportSize()!]

    async function checkLayout(cue: Locator) {
      for (const size of viewports) {
        await page.setViewportSize(size)
        for (const locator of [cue, arc, next, ...await main.getByRole('button').all()]) {
          await expectInViewport(page, locator)
        }
        await expect.poll(() => page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]))
          .toEqual([size.width, size.height])
      }
      const { violations } = await new AxeBuilder({ page }).analyze()
      expect(violations.filter(({ id, impact }) => id === 'color-contrast' || (impact && ['moderate', 'serious', 'critical'].includes(impact)))).toEqual([])
    }

    await expect(card).toHaveCount(0)
    await expect(badge).toHaveCount(0)
    await main.getByRole('button', { name: 'Rozpocznij trening' }).click()
    await expect(main).toHaveAttribute('data-phase', 'preparing')
    await expect(card.getByText(skill.name, { exact: true })).toBeVisible()
    const criterion = card.getByText(skill.criterion, { exact: true })
    await expect(criterion).toHaveCSS('-webkit-line-clamp', 'none')
    await expect(badge).toHaveCount(0)
    await checkLayout(card)

    await main.getByRole('button', { name: 'Zacznij teraz' }).click()
    await expect(main).toHaveAttribute('data-phase', 'work')
    await expect(card).toHaveCount(0)
    await expect(main.getByText(skill.criterion, { exact: true })).toHaveCount(0)
    await expect(badge).toHaveCSS('font-size', '13px')
    await expect(badge).toHaveCSS('font-weight', '600')
    await checkLayout(badge)
    const description = await main.getByText(exercise.instruction, { exact: true }).boundingBox()
    expect((await badge.boundingBox())!.y).toBeGreaterThanOrEqual(description!.y + description!.height)

    await nextButton.click()
    await expect(main).toHaveAttribute('data-phase', 'rest')
    await expect(card.getByText(skill.name, { exact: true })).toBeVisible()
    await expect(criterion).toBeVisible()
    await expect(badge).toHaveCount(0)
    await checkLayout(card)
    const cardBox = (await card.boundingBox())!
    expect((await next.boundingBox())!.y).toBeGreaterThanOrEqual(cardBox.y + cardBox.height)

    await nextButton.click()
    await expect(badge).toBeVisible()
    await nextButton.click()
    await expect(main).toHaveAttribute('data-phase', 'rest')
    await expect(next).toContainText('Exercise plain')
    await expect(card).toHaveCount(0)
    await expect(badge).toHaveCount(0)
  })
}
