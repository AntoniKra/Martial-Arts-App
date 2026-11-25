import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'

import { expect, test } from './fixtures'

async function audit(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  expect(violations).toEqual([])
}

async function expectSelectedRadio(radio: Locator, text: string) {
  await expect(radio).toHaveAttribute('aria-checked', 'true')
  const face = radio.locator('..').locator('.choice-face')
  await expect(face).toHaveCSS('border-top-width', '2px')
  await expect(face).toHaveText(text)
}

async function openExerciseConfiguration(page: Page) {
  await page.getByRole('radio', { name: 'Boks', exact: true }).check()
  await page.getByRole('button', { name: 'Zamknij', exact: true }).click()
  await page.getByRole('group', { name: 'Pierwszy blok', exact: true }).getByRole('button', { name: 'Technika', exact: true }).click()
  await page.getByRole('button', { name: 'Dodaj ćwiczenie do bloku 1 — Technika', exact: true }).click()
  await page.getByRole('button', { name: 'Lewy prosty → prawy prosty', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Konfiguracja ćwiczenia', exact: true })).toBeVisible()
}

test('paints the active mobile workout diamond above the exercise configuration and aligns the preview action', async ({ app, page }, info) => {
  test.skip(info.project.name !== 'phone', 'The diamond is part of the mobile navigation.')
  await page.setViewportSize({ width: 390, height: 800 })
  await app.open('/workouts/new')
  await openExerciseConfiguration(page)

  const trigger = page.getByRole('navigation', { name: 'Główna nawigacja', exact: true }).getByRole('button', { name: 'Trening', exact: true })
  const diamond = trigger.locator('.new-workout-diamond')
  await expect(trigger).toHaveAttribute('aria-current', 'page')
  await expect(trigger.locator('.accent-fill')).toHaveCount(0)
  await expect(diamond).toBeInViewport({ ratio: 0.999 })
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    await expect(diamond).toHaveCSS('background-image', /^linear-gradient\(150deg, rgb\(/)
    await expect(diamond).toHaveCSS('opacity', '1')
    expect(await diamond.evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      const x = bounds.x + bounds.width / 2
      const trigger = element.closest('button')
      const stackIsOpaque = [element, ...Array.from(document.elementsFromPoint(x, bounds.y + bounds.height / 4)).filter((layer) => layer.contains(element))]
        .every((layer) => getComputedStyle(layer).opacity === '1')
      return stackIsOpaque && [0.15, 0.5, 0.85].every((part) => {
        const topLayer = document.elementFromPoint(x, bounds.y + bounds.height * part)
        return topLayer !== null && trigger?.contains(topLayer)
      })
    })).toBe(true)
    await audit(page)
  }

  const rounds = page.getByRole('group', { name: 'Liczba rund', exact: true })
  const two = rounds.getByRole('radio', { name: '2', exact: true })
  await expect(two.locator('..').locator('.choice-face')).toHaveCSS('border-top-width', '1px')
  await two.check()
  await expectSelectedRadio(two, '2')
  await page.getByRole('button', { name: 'Dodaj ćwiczenie', exact: true }).click()
  await page.getByRole('button', { name: 'Podgląd', exact: true }).click()
  const back = page.getByRole('button', { name: 'Wróć do edycji', exact: true })
  await expect(back).toBeVisible()
  expect(await back.locator('svg').evaluate((icon) => {
    const label = icon.nextSibling
    if (!(label instanceof Text)) return false
    const range = document.createRange()
    range.selectNodeContents(label)
    const iconBounds = icon.getBoundingClientRect()
    const labelBounds = range.getBoundingClientRect()
    return iconBounds.right < labelBounds.left && iconBounds.top < labelBounds.bottom && labelBounds.top < iconBounds.bottom
  })).toBe(true)
  await back.click()
  await expect(page.getByRole('button', { name: 'Podgląd', exact: true })).toBeFocused()
})

test('collapses the focus skill picker and restores keyboard focus to the selected radio when reopened', async ({ app, page }) => {
  const skills = [
    { id: 'first', name: 'Praca nóg', criterion: 'Krok bez krzyżowania nóg.' },
    { id: 'second', name: 'Powrót do gardy', criterion: 'Ręka wraca do brody.' },
  ]
  const instant = '2026-11-23T10:00:00.000Z'
  await app.open('/workouts/new')
  for (const skill of skills) {
    await app.seedFocusSkill({ ...skill, archivedAt: null, openCorrection: null, createdAt: instant, updatedAt: instant })
  }
  await openExerciseConfiguration(page)
  await page.getByRole('button', { name: 'Dodaj ćwiczenie', exact: true }).click()
  await page.getByRole('button', { name: /^Akcje ćwiczenia Lewy prosty → prawy prosty/ }).click()
  const picker = page.getByRole('group', { name: 'Element do poprawy', exact: true })
  await picker.getByRole('switch').click()
  const list = picker.getByRole('group', { name: 'Nad czym pracujesz w tym ćwiczeniu?', exact: true })
  const first = list.getByRole('radio', { name: /^Praca nóg/ })
  await expect(first).toHaveAttribute('aria-checked', 'false')
  await first.check()
  const change = picker.getByRole('button', { name: 'Zmień', exact: true })
  await expect(list).toBeHidden()
  await expect(picker.getByText(skills[0].name, { exact: true }).filter({ visible: true })).toBeVisible()
  await expect(change).toBeFocused()
  await change.press('Enter')
  await expect(list).toBeVisible()
  await expect(first).toBeFocused()
  await expect(first).toHaveAttribute('aria-checked', 'true')
  await expect(first.locator('..').locator('.choice-face')).toHaveCSS('border-top-width', '2px')
  await expect(first.locator('..')).not.toContainText('✓')
  await list.getByRole('radio', { name: /^Powrót do gardy/ }).check()
  await expect(list).toBeHidden()
  await expect(picker.getByText(skills[1].name, { exact: true }).filter({ visible: true })).toBeVisible()
  await expect(change).toBeFocused()
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    await audit(page)
  }
})

