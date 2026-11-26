import type { Page, TestInfo } from '@playwright/test'

import { expect, test } from './fixtures'

async function addTechniqueBlock(page: Page) {
  await expect(page.getByRole('heading', { name: 'Dane planu', exact: true })).toBeVisible()
  await page.getByRole('radio', { name: 'Boks', exact: true }).check()
  await page.getByRole('button', { name: 'Zamknij', exact: true }).click()
  await page.getByRole('group', { name: 'Pierwszy blok', exact: true }).getByRole('button', { name: 'Technika', exact: true }).click()
}

async function chooseLibraryExercise(page: Page, name: string) {
  await page.getByRole('button', { name: 'Dodaj ćwiczenie do bloku 1 — Technika', exact: true }).click()
  // Only the first library category starts expanded; a search expands every category with a match.
  await page.getByRole('searchbox', { name: 'Szukaj ćwiczenia', exact: true }).fill(name)
  await page.getByRole('button', { name, exact: true }).click()
}

async function press(page: Page, name: string, times: number) {
  for (let index = 0; index < times; index += 1) await page.getByRole('button', { name, exact: true }).click()
}

const stepperValue = (page: Page, label: string) => page.getByRole('button', { name: new RegExp(`^${label}: `) })
const format = (page: Page, name: string) =>
  page.getByRole('group', { name: 'Gotowe formaty', exact: true }).getByRole('radio', { name, exact: true })

async function captureConfiguration(page: Page, testInfo: TestInfo, theme: 'dark' | 'light') {
  if (process.env.CAPTURE_SCREENSHOTS !== '1' || testInfo.project.name !== 'phone') {
    return
  }

  await page.screenshot({ path: testInfo.outputPath(`config-${theme}-top.png`) })
  await page.getByRole('button', { name: 'Zatwierdź ćwiczenie', exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: testInfo.outputPath(`config-${theme}-submit.png`) })
}

test('builds a boxing plan of 2 × 1:00 with 0:30 rest without typing the round settings', async ({ app, page }, testInfo) => {
  await app.open('/workouts/new')
  await addTechniqueBlock(page)

  await chooseLibraryExercise(page, 'Lewy prosty → prawy prosty')
  await expect(page.getByRole('heading', { name: 'Ćwiczenie', exact: true })).toBeVisible()
  await expect(format(page, '3 × 3:00 · przerwa 1:00')).toBeChecked()
  await press(page, 'Zmniejsz liczbę rund o 1', 1)
  await press(page, 'Zmniejsz czas rundy o 15 s', 8)
  await press(page, 'Zmniejsz przerwę o 15 s', 2)
  await expect(stepperValue(page, 'Rundy')).toHaveText('2')
  await expect(stepperValue(page, 'Czas rundy')).toHaveText('1:00')
  await expect(stepperValue(page, 'Przerwa')).toHaveText('0:30')
  await expect(format(page, '3 × 3:00 · przerwa 1:00')).not.toBeChecked()
  await page.getByRole('button', { name: 'Zatwierdź ćwiczenie', exact: true }).click()

  await chooseLibraryExercise(page, 'Lewy prosty → lewy prosty → prawy prosty')
  await expect(stepperValue(page, 'Rundy')).toHaveText('2')
  await expect(stepperValue(page, 'Czas rundy')).toHaveText('1:00')
  await expect(stepperValue(page, 'Przerwa')).toHaveText('0:30')
  await expect(page.getByRole('group', { name: 'Gotowe formaty', exact: true }).getByRole('radio')).toHaveCount(3)
  for (const name of ['3 × 3:00 · przerwa 1:00', '3 × 3:00 · przerwa 0:30', '5 × 3:00 · przerwa 1:00']) {
    await expect(format(page, name)).not.toBeChecked()
  }

  const targets = [
    page.getByRole('group', { name: 'Gotowe formaty', exact: true }).locator('label'),
    page.getByRole('button', { name: /^(Zmniejsz|Zwiększ) / }),
  ]
  const sizes: number[] = []
  for (const group of targets) {
    const count = await group.count()
    expect(count).toBeGreaterThan(0)
    for (let index = 0; index < count; index += 1) {
      const box = await group.nth(index).boundingBox()
      expect(box).not.toBeNull()
      sizes.push(Math.min(box?.height ?? 0, box?.width ?? 0))
    }
  }
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(44)

  await captureConfiguration(page, testInfo, 'dark')
  const restSegment = page.locator('.exercise-config-structure-rest').first()
  await expect(restSegment).toHaveCSS('background-image', /^repeating-linear-gradient/)
  const darkPattern = await restSegment.evaluate((element) => getComputedStyle(element).backgroundImage)
  await app.setTheme('light')
  await expect(restSegment).toHaveCSS('background-image', /^repeating-linear-gradient/)
  await expect(restSegment).not.toHaveCSS('background-image', darkPattern)
  await captureConfiguration(page, testInfo, 'light')
  await app.setTheme('dark')

  await page.getByRole('button', { name: 'Zatwierdź ćwiczenie', exact: true }).click()
  await expect(page.getByText('2 × 1:00 / 0:30', { exact: true })).toHaveCount(2)

  await app.savePlan()
  await page.getByRole('link', { name: 'Zobacz plan', exact: true }).click()
  await expect(page.getByText('2 × 1:00 / 0:30', { exact: true })).toHaveCount(2)
  // Plan details reuse the builder timeline read-only: the work / rest bar, but no row menus or add buttons.
  await expect(page.getByRole('img', { name: 'Praca 4:00, przerwy 1:00', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Akcje / })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Dodaj / })).toHaveCount(0)
})

