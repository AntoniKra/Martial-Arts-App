import type { Page } from '@playwright/test'

import { expect, setExerciseValue, test } from './fixtures'

test('saves a cooldown block and shows it as block 4 in the player', async ({ app, page }) => {
  await app.open('/workouts/new')
  await page.getByRole('radio', { name: 'Boks', exact: true }).check()
  await page.getByRole('textbox', { name: 'Nazwa planu' }).fill('Plan z rozluźnieniem')
  await page.getByRole('button', { name: 'Zamknij', exact: true }).click()

  await addTimedBlock(page, 1, 'Rozgrzewka', 'Skakanka')
  await addTimedBlock(page, 2, 'Technika', 'Jab')
  await addTimedBlock(page, 3, 'Worek', 'Worek')

  await page.getByRole('button', { name: 'Dodaj kolejny blok', exact: true }).click()
  await page.getByRole('group', { name: 'Wybierz rodzaj bloku', exact: true }).getByRole('button', { name: 'Rozluźnienie', exact: true }).click()
  await page.getByRole('button', { name: 'Dodaj ćwiczenie do bloku 4 — Rozluźnienie', exact: true }).click()
  await page.getByRole('button', { name: 'Rozciąganie bioder i nóg', exact: true }).click()
  await chooseOneRound(page)
  await page.getByRole('button', { name: 'Zatwierdź ćwiczenie', exact: true }).click()

  await app.savePlan()
  await expect(page.getByRole('heading', { name: 'Treningi', exact: true })).toBeVisible()
  await page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Plan z rozluźnieniem', exact: true }) })
    .getByRole('link', { name: 'Zobacz plan', exact: true }).click()
  await expect(page.getByText('Blok 4 · Rozluźnienie', { exact: true })).toBeVisible()

  await app.openPlayer()
  await app.startWorkout()
  const next = page.getByRole('button', { name: 'Następny etap', exact: true })
  for (let step = 0; step < 3; step += 1) await next.click()

  await expect(page.getByRole('main').locator('header')).toContainText('Etap 4 z 4')
  await expect(page.getByRole('heading', { name: 'Rozciąganie bioder i nóg', exact: true })).toBeVisible()
})

async function addTimedBlock(page: Page, blockNumber: number, blockLabel: string, exerciseName: string) {
  // The first block comes from the empty plan tiles, later ones from the block picker.
  if (blockNumber > 1) await page.getByRole('button', { name: 'Dodaj kolejny blok', exact: true }).click()
  await page.getByRole('group', { name: blockNumber === 1 ? 'Pierwszy blok' : 'Wybierz rodzaj bloku', exact: true })
    .getByRole('button', { name: blockLabel, exact: true }).click()
  await page.getByRole('button', { name: `Dodaj ćwiczenie do bloku ${blockNumber} — ${blockLabel}`, exact: true }).click()
  await page.getByRole('radio', { name: 'Własne ćwiczenie', exact: true }).click()
  await page.getByRole('textbox', { name: 'Nazwa ćwiczenia', exact: true }).fill(exerciseName)
  await page.getByRole('button', { name: 'Dalej', exact: true }).click()
  await chooseOneRound(page)
  await page.getByRole('button', { name: 'Zatwierdź ćwiczenie', exact: true }).click()
}

async function chooseOneRound(page: Page) {
  await setExerciseValue(page, 'Rundy', '1')
  await expect(page.getByRole('button', { name: /^Rundy: / })).toHaveText('1')
}
