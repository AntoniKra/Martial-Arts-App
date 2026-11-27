import type { Locator, Page } from '@playwright/test'

import { block, roundsExercise, workoutPlan } from '../src/test/workoutBuilders'
import { expect, test } from './fixtures'

const picker = (page: Page) => page.getByRole('radiogroup', { name: 'Dyscyplina', exact: true })
const boxing = (page: Page) => picker(page).getByRole('radio', { name: 'Boks', exact: true })
const kickboxing = (page: Page) => picker(page).getByRole('radio', { name: 'Kickboxing', exact: true })
const face = (radio: Locator) => radio.locator('..').locator('.choice-face')

async function expectPickerLayout(page: Page, setTheme: (theme: 'dark' | 'light') => Promise<void>) {
  const group = picker(page)
  const boxingFace = face(boxing(page))
  await page.mouse.move(0, 0)
  await expect(group.getByRole('radio')).toHaveCount(5)
  await expect(group).toHaveCSS('gap', '8px')
  await expect(boxingFace).toHaveCSS('height', '52px')
  await expect(boxingFace.locator('span')).toHaveCSS('font-family', /Archivo/)
  await expect(boxingFace.locator('span')).toHaveCSS('font-size', '11px')
  await expect(boxingFace.locator('span')).toHaveCSS('font-weight', '600')
  await expect(boxingFace.locator('span')).toHaveCSS('letter-spacing', '1.32px')
  await expect(boxingFace.locator('span')).toHaveCSS('text-transform', 'uppercase')

  for (const theme of ['dark', 'light'] as const) {
    await setTheme(theme)
    for (const width of [360, 390, 639, 640]) {
      await page.setViewportSize({ width, height: 800 })
      await expect(group).toHaveCSS('grid-template-columns', width < 640 ? /^[\d.]+px$/ : /^[\d.]+px [\d.]+px$/)
    }
    await expect(boxingFace).toHaveCSS('border-top-width', '2px')
    await expect(boxingFace).toHaveCSS('border-top-color', theme === 'dark' ? 'rgb(239, 93, 110)' : 'rgb(160, 16, 39)')
    await expect(boxingFace).toHaveCSS('box-shadow', 'none')
    await expect(boxingFace).toHaveText('Boks')
    await expect(boxingFace.locator('span')).toHaveCSS('color', theme === 'dark' ? 'rgb(232, 160, 48)' : 'rgb(135, 82, 12)')
    await expect(face(kickboxing(page))).toHaveCSS('border-top-width', '1px')
    await expect(face(kickboxing(page))).toHaveCSS('background-color', theme === 'dark' ? 'rgb(22, 22, 24)' : 'rgb(255, 255, 255)')
  }
}

test('shows the mockup tiles and keeps the new plan hint', async ({ app, page }) => {
  await app.open('/workouts/new')
  await expect(picker(page).getByRole('radio', { checked: true })).toHaveCount(0)
  const next = page.getByRole('button', { name: 'Dalej', exact: true })
  await expect(next).toBeDisabled()
  await expect(next).toHaveAccessibleDescription('Wybierz dyscyplinę, aby przejść dalej.')
  await boxing(page).check()
  await expectPickerLayout(page, (theme) => app.setTheme(theme))
})

test('dims only the unchecked disciplines in a locked plan', async ({ app, page }) => {
  const plan = workoutPlan([block('technique', [roundsExercise('jab', 3, 180, 60)])])
  await app.open('/workouts')
  await app.seedPlan(plan)
  await app.open(`/workouts/${plan.id}/edit`)
  await page.getByRole('button', { name: /^Dane planu: / }).click()
  await expect(boxing(page)).toBeChecked()
  await expect(boxing(page)).toBeDisabled()
  await expect(kickboxing(page)).toBeDisabled()
  await expect(face(boxing(page))).toHaveCSS('opacity', '1')
  await expect(face(kickboxing(page))).toHaveCSS('opacity', '0.5')
  await expect(page.getByText('Dyscyplina jest zablokowana po dodaniu pierwszego ćwiczenia.', { exact: true })).toBeVisible()
})

test('focuses the first discipline on manual entry validation and preserves native keyboard selection', async ({ app, page }) => {
  await app.open('/workout-sessions/new')
  await page.getByRole('button', { name: 'Zapisz', exact: true }).click()
  const error = page.getByRole('alert').filter({ hasText: 'Wybierz dyscyplinę.' })
  await expect(error).toBeVisible()
  await expect(boxing(page)).toBeFocused()
  await boxing(page).press('Space')
  await expect(error).toBeHidden()
  await expectPickerLayout(page, (theme) => app.setTheme(theme))
  await boxing(page).press('ArrowRight')
  await expect(kickboxing(page)).toBeChecked()
  await expect(face(kickboxing(page))).toHaveCSS('outline-width', '2px')
})

test('uses the same tiles with boxing preselected in the weekly activity form', async ({ app, page }) => {
  await app.open('/progress/week/2026-11-09')
  await page.getByRole('button', { name: /^Stały tydzień/ }).click()
  await page.getByRole('button', { name: 'Dodaj trening: wtorek', exact: true }).click()
  await expect(boxing(page)).toBeChecked()
  await expectPickerLayout(page, (theme) => app.setTheme(theme))
  await kickboxing(page).check()
  await expect(kickboxing(page)).toBeChecked()
})
