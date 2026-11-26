import { mkdirSync } from 'node:fs'
import path from 'node:path'

import type { Dialog, Page, TestInfo } from '@playwright/test'

import { expect, setExerciseValue, test } from './fixtures'

const reviewDirectory = path.join('docs', 'reviews', 'issue-56')
const singleRoundRest =
  'Przy 1 rundzie nie ma przerwy między rundami. Przerwę po ćwiczeniu dodasz w bloku jako element „Przerwa”.'

const discardDialog = (page: Page) => page.getByRole('dialog', { name: 'Odrzucić zmiany?', exact: true })
const planName = (page: Page) => page.getByRole('textbox', { name: 'Nazwa planu' })
const planCard = (page: Page) => page.getByRole('button', { name: /^Dane planu: / })
const closeButton = (page: Page) => page.getByRole('button', { name: 'Zamknij', exact: true })
const saveChanges = (page: Page) => page.getByRole('button', { name: 'Zapisz zmiany', exact: true })
const startLink = (page: Page) =>
  page.getByRole('navigation', { name: 'Główna nawigacja' }).getByRole('link', { name: 'Start', exact: true })

async function openEdit(page: Page) {
  await page.getByRole('link', { name: 'Edytuj plan', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Edycja planu', exact: true })).toBeVisible()
}

/** The name lives on the "Dane planu" subscreen; its close button returns to the timeline. */
async function renamePlan(page: Page, name: string) {
  await planCard(page).click()
  await planName(page).fill(name)
  await closeButton(page).click()
  await expect(planCard(page)).toContainText(name)
}

async function captureReview(page: Page, testInfo: TestInfo, name: string) {
  if (process.env.CAPTURE_SCREENSHOTS !== '1' || testInfo.project.name !== 'phone') {
    return
  }

  mkdirSync(reviewDirectory, { recursive: true })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: path.join(reviewDirectory, `${name}-360x800.png`) })
}

const restValue = (page: Page) => page.getByRole('button', { name: /^Przerwa: / })

