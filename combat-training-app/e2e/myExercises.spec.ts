import AxeBuilder from '@axe-core/playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { Page, TestInfo } from '@playwright/test'
import { test, expect } from './fixtures'

const exerciseName = 'Żółw → lewy sierp'
const skillName = 'Powrót do gardy Żółwia'
async function beginPlan(page: Page, name: string) {
  await page.getByRole('radio', { name: 'Boks', exact: true }).check()
  await page.getByRole('textbox', { name: 'Nazwa planu' }).fill(name)
  await page.getByRole('button', { name: 'Dodaj blok', exact: true }).click()
  await page.getByRole('button', { name: 'Technika', exact: true }).click()
  await page.getByRole('button', { name: 'Dodaj ćwiczenie do bloku 1 — Technika', exact: true }).click()
}
async function accessible(page: Page) {
  expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}
async function capture(page: Page, info: TestInfo, name: string) {
  const folder = process.env.MY_EXERCISES_SCREENSHOTS
  if (!folder || info.project.name !== 'phone') return
  await mkdir(folder, { recursive: true })
  await page.evaluate(() => document.fonts.ready)
  const file = path.join(folder, `${name}-360x800.png`)
  await page.screenshot({ path: file, fullPage: true })
  await info.attach(name, { path: file, contentType: 'image/png' })
}

