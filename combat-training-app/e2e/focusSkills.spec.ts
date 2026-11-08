import AxeBuilder from '@axe-core/playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { Locator, Page, TestInfo } from '@playwright/test'
import { expect, test } from './fixtures'
import { createVerifiedAccount, signIn } from './authEmulator'

const skillName = 'Jab z krokiem w przód'
const criterion = 'Przednia stopa ląduje przed rękawicą, nie po niej.'
const exerciseNames = ['Jab na worku', 'Jab na tarczach', 'Walka z cieniem', 'Praca na nogach']
const toggle = (card: Locator) => card.getByRole('switch', { name: 'Ćwiczenie celu · Oceniaj po treningu', exact: true })
const cardFor = (page: Page, name: string) => page.getByRole('list', { name: 'Elementy bloku 1 — Technika', exact: true })
  .getByRole('listitem').filter({ has: page.getByRole('heading', { name, exact: true }) })
const skillOption = (card: Locator, name = skillName) => card.getByRole('radio', { name: new RegExp(`^${name}`) })

async function addExercise(page: Page, name: string) {
  await page.getByRole('button', { name: 'Dodaj ćwiczenie do bloku 1 — Technika', exact: true }).click()
  await page.getByRole('radio', { name: 'Własne ćwiczenie', exact: true }).click()
  await page.getByRole('textbox', { name: 'Nazwa ćwiczenia', exact: true }).fill(name)
  await page.getByRole('button', { name: 'Konfiguruj ćwiczenie', exact: true }).click()
  await page.getByRole('button', { name: 'Dodaj ćwiczenie', exact: true }).click()
}

async function prepareBuilder(page: Page, name: string, exercises: string[]) {
  await page.getByRole('radio', { name: 'Boks', exact: true }).check()
  await page.getByRole('textbox', { name: 'Nazwa planu' }).fill(name)
  await page.getByRole('button', { name: 'Dodaj blok', exact: true }).click()
  await page.getByRole('button', { name: 'Technika', exact: true }).click()
  for (const exercise of exercises) await addExercise(page, exercise)
}

async function checkAccessibility(page: Page) {
  expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) =>
    impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
}

async function capture(page: Page, info: TestInfo, screen: 'list' | 'form' | 'preview', theme: 'dark' | 'light') {
  if (info.project.name !== 'phone') return
  const folder = path.resolve('docs/screenshots/issue-68')
  await mkdir(folder, { recursive: true })
  const file = path.join(folder, `${screen}-${theme}-360x800.png`)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: file })
  await info.attach(`${screen}-${theme}-360x800`, { path: file, contentType: 'image/png' })
}