test('keeps a changed plan when the discard dialog is cancelled', async ({ app, page }, testInfo) => {
  await app.createPlan('Plan przed zmiana')
  await openEdit(page)
  await renamePlan(page, 'Plan zmieniony')
  await closeButton(page).click()
  const dialog = discardDialog(page)
  const stay = dialog.getByRole('button', { name: 'Wróć do edycji', exact: true })
  const discard = dialog.getByRole('button', { name: 'Odrzuć zmiany', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAccessibleDescription('Zmiany w planie nie zostaną zapisane.')
  await expect(stay).toBeFocused()
  await expect(page).toHaveURL(/\/edit$/)
  await page.keyboard.press('Shift+Tab')
  await expect(discard).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(stay).toBeFocused()
  await captureReview(page, testInfo, 'discard-dark')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(planCard(page)).toContainText('Plan zmieniony')

  await page.getByRole('button', { name: 'Zamknij', exact: true }).click()
  await expect(stay).toBeFocused()
  await stay.click()
  await expect(dialog).toHaveCount(0)
  await expect(planCard(page)).toContainText('Plan zmieniony')
  await expect(page).toHaveURL(/\/edit$/)

  await app.setTheme('light')
  await page.getByRole('button', { name: 'Zamknij', exact: true }).click()
  await expect(stay).toBeFocused()
  await captureReview(page, testInfo, 'discard-light')
  await discard.click()
  await expect(page.getByRole('heading', { name: 'Plan przed zmiana', exact: true })).toBeVisible()
  await expect(page).not.toHaveURL(/\/edit$/)
  await expect(dialog).toHaveCount(0)
})

test('leaves a clean builder and still warns the browser before unload', async ({ app, page }) => {
  await app.open('/workouts/new')
  await expect(page.getByRole('heading', { name: 'Dane planu', exact: true })).toBeVisible()
  await closeButton(page).click()
  await expect(page.getByRole('heading', { name: 'Nowy trening', exact: true })).toBeVisible()
  await expect(saveChanges(page)).toHaveCount(0)
  await closeButton(page).click()
  await expect(discardDialog(page)).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Treningi', exact: true })).toBeVisible()

  await app.createPlan('Plan bez zmian')
  await openEdit(page)
  let reloadInterrupted = false
  const onCleanReloadDialog = async (dialog: Dialog) => {
    reloadInterrupted = true
    await dialog.accept()
  }
  page.once('dialog', onCleanReloadDialog)
  await page.reload()
  page.off('dialog', onCleanReloadDialog)
  expect(reloadInterrupted).toBe(false)
  await expect(page.getByRole('heading', { name: 'Edycja planu', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Zamknij', exact: true }).click()
  await expect(discardDialog(page)).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Plan bez zmian', exact: true })).toBeVisible()

  await openEdit(page)
  await renamePlan(page, 'Plan niezatwierdzony')
  const beforeUnload = new Promise<string>((resolve) => {
    page.once('dialog', (dialog) => {
      resolve(dialog.type())
      void dialog.accept()
    })
  })
  await page.reload()
  expect(await beforeUnload).toBe('beforeunload')
  await expect(planCard(page)).toContainText('Plan bez zmian')
})

test('asks from the start tab, then saves an edit without the preview', async ({ app, page }) => {
  await app.createPlan('Plan do zapisu')
  await openEdit(page)
  await expect(saveChanges(page)).toBeDisabled()
  const editUrl = page.url()
  await renamePlan(page, 'Plan zapisany od razu')
  await expect(saveChanges(page)).toBeEnabled()
  await startLink(page).click()
  await expect(discardDialog(page)).toBeVisible()
  await expect(page).toHaveURL(editUrl)
  await discardDialog(page).getByRole('button', { name: 'Wróć do edycji', exact: true }).click()
  await expect(planCard(page)).toContainText('Plan zapisany od razu')

  await page.goBack()
  await expect(discardDialog(page)).toBeVisible()
  await expect(page).toHaveURL(editUrl)
  await page.keyboard.press('Escape')
  await expect(discardDialog(page)).toHaveCount(0)
  await expect(page).toHaveURL(editUrl)

  await saveChanges(page).click()
  await expect(page.getByRole('button', { name: 'Zapisz plan', exact: true })).toHaveCount(0)
  await expect(discardDialog(page)).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Plan zapisany od razu', exact: true })).toBeVisible()
  await expect(page).not.toHaveURL(/\/edit$/)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Plan zapisany od razu', exact: true })).toBeVisible()
})

test('focuses the validation summary when saving an incomplete edit', async ({ app, page }) => {
  await app.createPlan('Plan niepelny')
  await openEdit(page)
  await page.getByRole('button', {
    name: 'Akcje ćwiczenia Walka z cieniem, element 2 w bloku 1 — Technika',
    exact: true,
  }).click()
  await page.getByRole('button', {
    name: 'Usuń ćwiczenie Walka z cieniem, element 2 w bloku 1 — Technika',
    exact: true,
  }).click()
  await page.getByRole('button', {
    name: 'Akcje ćwiczenia Praca na nogach, element 1 w bloku 1 — Technika',
    exact: true,
  }).click()
  await page.getByRole('button', {
    name: 'Usuń ćwiczenie Praca na nogach, element 1 w bloku 1 — Technika',
    exact: true,
  }).click()
  await saveChanges(page).click()
  const summary = page.getByRole('region', { name: 'Plan wymaga uzupełnienia', exact: true })
  await expect(summary).toBeVisible()
  await expect(summary).toBeFocused()
  await expect(page).toHaveURL(/\/edit$/)
  await expect(page.getByRole('button', { name: 'Zapisz plan', exact: true })).toHaveCount(0)
  await expect(discardDialog(page)).toHaveCount(0)
})

test('hides rest for one round and restores the previous value at three rounds', async ({ app, page }, testInfo) => {
  await app.open('/workouts/new')
  await page.getByRole('radio', { name: 'Boks', exact: true }).check()
  await closeButton(page).click()
  await page.getByRole('group', { name: 'Pierwszy blok', exact: true }).getByRole('button', { name: 'Technika', exact: true }).click()
  await page.getByRole('button', { name: 'Dodaj ćwiczenie do bloku 1 — Technika', exact: true }).click()
  await page.getByRole('button', { name: 'Wstecz', exact: true }).click()
  await expect(discardDialog(page)).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Nowy trening', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Dodaj ćwiczenie do bloku 1 — Technika', exact: true }).click()
  await page.getByRole('button', { name: 'Lewy prosty → prawy prosty', exact: true }).click()
  await page.getByRole('button', { name: 'Zamknij', exact: true }).click()
  await expect(discardDialog(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Lewy prosty → prawy prosty', exact: true }).click()

  await expect(restValue(page)).toHaveText('1:00')
  await setExerciseValue(page, 'Rundy', '1')
  await expect(restValue(page)).toHaveCount(0)
  const note = page.getByText(singleRoundRest, { exact: true })
  await expect(note).toBeVisible()
  await note.evaluate((element) => element.scrollIntoView({ block: 'center' }))
  await captureReview(page, testInfo, 'one-round-dark')
  await app.setTheme('light')
  await note.evaluate((element) => element.scrollIntoView({ block: 'center' }))
  await captureReview(page, testInfo, 'one-round-light')
  await app.setTheme('dark')

  await setExerciseValue(page, 'Rundy', '3')
  await expect(restValue(page)).toHaveText('1:00')
  await setExerciseValue(page, 'Przerwa', '0:30')
  await page.getByRole('button', { name: 'Zmniejsz liczbę rund o 1', exact: true }).click()
  await page.getByRole('button', { name: 'Zmniejsz liczbę rund o 1', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Zmniejsz liczbę rund o 1', exact: true })).toBeDisabled()
  await expect(restValue(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Zatwierdź ćwiczenie', exact: true }).click()
  await expect(page.getByText('1 × 3:00', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: /^Akcje ćwiczenia Lewy prosty → prawy prosty/ }).click()
  await page.getByRole('button', { name: /Edytuj ćwiczenie Lewy prosty → prawy prosty/ }).click()
  await expect(page.getByRole('heading', { name: 'Ćwiczenie', exact: true })).toBeVisible()
  await expect(restValue(page)).toHaveCount(0)
  await setExerciseValue(page, 'Rundy', '3')
  await expect(restValue(page)).toHaveText('0:30')
  await saveChanges(page).click()
  await expect(page.getByText('3 × 3:00 / 0:30', { exact: true })).toBeVisible()
})