test('reuses a personal exercise across two rated plans, keeps one focus trend and preserves history after editing and archiving', async ({ app, page }, info) => {
  test.setTimeout(90_000)
  await app.open('/workouts/new')
  await beginPlan(page, 'Plan A')
  await page.getByRole('radio', { name: 'Własne ćwiczenie', exact: true }).click()
  await page.getByRole('textbox', { name: 'Nazwa ćwiczenia', exact: true }).fill(exerciseName)
  await expect(page.getByRole('radio', { name: 'Zapisz w Moich ćwiczeniach', exact: true })).toBeChecked()
  await page.getByRole('button', { name: 'Konfiguruj ćwiczenie', exact: true }).click()
  await page.getByRole('radio', { name: 'Ciągłe', exact: true }).check()
  await page.getByRole('textbox', { name: 'Minuty', exact: true }).fill('0')
  await page.getByRole('textbox', { name: 'Sekundy', exact: true }).fill('5')
  await page.getByRole('button', { name: 'Dodaj ćwiczenie', exact: true }).click()
  await page.getByRole('switch', { name: 'Element do poprawy · Oceniaj po treningu', exact: true }).click()
  await page.getByRole('radio', { name: /^Nowy element do poprawy/ }).check()
  await page.getByRole('textbox', { name: 'Nazwa', exact: true }).fill(skillName)
  await page.getByRole('textbox', { name: 'Cel', exact: true }).fill('Ręka wraca do brody.')
  await page.getByRole('button', { name: 'Zapisz ćwiczenie', exact: true }).click()
  await app.savePlan()
  // Wait for the emulator to receive the plan, exercise and focus skill instead of reading right after the click.
  await expect.poll(async () => [(await app.readPlans()).length, (await app.readExercises()).length, (await app.readFocusSkills()).length]).toEqual([1, 1, 1])
  const firstPlan = (await app.readPlans())[0]
  const [personal] = await app.readExercises()
  const [skill] = await app.readFocusSkills()
  expect(skill.exerciseId).toBe(personal.id)
  expect(firstPlan.blocks[0].items[0]).toMatchObject({ combinationId: personal.id, exerciseNameSnapshot: exerciseName })
  await app.open(`/workouts/${firstPlan.id}`)
  await app.openPlayer(); await app.freezeClock(); await app.startWorkout()
  await page.clock.fastForward(5_000); await app.expectWorkoutSaved()
  await page.getByRole('article', { name: skillName, exact: true }).getByRole('radio', { name: /^3 / }).check()
  await page.getByRole('button', { name: 'Zapisz oceny', exact: true }).click()
  await expect(page).toHaveURL(/\/workouts\?tab=history$/)

  await app.open('/workouts/new'); await beginPlan(page, 'Plan B')
  await expect(page.getByRole('region', { name: 'Ostatnio używane', exact: true })).toContainText(exerciseName)
  await page.getByRole('searchbox', { name: 'Szukaj ćwiczenia', exact: true }).fill('ZOLW lewy SIERP')
  await page.getByRole('button', { name: exerciseName, exact: true }).click()
  await expect(page.getByRole('radio', { name: 'Ciągłe', exact: true })).toBeChecked()
  await expect(page.getByRole('textbox', { name: 'Sekundy', exact: true })).toHaveValue('5')
  await page.getByRole('button', { name: 'Dodaj ćwiczenie', exact: true }).click()
  await page.getByRole('switch', { name: 'Element do poprawy · Oceniaj po treningu', exact: true }).click()
  await page.getByRole('radio', { name: new RegExp(`^${skillName}`) }).check()
  await app.savePlan()
  await expect.poll(async () => (await app.readPlans()).some((plan) => plan.customName === 'Plan B'), { timeout: 10_000 }).toBe(true)
  const secondPlan = (await app.readPlans()).find((plan) => plan.customName === 'Plan B')!
  expect(secondPlan.blocks[0].items[0]).toMatchObject({ combinationId: personal.id, focusSkillId: skill.id })
  await app.open(`/workouts/${secondPlan.id}`)
  await app.openPlayer(); await app.startWorkout()
  await page.clock.fastForward(5_000); await app.expectWorkoutSaved()
  await expect(page.getByText(/Ostatnio 3\/5 · 3.11/)).toBeVisible()
  await page.getByRole('article', { name: skillName, exact: true }).getByRole('radio', { name: /^4 / }).check()
  await capture(page, info, 'previous-assessment')
  await page.getByRole('button', { name: 'Zapisz oceny', exact: true }).click()
  await expect(page).toHaveURL(/\/workouts\?tab=history$/)
  await expect.poll(async () => (await app.readSessions()).filter((session) => session.source === 'plan')
    .flatMap((session) => session.focusRatings).filter((rating) => rating.assessment !== null).length).toBe(2)
  await app.open('/progress')
  await page.getByRole('link', { name: new RegExp(skillName) }).click()
  await expect(page.getByText('Oceny: 3, 4', { exact: true })).toBeVisible()
  await expect(page.getByText(`Powiązane ćwiczenie: ${exerciseName}`, { exact: true })).toBeVisible()
  await capture(page, info, 'one-focus-trend')

  await app.open('/exercises')
  const row = page.getByRole('list', { name: 'Moje ćwiczenia', exact: true }).getByRole('listitem')
  await row.getByRole('button', { name: 'Edytuj', exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'Typ ćwiczenia', exact: true })).toBeDisabled()
  await page.getByRole('textbox', { name: 'Nazwa ćwiczenia', exact: true }).fill('Nowa nazwa Żółwia')
  await page.getByRole('button', { name: 'Zapisz ćwiczenie', exact: true }).click()
  expect((await app.readSessions()).filter((session) => session.source === 'plan').map((session) => session.stepResults[0].nameSnapshot)).toEqual([exerciseName, exerciseName])
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme); await accessible(page); await capture(page, info, `my-exercises-${theme}`)
  }
  await row.getByRole('button', { name: 'Archiwizuj', exact: true }).click()
  await expect(row).toHaveCount(0)
  await page.getByText('Zarchiwizowane', { exact: true }).click()
  await expect(page.getByRole('button', { name: 'Usuń trwale', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Przywróć', exact: true }).click()
  await expect(row.getByRole('heading', { name: 'Nowa nazwa Żółwia', exact: true })).toBeVisible()
})

test('copies a builtin, favorites it with an accessible name, archives offline and permanently deletes only an unused copy', async ({ app, page, context }, info) => {
  await app.open('/workouts/new'); await beginPlan(page, 'Copy draft')
  const builtin = page.getByRole('listitem').filter({ has: page.getByRole('button', { name: 'Lewy prosty → prawy prosty', exact: true }) })
  await builtin.getByRole('button', { name: 'Kopiuj do moich', exact: true }).click()
  await page.getByRole('textbox', { name: 'Nazwa ćwiczenia', exact: true }).fill('Moja kombinacja')
  await page.getByRole('button', { name: 'Zapisz ćwiczenie', exact: true }).click()
  await expect(page.getByText('Ćwiczenie skopiowane do Moich.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Moje', exact: true }).click()
  await page.getByRole('button', { name: 'Dodaj do ulubionych: Moja kombinacja', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Usuń z ulubionych: Moja kombinacja', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('region', { name: 'Ulubione', exact: true })).toContainText('Moja kombinacja')
  await accessible(page); await capture(page, info, 'favorites-and-filters')
  await expect.poll(async () => (await app.readExercises())[0]).toMatchObject({ copiedFromId: 'combo-jab-cross', favorite: true })
  await page.getByRole('button', { name: 'Wstecz', exact: true }).click()
  await page.getByRole('button', { name: 'Zamknij', exact: true }).click()
  await page.getByRole('button', { name: 'Odrzuć zmiany', exact: true }).click()
  await app.open('/exercises')
  const readyRow = page.getByRole('list', { name: 'Moje ćwiczenia', exact: true }).getByRole('listitem').filter({ hasText: 'Moja kombinacja' })
  await expect(readyRow.getByRole('button', { name: 'Archiwizuj', exact: true })).toBeEnabled()
  await context.setOffline(true)
  await readyRow.getByRole('button', { name: 'Archiwizuj', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Czeka na wysłanie' })).toBeVisible()
  await context.setOffline(false)
  await expect(page.getByText('Czeka na wysłanie', { exact: true })).toHaveCount(0)
  await page.getByText('Zarchiwizowane', { exact: true }).click()
  await page.getByRole('button', { name: 'Usuń trwale', exact: true }).click()
  await page.getByRole('button', { name: 'Potwierdź trwałe usunięcie', exact: true }).click()
  await expect.poll(() => app.readExercises()).toEqual([])
})

test('combines builtin categories with search and context filters on the phone', async ({ app, page }) => {
  await app.open('/workouts/new'); await beginPlan(page, 'Category draft')
  const category = page.getByRole('combobox', { name: 'Kategoria', exact: true })
  const search = page.getByRole('searchbox', { name: 'Szukaj ćwiczenia', exact: true })
  const results = page.getByRole('list', { name: 'Wyniki biblioteki ćwiczeń', exact: true })
  await expect(page.getByRole('button', { name: 'Prawy low kick', exact: true })).toHaveCount(0)
  await category.selectOption('Kombinacje 4-ciosowe')
  await expect(results.getByRole('listitem')).toHaveCount(3)
  await search.fill('LEWY PODBRODKOWY')
  await expect(results.getByRole('listitem')).toHaveCount(1)
  await expect(results).toContainText('Lewy prosty → prawy prosty → lewy podbródkowy → prawy prosty')
  await search.fill('Nieistniejaca pozycja')
  await expect(page.getByText('Brak wyników. Zmień frazę lub filtry.', { exact: true })).toBeVisible()
  await search.fill('')
  await results.getByRole('button', { name: 'Lewy prosty → prawy prosty → lewy sierp → prawy prosty', exact: true }).click()
  await page.getByRole('button', { name: 'Zamknij', exact: true }).click()
  await expect(category).toHaveValue('Kombinacje 4-ciosowe')
  await category.selectOption('')
  await page.getByRole('button', { name: '✓ Boks', exact: true }).click()
  await search.fill('Prawy low kick')
  await expect(results.getByRole('button', { name: 'Prawy low kick', exact: true })).toBeVisible()
  await search.fill('')
  await page.getByRole('button', { name: '✓ Technika', exact: true }).click()
  await category.selectOption('Siła na czas')
  await expect(results.getByRole('listitem')).toHaveCount(9)
  for (const theme of ['dark', 'light'] as const) { await app.setTheme(theme); await accessible(page) }
  await page.getByRole('button', { name: 'Moje', exact: true }).click()
  await expect(category).toHaveValue('')
  await expect(category).toBeDisabled()
})

for (const entry of [
  { id: 'continuous_pushups', name: 'Pompki na czas', type: 'continuous', mode: 'continuous' },
  { id: 'drill_footwork_forward_backward', name: 'Krok w przód → krok w tył', type: 'drill', mode: 'rounds' },
  { id: 'combo_jab_cross_lead_uppercut_cross', name: 'Lewy prosty → prawy prosty → lewy podbródkowy → prawy prosty', type: 'combination', mode: 'rounds' },
] as const) {
  test(`copies new ${entry.type} with approved defaults and reuses it in a plan`, async ({ app, page }) => {
    await app.open('/workouts/new'); await beginPlan(page, 'Approved copy')
    await page.getByRole('button', { name: '✓ Technika', exact: true }).click()
    await page.getByRole('searchbox', { name: 'Szukaj ćwiczenia', exact: true }).fill(entry.name)
    const builtin = page.getByRole('listitem').filter({ has: page.getByRole('button', { name: entry.name, exact: true }) })
    await builtin.getByRole('button', { name: 'Kopiuj do moich', exact: true }).click()
    await expect(page.getByRole('combobox', { name: 'Typ ćwiczenia', exact: true })).toHaveValue(entry.type)
    await expect(page.getByRole('combobox', { name: 'Tryb', exact: true })).toHaveValue(entry.mode)
    if (entry.mode === 'continuous') {
      await expect(page.getByRole('textbox', { name: 'Czas trwania (s)', exact: true })).toHaveValue('60')
    } else {
      await expect(page.getByRole('textbox', { name: 'Liczba rund', exact: true })).toHaveValue('3')
      await expect(page.getByRole('textbox', { name: 'Czas pracy (s)', exact: true })).toHaveValue('180')
      await expect(page.getByRole('textbox', { name: 'Przerwa między rundami (s)', exact: true })).toHaveValue('60')
    }
    const configuration = entry.mode === 'continuous' ? { mode: 'continuous', durationSeconds: 60 }
      : { mode: 'rounds', roundCount: 3, roundDurationSeconds: 180, restBetweenRoundsSeconds: 60 }
    await page.getByRole('button', { name: 'Zapisz ćwiczenie', exact: true }).click()
    await expect(page.getByText('Ćwiczenie skopiowane do Moich.', { exact: true })).toBeVisible()
    await expect.poll(() => app.readExercises()).toMatchObject([{ namePl: entry.name, type: entry.type,
      copiedFromId: entry.id, defaultConfiguration: configuration,
      disciplines: entry.type === 'continuous' ? ['boxing', 'kickboxing', 'muay_thai', 'k1', 'mma_striking'] : ['boxing'],
      blockTypes: entry.type === 'continuous' ? ['strengthAndConditioning'] : entry.type === 'drill' ? ['technique'] : ['technique', 'pads', 'bag'] }])
    const [personal] = await app.readExercises()
    expect(personal.id).not.toBe(entry.id)
    await page.getByRole('button', { name: 'Moje', exact: true }).click()
    await page.getByRole('button', { name: entry.name, exact: true }).click()
    await expect(page.getByRole('radio', { name: entry.mode === 'continuous' ? 'Ciągłe' : 'Rundy', exact: true })).toBeChecked()
    await page.getByRole('button', { name: 'Dodaj ćwiczenie', exact: true }).click()
    await app.savePlan()
    await expect.poll(() => app.readPlans()).toMatchObject([{ blocks: [{ items: [{ combinationId: personal.id,
      exerciseNameSnapshot: entry.name, configuration }] }] }])
  })
}

for (const operation of ['use', 'favorite'] as const) {
  test(`preserves device A edits and archive when offline device B syncs ${operation}`, async ({ app, page, context, browser }) => {
    await app.open('/exercises')
    await page.getByRole('button', { name: 'Nowe ćwiczenie', exact: true }).click()
    await page.getByRole('textbox', { name: 'Nazwa ćwiczenia', exact: true }).fill('Offline exercise')
    await page.getByRole('button', { name: 'Zapisz ćwiczenie', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Archiwizuj', exact: true })).toBeEnabled()
    await expect.poll(() => app.readExercises()).toMatchObject([{ namePl: 'Offline exercise' }])
    const authState = await context.storageState({ indexedDB: true })
    // Share only sign-in state: cloning Firestore would duplicate device B's primary lease.
    for (const origin of authState.origins) {
      if ('indexedDB' in origin && Array.isArray(origin.indexedDB)) origin.indexedDB = origin.indexedDB.filter((database: unknown) =>
        typeof database === 'object' && database !== null && 'name' in database && database.name === 'firebaseLocalStorageDb')
    }
    const deviceA = await browser.newContext({ storageState: authState, viewport: { width: 360, height: 800 }, serviceWorkers: 'block' })
    try {
      const pageA = await deviceA.newPage()
      await pageA.goto(new URL('/exercises', page.url()).href)
      await expect(pageA.getByRole('button', { name: 'Edytuj', exact: true })).toBeEnabled()
      await app.open('/workouts/new'); await beginPlan(page, 'Offline plan')
      await page.getByRole('button', { name: 'Moje', exact: true }).click()
      if (operation === 'use') await page.getByRole('button', { name: 'Offline exercise', exact: true }).click()
      await context.setOffline(true)
      await pageA.getByRole('button', { name: 'Edytuj', exact: true }).click()
      await pageA.getByRole('textbox', { name: 'Nazwa ćwiczenia', exact: true }).fill('Changed by device A')
      await pageA.getByRole('textbox', { name: 'Czas pracy (s)', exact: true }).fill('420')
      await pageA.getByRole('button', { name: 'Zapisz ćwiczenie', exact: true }).click()
      await pageA.getByRole('button', { name: 'Archiwizuj', exact: true }).click()
      await expect.poll(() => app.readExercises()).toMatchObject([{ namePl: 'Changed by device A', archivedAt: expect.any(String) }])
      if (operation === 'use') {
        await page.getByRole('button', { name: 'Dodaj ćwiczenie', exact: true }).click()
        await expect(page.getByRole('heading', { name: 'Oś treningu', exact: true })).toBeVisible()
      } else {
        await page.getByRole('button', { name: 'Dodaj do ulubionych: Offline exercise', exact: true }).click()
        await expect(page.getByRole('button', { name: 'Usuń z ulubionych: Offline exercise', exact: true })).toBeEnabled()
      }
      await context.setOffline(false)
      await expect.poll(() => app.readExercises()).toMatchObject([{ namePl: 'Changed by device A', archivedAt: expect.any(String),
        defaultConfiguration: { roundDurationSeconds: 420 }, ...(operation === 'use' ? { lastUsedAt: expect.any(String), favorite: false } : { favorite: true }) }])
    } finally { await deviceA.close() }
  })
}

test('supports plan-only exercises and creates a new personal exercise from an empty search', async ({ app, page }) => {
  await app.open('/workouts/new'); await beginPlan(page, 'Plan only')
  await page.getByRole('radio', { name: 'Własne ćwiczenie', exact: true }).click()
  await page.getByRole('textbox', { name: 'Nazwa ćwiczenia', exact: true }).fill('Tylko tutaj')
  await page.getByRole('radio', { name: 'Tylko w tym planie', exact: true }).check()
  await page.getByRole('button', { name: 'Konfiguruj ćwiczenie', exact: true }).click()
  await page.getByRole('button', { name: 'Dodaj ćwiczenie', exact: true }).click()
  expect(await app.readExercises()).toEqual([])
  await page.getByRole('button', { name: 'Dodaj ćwiczenie do bloku 1 — Technika', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Szukaj ćwiczenia', exact: true }).fill('Nowe łokcie')
  await page.getByRole('button', { name: 'Utwórz „Nowe łokcie” w Moich', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Nazwa ćwiczenia', exact: true })).toHaveValue('Nowe łokcie')
  await expect(page.getByRole('radio', { name: 'Zapisz w Moich ćwiczeniach', exact: true })).toBeChecked()
  await page.getByRole('button', { name: 'Konfiguruj ćwiczenie', exact: true }).click()
  await page.getByRole('button', { name: 'Dodaj ćwiczenie', exact: true }).click()
  await app.savePlan()
  await expect.poll(() => app.readExercises()).toMatchObject([{ namePl: 'Nowe łokcie' }])
  await expect.poll(async () => (await app.readPlans())[0]?.blocks[0]?.items[0]).toMatchObject({ combinationId: null })
})