test('creates, reloads and shares focus skills between plans, permits repeats and blocks a fourth mark', async ({ app, page }, info) => {
  await app.open('/workouts/new')
  await prepareBuilder(page, 'Plan ćwiczeń celu', exerciseNames)
  const first = cardFor(page, exerciseNames[0])
  await toggle(first).click()
  await first.getByRole('radio', { name: /^Nowe ćwiczenie celu/ }).check()
  const form = first.getByRole('form', { name: 'Nowe ćwiczenie celu', exact: true })
  await form.getByRole('button', { name: 'Zapisz ćwiczenie', exact: true }).click()
  await expect(form.getByRole('textbox', { name: 'Nazwa', exact: true })).toHaveAttribute('aria-invalid', 'true')
  await form.getByRole('textbox', { name: 'Nazwa', exact: true }).fill(skillName)
  await form.getByRole('textbox', { name: 'Kryterium', exact: true }).fill(criterion)
  await expect(form.getByRole('textbox', { name: 'Nazwa', exact: true })).toHaveAttribute('aria-invalid', 'false')
  await expect(form.getByRole('textbox', { name: 'Kryterium', exact: true })).toHaveAttribute('aria-invalid', 'false')
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    await checkAccessibility(page)
    await form.evaluate((element) => element.scrollIntoView({ block: 'center' }))
    await capture(page, info, 'form', theme)
  }
  await form.getByRole('button', { name: 'Zapisz ćwiczenie', exact: true }).click()
  await expect(form).toHaveCount(0)
  await expect(skillOption(first)).toBeChecked()
  await expect(first.getByText('Czeka na wysłanie', { exact: true })).toHaveCount(0)
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    await checkAccessibility(page)
    await first.evaluate((element) => element.scrollIntoView({ block: 'center' }))
    await capture(page, info, 'list', theme)
  }
  for (const name of exerciseNames.slice(1, 3)) {
    const card = cardFor(page, name)
    await toggle(card).click()
    await skillOption(card).check()
  }
  const fourth = cardFor(page, exerciseNames[3])
  await expect(toggle(fourth)).toBeDisabled()
  await expect(fourth.getByText('W tym planie: 3 z 3 ćwiczeń celu', { exact: true })).toBeVisible()
  await expect(fourth.getByText(/W planie są już 3 ćwiczenia celu/)).toBeVisible()
  // Detaching frees a slot and keeps the reusable skill on the list.
  await toggle(first).click()
  await expect(toggle(fourth)).toBeEnabled()
  await toggle(first).click()
  await expect(skillOption(first)).toHaveCount(1)
  await skillOption(first).check()

  await page.getByRole('button', { name: 'Podgląd planu', exact: true }).click()
  await expect(page.getByText('3 ćwiczenia celu', { exact: true })).toBeVisible()
  await expect(page.getByText('CEL', { exact: true })).toHaveCount(3)
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    await checkAccessibility(page)
    await page.getByRole('heading', { name: 'Plan ćwiczeń celu', exact: true }).evaluate((element) => element.scrollIntoView({ block: 'start' }))
    await capture(page, info, 'preview', theme)
  }
  await page.getByRole('button', { name: 'Zapisz plan', exact: true }).click()
  await page.getByRole('link', { name: 'Zobacz plan', exact: true }).click()
  await expect(page.getByText('CEL', { exact: true })).toHaveCount(3)
  await app.open(new URL(page.url()).pathname)
  await expect(page.getByText('3 ćwiczenia celu', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Edytuj plan', exact: true }).click()
  await expect(toggle(first)).toHaveAttribute('aria-checked', 'true')
  await expect(skillOption(first)).toBeChecked()
  await expect(first.getByText(criterion, { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Anuluj', exact: true }).click()

  await app.open('/workouts/new')
  await prepareBuilder(page, 'Drugi plan', ['Powtórka'])
  const secondPlanCard = cardFor(page, 'Powtórka')
  await toggle(secondPlanCard).click()
  await expect(secondPlanCard.getByText(criterion, { exact: true })).toBeVisible()
  await skillOption(secondPlanCard).check()
  await secondPlanCard.getByRole('button', { name: 'Edytuj wybrane ćwiczenie celu', exact: true }).click()
  const editor = secondPlanCard.getByRole('form', { name: 'Popraw ćwiczenie celu', exact: true })
  await editor.getByRole('textbox', { name: 'Nazwa', exact: true }).fill('Jab i powrót do gardy')
  await editor.getByRole('textbox', { name: 'Kryterium', exact: true }).fill('Ręka wraca do brody.')
  await editor.getByRole('button', { name: 'Zapisz ćwiczenie', exact: true }).click()
  await expect(skillOption(secondPlanCard, 'Jab i powrót do gardy')).toBeChecked()
  await app.savePlan()
  const firstPlan = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Plan ćwiczeń celu', exact: true }) })
  await firstPlan.getByRole('link', { name: 'Zobacz plan', exact: true }).click()
  await page.getByRole('link', { name: 'Edytuj plan', exact: true }).click()
  await expect(skillOption(first, 'Jab i powrót do gardy')).toBeChecked()
  await expect(first.getByText('Ręka wraca do brody.', { exact: true })).toBeVisible()
})

test('saves a focus skill offline, warns before sign-out and isolates the next account', async ({ app, page, context }) => {
  await app.createPlan('Plan offline')
  await page.getByRole('link', { name: 'Edytuj plan', exact: true }).click()
  const first = cardFor(page, 'Praca na nogach')
  await toggle(first).click()
  await first.getByRole('radio', { name: /^Nowe ćwiczenie celu/ }).check()
  const form = first.getByRole('form', { name: 'Nowe ćwiczenie celu', exact: true })
  await form.getByRole('textbox', { name: 'Nazwa', exact: true }).fill(skillName)
  await form.getByRole('textbox', { name: 'Kryterium', exact: true }).fill(criterion)
  await context.setOffline(true)
  await form.getByRole('button', { name: 'Zapisz ćwiczenie', exact: true }).click()
  await expect(skillOption(first)).toBeChecked()
  await expect(first.getByText('Czeka na wysłanie', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Wyloguj', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Wylogować się?', exact: true })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Anuluj', exact: true }).click()
  await context.setOffline(false)
  await expect(first.getByText('Czeka na wysłanie', { exact: true })).toHaveCount(0)
  await app.savePlan()
  await page.getByRole('button', { name: 'Wyloguj', exact: true }).click()
  // The newly saved plan may still be waiting for server acknowledgement.
  if (await dialog.isVisible()) await dialog.getByRole('button', { name: 'Wyloguj mimo to', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Zaloguj się', exact: true })).toBeVisible()
  const second = await createVerifiedAccount(page.request)
  await signIn(page, second)
  await expect(page.getByRole('button', { name: 'Wyloguj', exact: true })).toBeEnabled()
  await page.goto('/workouts/new')
  await prepareBuilder(page, 'Plan drugiego konta', ['Nowe ćwiczenie'])
  const secondCard = cardFor(page, 'Nowe ćwiczenie')
  await toggle(secondCard).click()
  await expect(skillOption(secondCard)).toHaveCount(0)
  await expect(secondCard.getByRole('radio', { name: /^Nowe ćwiczenie celu/ })).toBeVisible()
})
