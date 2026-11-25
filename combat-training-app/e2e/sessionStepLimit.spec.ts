import type { Page } from '@playwright/test'

import { block, roundsExercise, workoutPlan } from '../src/test/workoutBuilders'
import { expect, setExerciseValue, test } from './fixtures'

const builderMessage = 'Plan ma za dużo etapów (591). Maksimum to 500 – zmniejsz liczbę rund lub ćwiczeń.'

async function setCustomRoundCount(page: Page, count: number) {
  await setExerciseValue(page, 'Rundy', String(count))
}

test('shows the step limit and prevents saving a new oversized plan', async ({ app, page }) => {
  await app.open('/workouts/new')
  await page.getByRole('radio', { name: 'Boks', exact: true }).check()
  await page.getByRole('button', { name: 'Dodaj blok', exact: true }).click()
  await page.getByRole('button', { name: 'Technika', exact: true }).click()

  for (let exercise = 0; exercise < 3; exercise += 1) {
    await page.getByRole('button', { name: 'Dodaj ćwiczenie do bloku 1 — Technika', exact: true }).click()
    await page.getByRole('button', { name: 'Lewy prosty → prawy prosty', exact: true }).click()
    await setCustomRoundCount(page, 99)
    await page.getByRole('button', { name: 'Zatwierdź ćwiczenie', exact: true }).click()
  }

  await page.getByRole('button', { name: 'Podgląd planu', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Plan wymaga uzupełnienia' })).toContainText(builderMessage)
  await expect(page.getByRole('button', { name: 'Zapisz plan', exact: true })).toHaveCount(0)
  await expect.poll(() => app.readPlans()).toEqual([])
})

test('blocks playback and saving changes to a legacy plan until the plan fits', async ({ app, page }) => {
  const plan = {
    ...workoutPlan([block('technique', [
      roundsExercise('first', 99, 60, 30),
      roundsExercise('second', 99, 60, 30),
      roundsExercise('third', 99, 60, 30),
    ])]),
    customName: 'Limit sesji',
    nameSnapshot: 'Limit sesji',
  }
  await app.open('/workouts')
  await app.seedPlan(plan)
  await page.getByRole('link', { name: 'Zobacz plan', exact: true }).click()
  await page.getByRole('link', { name: 'Rozpocznij trening', exact: true }).click()

  await expect(page.getByRole('alert')).toContainText('Ten trening ma 591 etapów. Maksimum to 500.')
  await expect(page.getByRole('button', { name: 'Rozpocznij trening', exact: true })).toHaveCount(0)
  await page.getByRole('link', { name: 'Edytuj plan', exact: true }).click()
  await page.getByRole('textbox', { name: 'Nazwa planu' }).fill('Limit sesji po edycji')
  await page.getByRole('button', { name: 'Zapisz zmiany', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Plan wymaga uzupełnienia' })).toContainText(builderMessage)
  await expect.poll(() => app.readPlans()).toMatchObject([plan])

  await page.getByRole('button', { name: 'Edytuj ćwiczenie Exercise first, element 1 w bloku 1 — Technika', exact: true }).click()
  await setCustomRoundCount(page, 53)
  await page.getByRole('button', { name: 'Zapisz zmiany', exact: true }).click()
  await page.getByRole('button', { name: 'Zapisz zmiany', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Limit sesji po edycji', exact: true })).toBeVisible()
  await expect.poll(async () => (await app.readPlans())[0]?.nameSnapshot).toBe('Limit sesji po edycji')
  await app.openPlayer()
})