test('steps the round time by 15 s, updates the total live and accepts a typed value', async ({ app, page }) => {
  await app.open('/workouts/new')
  await addTechniqueBlock(page)
  await chooseLibraryExercise(page, 'Lewy prosty → prawy prosty')

  const structure = page.getByRole('region', { name: 'Struktura ćwiczenia', exact: true })
  await expect(structure).toContainText('Łącznie: 11:00')
  await page.getByRole('button', { name: 'Zwiększ czas rundy o 15 s', exact: true }).click()
  await expect(stepperValue(page, 'Czas rundy')).toHaveText('3:15')
  await expect(structure).toContainText('Łącznie: 11:45')
  await expect(structure).toContainText('Rundy (3:15)')

  await stepperValue(page, 'Rundy').click()
  const rounds = page.getByRole('textbox', { name: 'Rundy', exact: true })
  await expect(rounds).toBeFocused()
  await rounds.fill('100')
  await rounds.press('Enter')
  await expect(page.getByRole('alert')).toHaveText('Liczba rund musi być liczbą całkowitą od 1 do 99.')
  await expect(rounds).toHaveAttribute('aria-invalid', 'true')
  await rounds.fill('5')
  await rounds.press('Enter')
  await expect(stepperValue(page, 'Rundy')).toHaveText('5')
  await expect(stepperValue(page, 'Rundy')).toBeFocused()
  await expect(structure).toContainText('Łącznie: 20:15')

  await stepperValue(page, 'Czas rundy').click()
  const roundTime = page.getByRole('textbox', { name: 'Czas rundy', exact: true })
  await roundTime.fill('180')
  await expect(roundTime).toHaveAccessibleDescription('3:00')
  await roundTime.press('Enter')
  await expect(format(page, '5 × 3:00 · przerwa 1:00')).toBeChecked()

  await stepperValue(page, 'Przerwa').click()
  const restTime = page.getByRole('textbox', { name: 'Przerwa', exact: true })
  await restTime.fill('0:45')
  await expect(restTime).toHaveAccessibleDescription('0:45')
  await restTime.press('Enter')
  await page.getByRole('button', { name: 'Zatwierdź ćwiczenie', exact: true }).click()
  await expect(page.getByText('5 × 3:00 / 0:45', { exact: true })).toBeVisible()
})

test('previews continuous time and rejects invalid time on submit', async ({ app, page }) => {
  await app.open('/workouts/new')
  await addTechniqueBlock(page)
  await chooseLibraryExercise(page, 'Lewy prosty → prawy prosty')
  await page.getByRole('radio', { name: 'Ciągłe', exact: true }).check()
  await stepperValue(page, 'Czas').click()

  const time = page.getByRole('textbox', { name: 'Czas', exact: true })
  const preview = page.getByRole('group', { name: 'Czas', exact: true }).getByRole('status')
  const submit = page.getByRole('button', { name: 'Zatwierdź ćwiczenie', exact: true })
  await time.fill('90')
  await expect(preview).toBeVisible()
  await expect(preview).toHaveText('1:30')
  await expect(time).toHaveAccessibleDescription('1:30')
  await time.fill('1:60')
  await expect(preview).toBeEmpty()
  await submit.click()
  await expect(page.getByRole('alert')).toHaveText('Wpisz czas jako m:ss albo liczbę sekund, od 0:01 do 1440:00.')
  await expect(time).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByRole('heading', { name: 'Ćwiczenie', exact: true })).toBeVisible()

  await time.fill('1:30')
  await expect(time).toHaveAccessibleDescription('1:30')
  await submit.click()
  await expect(page.getByText('Ciągłe · 1:30', { exact: true })).toBeVisible()
})

test('shares the focus skill between the exercise screen and the timeline', async ({ app, page }) => {
  const instant = '2026-11-25T10:00:00.000Z'
  await app.open('/workouts/new')
  await app.seedFocusSkill({ id: 'guard', name: 'Powrót do gardy', criterion: 'Ręka wraca do brody.', openCorrection: null, archivedAt: null, createdAt: instant, updatedAt: instant })
  await addTechniqueBlock(page)
  await chooseLibraryExercise(page, 'Lewy prosty → prawy prosty')

  const picker = page.getByRole('group', { name: 'Element do poprawy', exact: true })
  await picker.getByRole('switch').click()
  await picker.getByRole('radio', { name: /^Powrót do gardy/ }).check()
  await expect(picker.getByRole('button', { name: 'Zmień', exact: true })).toBeFocused()
  await expect(picker).toContainText('Ręka wraca do brody.')
  await page.getByRole('button', { name: 'Gotowe', exact: true }).click()

  await expect(page.getByText(/★ Powrót do gardy/)).toBeVisible()
  const actions = page.getByRole('button', { name: /^Akcje ćwiczenia Lewy prosty → prawy prosty/ })
  await actions.click()
  await expect(picker).toContainText('Powrót do gardy')
  await picker.getByRole('switch').click()
  await expect(page.getByText(/★ Powrót do gardy/)).toHaveCount(0)

  await page.getByRole('button', { name: /^Edytuj ćwiczenie Lewy prosty → prawy prosty/ }).click()
  await expect(picker.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  await picker.getByRole('switch').click()
  await picker.getByRole('radio', { name: /^Powrót do gardy/ }).check()
  await page.getByRole('button', { name: 'Zapisz zmiany', exact: true }).click()

  await app.savePlan()
  await expect.poll(async () => (await app.readPlans())[0]?.blocks[0]?.items[0]).toMatchObject({ focusSkillId: 'guard' })
})