test('uses pressed state and different border widths for quick timer selections in both themes', async ({ app, page }) => {
  await app.open('/quick-timer')
  const bag = page.getByRole('button', { name: 'Worek', exact: true })
  await bag.click()
  const preset = page.getByRole('button', { name: '3 × 2:00 · przerwa 1:00', exact: true })
  await preset.click()
  const otherPreset = page.getByRole('button', { name: '3 × 3:00 · przerwa 1:00', exact: true })
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    for (const button of [bag, preset]) {
      await expect(button).toHaveAttribute('aria-pressed', 'true')
      await expect(button).toHaveCSS('border-top-width', '2px')
      await expect(button).not.toContainText('✓')
    }
    await expect(otherPreset).toHaveAttribute('aria-pressed', 'false')
    await expect(otherPreset).toHaveCSS('border-top-width', '1px')
    await audit(page)
  }
})

test('uses checked state and different border widths for manual workout choices in both themes', async ({ app, page }) => {
  await app.open('/workout-sessions/new')
  const boxing = page.getByRole('radio', { name: 'Boks', exact: true })
  const kickboxing = page.getByRole('radio', { name: 'Kickboxing', exact: true })
  const bag = page.getByRole('checkbox', { name: /^Worek/ })
  await boxing.check()
  await bag.check()
  const chip = bag.locator('..').locator('.multi-chip-face')
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    await expectSelectedRadio(boxing, 'Boks')
    await expect(kickboxing).toHaveAttribute('aria-checked', 'false')
    await expect(kickboxing.locator('..').locator('.choice-face')).toHaveCSS('border-top-width', '1px')
    await expect(bag).toHaveAttribute('aria-checked', 'true')
    await expect(chip).toHaveCSS('border-top-width', '2px')
    await expect(chip.getByText('Worek', { exact: true })).toBeVisible()
    await expect(chip.locator('.multi-chip-mark')).toBeHidden()
    await audit(page)
  }
})
