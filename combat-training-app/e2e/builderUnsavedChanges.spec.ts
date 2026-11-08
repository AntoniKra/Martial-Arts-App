import { mkdirSync } from 'node:fs'
import path from 'node:path'

import type { Dialog, Page, TestInfo } from '@playwright/test'

import { expect, test } from './fixtures'

const reviewDirectory = path.join('docs', 'reviews', 'issue-56')
const singleRoundRest =
  'Przy 1 rundzie nie ma przerwy między rundami. Przerwę po ćwiczeniu dodasz w bloku jako element „Przerwa”.'

const discardDialog = (page: Page) => page.getByRole('dialog', { name: 'Odrzucić zmiany?', exact: true })
const planName = (page: Page) => page.getByRole('textbox', { name: 'Nazwa planu' })
const saveChanges = (page: Page) => page.getByRole('button', { name: 'Zapisz zmiany', exact: true })
const startLink = (page: Page) =>
  page.getByRole('navigation', { name: 'Główna nawigacja' }).getByRole('link', { name: 'Start', exact: true })

async function openEdit(page: Page) {
  await page.getByRole('link', { name: 'Edytuj plan', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Edycja planu', exact: true })).toBeVisible()
}

async function captureReview(page: Page, testInfo: TestInfo, name: string) {
  if (testInfo.project.name !== 'phone') {
    return
  }

  mkdirSync(reviewDirectory, { recursive: true })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: path.join(reviewDirectory, `${name}-360x800.png`) })
}

async function chooseTile(page: Page, groupName: string, optionName: string) {
  const group = page.getByRole('group', { name: groupName, exact: true })
  await group.getByText(optionName, { exact: true }).click()
  await expect(group.getByRole('radio', { name: optionName, exact: true })).toBeChecked()
}

test('keeps a changed plan when the discard dialog is cancelled', async ({ app, page }, testInfo) => {
  await app.createPlan('Plan przed zmiana')
  await openEdit(page)
  await planName(page).fill('Plan zmieniony')
  await page.getByRole('link', { name: 'Anuluj', exact: true }).click()
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
  await expect(planName(page)).toHaveValue('Plan zmieniony')

  await page.getByRole('link', { name: 'Anuluj', exact: true }).click()
  await expect(stay).toBeFocused()
  await stay.click()
  await expect(dialog).toHaveCount(0)
  await expect(planName(page)).toHaveValue('Plan zmieniony')
  await expect(page).toHaveURL(/\/edit$/)

  await app.setTheme('light')
  await page.getByRole('link', { name: 'Anuluj', exact: true }).click()
  await expect(stay).toBeFocused()
  await captureReview(page, testInfo, 'discard-light')
  await discard.click()
  await expect(page.getByRole('heading', { name: 'Plan przed zmiana', exact: true })).toBeVisible()
  await expect(page).not.toHaveURL(/\/edit$/)
  await expect(dialog).toHaveCount(0)
})

test('leaves a clean builder and still warns the browser before unload', async ({ app, page }) => {
  await app.open('/workouts/new')
  await expect(saveChanges(page)).toHaveCount(0)
  await page.getByRole('link', { name: 'Wróć do treningów', exact: true }).click()
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
  await page.getByRole('link', { name: 'Anuluj', exact: true }).click()
  await expect(discardDialog(page)).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Plan bez zmian', exact: true })).toBeVisible()

  await openEdit(page)
  await planName(page).fill('Plan niezatwierdzony')
  const beforeUnload = new Promise<string>((resolve) => {
    page.once('dialog', (dialog) => {
      resolve(dialog.type())
      void dialog.accept()
    })
  })
  await page.reload()
  expect(await beforeUnload).toBe('beforeunload')
  await expect(planName(page)).toHaveValue('Plan bez zmian')
})

test('asks from the start tab, then saves an edit without the preview', async ({ app, page }) => {
  await app.createPlan('Plan do zapisu')
  await openEdit(page)
  await expect(saveChanges(page)).toBeDisabled()
  const editUrl = page.url()
  await planName(page).fill('Plan zapisany od razu')
  await expect(saveChanges(page)).toBeEnabled()
  await startLink(page).click()
  await expect(discardDialog(page)).toBeVisible()
  await expect(page).toHaveURL(editUrl)
  await discardDialog(page).getByRole('button', { name: 'Wróć do edycji', exact: true }).click()
  await expect(planName(page)).toHaveValue('Plan zapisany od razu')

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
    name: 'Usuń ćwiczenie Walka z cieniem, element 2 w bloku 1 — Technika',
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
  await page.getByRole('button', { name: 'Dodaj blok', exact: true }).click()
  await page.getByRole('button', { name: 'Technika', exact: true }).click()
  await page.getByRole('button', { name: 'Dodaj ćwiczenie do bloku 1 — Technika', exact: true }).click()
  await page.getByRole('button', { name: 'Wróć do osi treningu', exact: true }).click()
  await expect(discardDialog(page)).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Nowy trening', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Dodaj ćwiczenie do bloku 1 — Technika', exact: true }).click()
  await page.getByRole('button', { name: 'Jab → prawy prosty', exact: true }).click()
  await page.getByRole('button', { name: 'Wróć do biblioteki', exact: true }).click()
  await expect(discardDialog(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Jab → prawy prosty', exact: true }).click()

  const rest = () => page.getByRole('group', { name: 'Przerwa między rundami', exact: true })
  await expect(rest().getByRole('radio', { name: '1:00', exact: true })).toBeChecked()
  await chooseTile(page, 'Liczba rund', '1')
  await expect(rest()).toHaveCount(0)
  const note = page.getByText(singleRoundRest, { exact: true })
  await expect(note).toBeVisible()
  await note.evaluate((element) => element.scrollIntoView({ block: 'center' }))
  await captureReview(page, testInfo, 'one-round-dark')
  await app.setTheme('light')
  await note.evaluate((element) => element.scrollIntoView({ block: 'center' }))
  await captureReview(page, testInfo, 'one-round-light')
  await app.setTheme('dark')

  await chooseTile(page, 'Liczba rund', '3')
  await expect(rest().getByRole('radio', { name: '1:00', exact: true })).toBeChecked()
  await chooseTile(page, 'Przerwa między rundami', '0:30')
  await chooseTile(page, 'Liczba rund', '1')
  await expect(rest()).toHaveCount(0)
  await page.getByRole('button', { name: 'Dodaj ćwiczenie', exact: true }).click()
  await expect(page.getByText('1 runda × 3:00 · przerwa 0:30', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: /Edytuj ćwiczenie Jab → prawy prosty/ }).click()
  await expect(rest()).toHaveCount(0)
  await chooseTile(page, 'Liczba rund', '3')
  await expect(rest().getByRole('radio', { name: '0:30', exact: true })).toBeChecked()
})
