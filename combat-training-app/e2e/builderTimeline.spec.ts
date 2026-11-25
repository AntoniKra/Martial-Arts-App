import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'

import { block, roundsExercise, workoutBreak, workoutPlan } from '../src/test/workoutBuilders'
import { expect, test } from './fixtures'

const planCard = (page: Page) => page.getByRole('button', { name: /^Dane planu: / })
const close = (page: Page) => page.getByRole('button', { name: 'Zamknij', exact: true })
const preview = (page: Page) => page.getByRole('button', { name: 'Podgląd', exact: true })
const blockTypes = ['Rozgrzewka', 'Technika', 'Tarcze', 'Worek', 'Sparing', 'Kondycja', 'Siła i motoryka', 'Rozluźnienie']

async function accessible(page: Page) {
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((animation) => Number.isFinite(animation.effect?.getComputedTiming().endTime ?? Infinity))
    .map((animation) => animation.finished.catch(() => undefined))))
  expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) =>
    impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}

for (const theme of ['dark', 'light'] as const) {
  test(`starts a new plan on its details and adds the first block from a tile in ${theme}`, async ({ app, page }) => {
    await app.open('/workouts/new')
    await app.setTheme(theme)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dane planu')
    await page.getByRole('radio', { name: 'Boks', exact: true }).check()
    await page.getByRole('textbox', { name: 'Główny cel' }).fill('Kontra po zejściu')
    await close(page).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nowy trening')
    await expect(planCard(page)).toBeFocused()
    await expect(planCard(page)).toContainText('Boks')
    await expect(planCard(page)).toContainText('Czas: 0:00')
    await expect(planCard(page)).toContainText('Cel: Kontra po zejściu')
    await expect(preview(page)).toBeDisabled()
    const tiles = page.getByRole('group', { name: 'Pierwszy blok', exact: true }).getByRole('button')
    await expect(tiles).toHaveText(blockTypes)
    // A 44 px touch box around the 36 px outlined frame.
    await expect(preview(page)).toHaveCSS('height', '44px')
    expect(await preview(page).evaluate((element) => getComputedStyle(element, '::before').top)).toBe('4px')
    await accessible(page)

    await tiles.filter({ hasText: 'Rozgrzewka' }).click()
    await expect(page.getByRole('heading', { name: 'Blok 1 · Rozgrzewka', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Dodaj ćwiczenie do bloku 1 — Rozgrzewka', exact: true })).toBeFocused()
    await expect(page.getByRole('group', { name: 'Pierwszy blok', exact: true })).toHaveCount(0)
    await expect(preview(page)).toBeEnabled()

    await page.getByRole('button', { name: 'Dodaj kolejny blok', exact: true }).click()
    const picker = page.getByRole('group', { name: 'Wybierz rodzaj bloku', exact: true }).getByRole('button')
    await expect(picker).toHaveText(blockTypes)
    await accessible(page)
    await picker.filter({ hasText: 'Rozluźnienie' }).click()
    await expect(page.getByRole('heading', { name: 'Blok 2 · Rozluźnienie', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Dodaj kolejny blok', exact: true })).toBeFocused()
  })
}

test('opens the plan details from the plan card and keeps the discipline locked', async ({ app, page }) => {
  const plan = {
    ...workoutPlan([
      block('technique', [{ ...roundsExercise('jab', 3, 180, 60), exerciseNameSnapshot: 'Jab' }, workoutBreak('rest', 120)]),
      block('pads', [{ ...roundsExercise('pads', 2, 120, 30), exerciseNameSnapshot: 'Tarcze 1-2' }], 'pads'),
    ]),
    customName: 'Plan z osią',
    mainGoal: 'Praca na nogach',
    nameSnapshot: 'Plan z osią',
  }
  await app.open('/workouts')
  await app.seedPlan(plan)
  await app.open(`/workouts/${plan.id}/edit`)

  await expect(planCard(page)).toContainText('Plan z osią')
  await expect(planCard(page)).toContainText('Czas: 17:30')
  await expect(page.getByRole('heading', { name: 'Blok 1 · Technika', exact: true })).toBeVisible()
  await expect(page.getByText('Praca: 9:00', { exact: true })).toBeVisible()
  await expect(page.getByText('Przerwy: 4:00', { exact: true })).toBeVisible()
  await expect(page.getByText('3 × 3:00 / 1:00', { exact: true })).toBeVisible()
  // The break that closes block 1 sits on the axis between the blocks.
  const breaks = page.getByRole('list', { name: 'Przerwy po bloku 1 — Technika', exact: true })
  await expect(breaks).toContainText('Przerwa')
  await expect(breaks).toContainText('2:00')

  await planCard(page).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dane planu')
  await expect(page.getByRole('radio', { name: 'Boks', exact: true })).toBeDisabled()
  await expect(page.getByText('Dyscyplina jest zablokowana po dodaniu pierwszego ćwiczenia.', { exact: true })).toBeVisible()
  await page.getByRole('textbox', { name: 'Główny cel' }).fill('Kontry')
  await close(page).click()
  await expect(planCard(page)).toContainText('Cel: Kontry')
  await expect(page.getByRole('button', { name: 'Zapisz zmiany', exact: true })).toBeEnabled()

  const actions = page.getByRole('button', { name: 'Akcje ćwiczenia Jab, element 1 w bloku 1 — Technika', exact: true })
  await expect(actions).toHaveAttribute('aria-expanded', 'false')
  await actions.click()
  await expect(actions).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('button', { name: 'Przenieś ćwiczenie Jab, element 1 w bloku 1 — Technika w górę', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Akcje przerwy, element 2 w bloku 1 — Technika', exact: true }).click()
  await expect(actions).toHaveAttribute('aria-expanded', 'false')
  await page.getByRole('button', { name: 'Przenieś przerwę, element 2 w bloku 1 — Technika w górę', exact: true }).click()
  // Moved inside the block, the break joins the block card list.
  await expect(page.getByRole('list', { name: 'Przerwy po bloku 1 — Technika', exact: true })).toHaveCount(0)
  await expect(page.getByRole('list', { name: 'Elementy bloku 1 — Technika', exact: true }).getByRole('listitem')).toHaveCount(2)
  await accessible(page)
})
