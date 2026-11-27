import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page, TestInfo } from '@playwright/test'

import { block, roundsExercise, workoutBreak, workoutPlan } from '../src/test/workoutBuilders'
import { expect, test } from './fixtures'

const addBreakButton = (page: Page) => page.getByRole('button', { name: 'Dodaj przerwę do bloku 1 — Technika', exact: true })
const breakSheet = (page: Page, name: 'Przerwa' | 'Edycja przerwy' = 'Przerwa') => page.getByRole('dialog', { name, exact: true })
const durationValue = (dialog: Locator) => dialog.getByRole('button', { name: /^Przerwa: / })

async function accessible(page: Page, dialog: Locator) {
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((animation) => Number.isFinite(animation.effect?.getComputedTiming().endTime ?? Infinity))
    .map((animation) => animation.finished.catch(() => undefined))))
  expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) =>
    impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
}

async function addExerciseToBlock(page: Page, name: string) {
  await page.getByRole('button', { name: 'Dodaj ćwiczenie do bloku 1 — Technika', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Szukaj ćwiczenia', exact: true }).fill(name)
  await page.getByRole('button', { name, exact: true }).click()
  await page.getByRole('button', { name: 'Zatwierdź ćwiczenie', exact: true }).click()
}

test('adds breaks via preset tile, −/+ stepper and typed m:ss entry with validation and Esc handling', async ({ app, page }) => {
  await app.open('/workouts/new')
  await page.getByRole('radio', { name: 'Boks', exact: true }).check()
  await page.getByRole('button', { name: 'Dalej', exact: true }).click()
  await page.getByRole('group', { name: 'Pierwszy blok', exact: true }).getByRole('button', { name: 'Technika', exact: true }).click()
  await addExerciseToBlock(page, 'Lewy prosty → prawy prosty')

  // 1. Add break using a preset tile.
  await addBreakButton(page).click()
  const sheet = breakSheet(page, 'Przerwa')
  await expect(sheet).toBeVisible()
  await expect(sheet.getByRole('heading', { level: 2, name: 'Przerwa', exact: true })).toBeVisible()
  await expect(sheet.getByRole('button', { name: 'Zamknij', exact: true })).toBeFocused()
  await expect(sheet.getByRole('button', { name: 'Anuluj', exact: true })).toHaveCount(0)

  // All 4 presets sit in a single row and 1:00 is selected by default.
  const presets = sheet.getByRole('group', { name: 'Gotowe formaty', exact: true }).getByRole('button')
  await expect(presets).toHaveText(['0:30', '1:00', '2:00', '3:00'])
  await expect(presets.nth(1)).toHaveAttribute('aria-pressed', 'true')
  const presetTops = await presets.evaluateAll((buttons) => buttons.map((button) => Math.round(button.getBoundingClientRect().top)))
  expect(new Set(presetTops).size).toBe(1)

  // Styling checks: 2 px ember top border, chamfered submit button, M5 corners on step buttons.
  await expect(sheet).toHaveCSS('border-top-width', '2px')
  const submit = sheet.getByRole('button', { name: 'Dodaj przerwę', exact: true })
  await expect(submit).toHaveCSS('clip-path', /polygon/)
  const dec = sheet.getByRole('button', { name: 'Zmniejsz przerwę o 15 s', exact: true })
  const inc = sheet.getByRole('button', { name: 'Zwiększ przerwę o 15 s', exact: true })
  expect(await dec.evaluate((element) => getComputedStyle(element, '::before').content)).toBe('""')
  expect(await inc.evaluate((element) => getComputedStyle(element, '::before').content)).toBe('""')

  await presets.nth(2).click()
  await expect(presets.nth(2)).toHaveAttribute('aria-pressed', 'true')
  await expect(presets.nth(1)).toHaveAttribute('aria-pressed', 'false')
  await expect(durationValue(sheet)).toHaveText('2:00')
  await sheet.getByRole('textbox', { name: 'Instrukcja (opcjonalnie)', exact: true }).fill('Woda i rozluźnienie')
  await submit.click()

  await expect(sheet).toHaveCount(0)
  await expect(addBreakButton(page)).toBeFocused()
  await expect(page.getByRole('list', { name: 'Przerwy po bloku 1 — Technika', exact: true })).toContainText('2:00')

  // 2. Add break using −15 s / +15 s, including zero rejection and max limit check.
  await addExerciseToBlock(page, 'Lewy prosty → lewy prosty → prawy prosty')
  await addBreakButton(page).click()
  await expect(sheet).toBeVisible()
  for (let i = 0; i < 4; i += 1) await dec.click()
  await expect(durationValue(sheet)).toHaveText('0:00')
  await expect(dec).toHaveAttribute('aria-disabled', 'true')
  await submit.click()
  await expect(sheet).toBeVisible()
  await expect(sheet.getByRole('alert')).toHaveText('Łączny czas przerwy musi być większy od 0.')
  await expect(sheet.getByRole('textbox', { name: 'Przerwa', exact: true })).toHaveAttribute('aria-invalid', 'true')

  for (let i = 0; i < 3; i += 1) await inc.click()
  await expect(durationValue(sheet)).toHaveText('0:45')
  await expect(sheet.getByRole('alert')).toHaveCount(0)
  await submit.click()
  await expect(sheet).toHaveCount(0)
  await expect(page.getByRole('list', { name: 'Przerwy po bloku 1 — Technika', exact: true })).toContainText('0:45')

  // 3. Add break by typing m:ss / seconds, rejecting 1:75, and verifying Esc behavior.
  await addExerciseToBlock(page, 'Lewy prosty → prawy prosty → lewy sierp')
  await addBreakButton(page).click()
  await durationValue(sheet).click()
  const timeInput = sheet.getByRole('textbox', { name: 'Przerwa', exact: true })
  await expect(timeInput).toBeFocused()
  await timeInput.fill('90')
  await expect(sheet.getByRole('status')).toHaveText('1:30')

  await timeInput.fill('1:75')
  await timeInput.press('Enter')
  await expect(sheet.getByRole('alert')).toHaveText('Wpisz przerwę jako m:ss albo liczbę sekund, od 0:00 do 1440:00.')
  await expect(timeInput).toHaveAttribute('aria-invalid', 'true')

  // Escape inside the typed input cancels entry only and keeps the sheet open.
  await timeInput.press('Escape')
  await expect(sheet).toBeVisible()
  await expect(durationValue(sheet)).toHaveText('1:00')
  await expect(durationValue(sheet)).toBeFocused()

  // Escape outside the typed input closes the sheet and restores focus to the trigger.
  await page.keyboard.press('Escape')
  await expect(sheet).toHaveCount(0)
  await expect(addBreakButton(page)).toBeFocused()

  // Re-open and add a break via m:ss entry.
  await addBreakButton(page).click()
  await durationValue(sheet).click()
  await timeInput.fill('2:15')
  await expect(sheet.getByRole('status')).toHaveText('2:15')
  await submit.click()
  await expect(sheet).toHaveCount(0)

  await app.savePlan()
  await expect.poll(async () => {
    const plans = await app.readPlans()
    return plans[0]?.blocks[0]?.items.filter((item) => item.type === 'break').map((item) => ({
      durationSeconds: item.durationSeconds,
      instruction: item.instruction,
    }))
  }).toEqual([
    { durationSeconds: 120, instruction: 'Woda i rozluźnienie' },
    { durationSeconds: 45, instruction: null },
    { durationSeconds: 135, instruction: null },
  ])
})

test('edits an existing break from the row menu using the bottom sheet', async ({ app, page }) => {
  const plan = {
    ...workoutPlan([
      block('technique', [
        { ...roundsExercise('jab', 3, 180, 60), exerciseNameSnapshot: 'Lewy prosty → prawy prosty' },
        { ...workoutBreak('rest', 90), instruction: 'Woda i reset oddechu' },
      ]),
    ]),
    customName: 'Plan z przerwą',
    nameSnapshot: 'Plan z przerwą',
  }
  await app.open('/workouts')
  await app.seedPlan(plan)
  await app.open(`/workouts/${plan.id}/edit`)

  const actionsToggle = page.getByRole('button', { name: 'Akcje przerwy, element 2 w bloku 1 — Technika', exact: true })
  await actionsToggle.click()
  await page.getByRole('button', { name: 'Edytuj przerwę, element 2 w bloku 1 — Technika', exact: true }).click()

  const sheet = breakSheet(page, 'Edycja przerwy')
  await expect(sheet).toBeVisible()
  await expect(sheet.getByRole('heading', { level: 2, name: 'Edycja przerwy', exact: true })).toBeVisible()
  await expect(durationValue(sheet)).toHaveText('1:30')
  const instruction = sheet.getByRole('textbox', { name: 'Instrukcja (opcjonalnie)', exact: true })
  await expect(instruction).toHaveValue('Woda i reset oddechu')

  await sheet.getByRole('button', { name: '3:00', exact: true }).click()
  await instruction.fill('Zmiana rękawic')
  await sheet.getByRole('button', { name: 'Zapisz przerwę', exact: true }).click()

  await expect(sheet).toHaveCount(0)
  await expect(actionsToggle).toBeFocused()
  await expect(page.getByRole('list', { name: 'Przerwy po bloku 1 — Technika', exact: true })).toContainText('3:00')

  await page.getByRole('button', { name: 'Zapisz zmiany', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/workouts/${plan.id}$`))
  await expect.poll(async () => (await app.readPlans())[0]?.blocks[0]?.items[1]).toMatchObject({
    type: 'break',
    durationSeconds: 180,
    instruction: 'Zmiana rękawic',
  })
})

async function captureState(page: Page, testInfo: TestInfo, name: string) {
  if (process.env.CAPTURE_SCREENSHOTS !== '1' || testInfo.project.name !== 'phone') return
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`) })
}

for (const theme of ['dark', 'light'] as const) {
  for (const width of [360, 390] as const) {
    test(`matches layout and accessibility in ${theme} theme at ${width} px across add, max and invalid states`, async ({ app, page }, testInfo) => {
      await page.setViewportSize({ width, height: width === 360 ? 800 : 844 })
      const plan = {
        ...workoutPlan([
          block('technique', [
            { ...roundsExercise('jab', 3, 180, 60), exerciseNameSnapshot: 'Lewy prosty → prawy prosty' },
            { ...workoutBreak('rest', 90), instruction: 'Woda i reset oddechu' },
          ]),
        ]),
        customName: 'Plan kontrolny',
        nameSnapshot: 'Plan kontrolny',
      }
      await app.open('/workouts')
      await app.setTheme(theme)
      await app.seedPlan(plan)
      await app.open(`/workouts/${plan.id}/edit`)

      // Add state
      await addBreakButton(page).click()
      const addDialog = breakSheet(page, 'Przerwa')
      await expect(addDialog).toBeVisible()
      await accessible(page, addDialog)
      await captureState(page, testInfo, `break-add-${theme}-${width}`)

      // Max value state (1440:00)
      await durationValue(addDialog).click()
      const input = addDialog.getByRole('textbox', { name: 'Przerwa', exact: true })
      await input.fill('1440:00')
      await input.press('Enter')
      await expect(durationValue(addDialog)).toHaveText('1440:00')
      await expect(addDialog.getByRole('button', { name: 'Zwiększ przerwę o 15 s', exact: true })).toHaveAttribute('aria-disabled', 'true')
      await accessible(page, addDialog)
      await captureState(page, testInfo, `break-max-${theme}-${width}`)

      // Invalid "1:75" state
      await durationValue(addDialog).click()
      await input.fill('1:75')
      await input.press('Enter')
      await expect(addDialog.getByRole('alert')).toHaveText('Wpisz przerwę jako m:ss albo liczbę sekund, od 0:00 do 1440:00.')
      await accessible(page, addDialog)
      await captureState(page, testInfo, `break-error-${theme}-${width}`)

      await addDialog.getByRole('button', { name: 'Zamknij', exact: true }).click()
      await expect(addDialog).toHaveCount(0)

      // Edit state
      await page.getByRole('button', { name: 'Akcje przerwy, element 2 w bloku 1 — Technika', exact: true }).click()
      await page.getByRole('button', { name: 'Edytuj przerwę, element 2 w bloku 1 — Technika', exact: true }).click()
      const editDialog = breakSheet(page, 'Edycja przerwy')
      await expect(editDialog).toBeVisible()
      await accessible(page, editDialog)
      await captureState(page, testInfo, `break-edit-${theme}-${width}`)
    })
  }
}
