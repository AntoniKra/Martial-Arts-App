import AxeBuilder from '@axe-core/playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { Locator, Page, TestInfo } from '@playwright/test'
import { expect, test, openProfile } from './fixtures'
import { createVerifiedAccount, signIn } from './authEmulator'

test.use({ serviceWorkers: 'allow' })

const skillName = 'Jab z krokiem w przód'
const criterion = 'Przednia stopa ląduje przed rękawicą, nie po niej.'
const exerciseNames = ['Jab na worku', 'Jab na tarczach', 'Walka z cieniem', 'Praca na nogach']
const toggle = (card: Locator) => card.getByRole('switch', { name: 'Element do poprawy · Oceniaj po treningu', exact: true })
const cardFor = (page: Page, name: string) => page.getByRole('list', { name: 'Elementy bloku 1 — Technika', exact: true })
  .getByRole('listitem').filter({ has: page.getByRole('heading', { name, exact: true }) })
const skillOption = (card: Locator, name = skillName) => card.getByRole('radio', { name: new RegExp(`^${name}`) })
const changeSkill = (card: Locator) => card.getByRole('button', { name: 'Zmień', exact: true })
// The focus skill picker sits in the exercise row's actions panel; one row is open at a time.
async function expand(card: Locator) {
  const menu = card.getByRole('button', { name: /^Akcje ćwiczenia / })
  if (await menu.getAttribute('aria-expanded') !== 'true') await menu.click()
  await expect(menu).toHaveAttribute('aria-expanded', 'true')
}

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
  await page.getByRole('button', { name: 'Zamknij', exact: true }).click()
  await page.getByRole('group', { name: 'Pierwszy blok', exact: true }).getByRole('button', { name: 'Technika', exact: true }).click()
  for (const exercise of exercises) await addExercise(page, exercise)
}

async function checkAccessibility(page: Page) {
  expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) =>
    impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
}

async function capture(page: Page, info: TestInfo, screen: 'list' | 'form' | 'preview', theme: 'dark' | 'light') {
  if (process.env.CAPTURE_SCREENSHOTS !== '1' || info.project.name !== 'phone') return
  const folder = path.resolve('docs/screenshots/issue-68')
  await mkdir(folder, { recursive: true })
  const file = path.join(folder, `${screen}-${theme}-360x800.png`)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: file })
  await info.attach(`${screen}-${theme}-360x800`, { path: file, contentType: 'image/png' })
}

test('creates, reloads and shares focus skills between plans, permits repeats and blocks a fourth mark', async ({ app, page }, info) => {
  await app.open('/workouts/new')
  await prepareBuilder(page, 'Plan elementów do poprawy', exerciseNames)
  const first = cardFor(page, exerciseNames[0])
  await expand(first)
  await toggle(first).click()
  await first.getByRole('radio', { name: /^Nowy element do poprawy/ }).check()
  const form = first.getByRole('form', { name: 'Nowy element do poprawy', exact: true })
  await form.getByRole('button', { name: 'Zapisz ćwiczenie', exact: true }).click()
  await expect(form.getByRole('textbox', { name: 'Nazwa', exact: true })).toHaveAttribute('aria-invalid', 'true')
  await form.getByRole('textbox', { name: 'Nazwa', exact: true }).fill(skillName)
  await form.getByRole('textbox', { name: 'Cel', exact: true }).fill(criterion)
  await expect(form.getByRole('textbox', { name: 'Nazwa', exact: true })).toHaveAttribute('aria-invalid', 'false')
  await expect(form.getByRole('textbox', { name: 'Cel', exact: true })).toHaveAttribute('aria-invalid', 'false')
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    await checkAccessibility(page)
    await form.evaluate((element) => element.scrollIntoView({ block: 'center' }))
    await capture(page, info, 'form', theme)
  }
  await form.getByRole('button', { name: 'Zapisz ćwiczenie', exact: true }).click()
  await expect(form).toHaveCount(0)
  await expect(first.getByText(skillName, { exact: true }).filter({ visible: true })).toBeVisible()
  await expect(first.getByText('Czeka na wysłanie', { exact: true })).toHaveCount(0)
  await changeSkill(first).click()
  await expect(skillOption(first)).toHaveAttribute('aria-checked', 'true')
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    await checkAccessibility(page)
    await first.evaluate((element) => element.scrollIntoView({ block: 'center' }))
    await capture(page, info, 'list', theme)
  }
  for (const name of exerciseNames.slice(1, 3)) {
    const card = cardFor(page, name)
    await expand(card)
    await toggle(card).click()
    await skillOption(card).check()
  }
  const fourth = cardFor(page, exerciseNames[3])
  await expand(fourth)
  await expect(toggle(fourth)).toBeDisabled()
  await expect(page.getByText(/W tym planie:/)).toHaveCount(0)
  await expect(toggle(fourth)).toHaveAccessibleDescription(/W planie są już 3 elementy do poprawy/)
  await expect(fourth.getByText(/W planie są już 3 elementy do poprawy/)).toBeVisible()
  // Detaching frees a slot and keeps the reusable skill on the list.
  await expand(first)
  await toggle(first).click()
  await expand(fourth)
  await expect(toggle(fourth)).toBeEnabled()
  await expand(first)
  await toggle(first).click()
  await expect(skillOption(first)).toHaveCount(1)
  await skillOption(first).check()

  await page.getByRole('button', { name: 'Podgląd', exact: true }).click()
  await expect(page.getByText('3 elementy do poprawy', { exact: true })).toBeVisible()
  await expect(page.getByText('CEL', { exact: true })).toHaveCount(3)
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    await checkAccessibility(page)
    await page.getByRole('heading', { name: 'Plan elementów do poprawy', exact: true }).evaluate((element) => element.scrollIntoView({ block: 'start' }))
    await capture(page, info, 'preview', theme)
  }
  await page.getByRole('button', { name: 'Zapisz plan', exact: true }).click()
  await page.getByRole('link', { name: 'Zobacz plan', exact: true }).click()
  await expect(page.getByText('CEL', { exact: true })).toHaveCount(3)
  await app.open(new URL(page.url()).pathname)
  await expect(page.getByText('3 elementy do poprawy', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Edytuj plan', exact: true }).click()
  await expand(first)
  await expect(toggle(first)).toHaveAttribute('aria-checked', 'true')
  await changeSkill(first).click()
  await expect(skillOption(first)).toHaveAttribute('aria-checked', 'true')
  await expect(first.getByText(criterion, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Zamknij', exact: true }).click()

  await app.open('/workouts/new')
  await prepareBuilder(page, 'Drugi plan', ['Powtórka'])
  const secondPlanCard = cardFor(page, 'Powtórka')
  await expand(secondPlanCard)
  await toggle(secondPlanCard).click()
  await expect(secondPlanCard.getByText(criterion, { exact: true })).toBeVisible()
  await skillOption(secondPlanCard).check()
  await changeSkill(secondPlanCard).click()
  await secondPlanCard.getByRole('button', { name: 'Edytuj wybrany element do poprawy', exact: true }).click()
  const editor = secondPlanCard.getByRole('form', { name: 'Popraw element do poprawy', exact: true })
  await editor.getByRole('textbox', { name: 'Nazwa', exact: true }).fill('Jab i powrót do gardy')
  await editor.getByRole('textbox', { name: 'Cel', exact: true }).fill('Ręka wraca do brody.')
  await editor.getByRole('button', { name: 'Zapisz ćwiczenie', exact: true }).click()
  await expect(secondPlanCard.getByText('Jab i powrót do gardy', { exact: true }).filter({ visible: true })).toBeVisible()
  await changeSkill(secondPlanCard).click()
  await expect(skillOption(secondPlanCard, 'Jab i powrót do gardy')).toHaveAttribute('aria-checked', 'true')
  await app.savePlan()
  const firstPlan = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Plan elementów do poprawy', exact: true }) })
  await firstPlan.getByRole('link', { name: 'Zobacz plan', exact: true }).click()
  await page.getByRole('link', { name: 'Edytuj plan', exact: true }).click()
  await expand(first)
  await changeSkill(first).click()
  await expect(skillOption(first, 'Jab i powrót do gardy')).toHaveAttribute('aria-checked', 'true')
  await expect(first.getByText('Ręka wraca do brody.', { exact: true })).toBeVisible()
})

test('saves a focus skill offline, warns before sign-out and isolates the next account', async ({ app, page, context }) => {
  await app.createPlan('Plan offline')
  await page.getByRole('link', { name: 'Edytuj plan', exact: true }).click()
  const first = cardFor(page, 'Praca na nogach')
  await expand(first)
  await toggle(first).click()
  await first.getByRole('radio', { name: /^Nowy element do poprawy/ }).check()
  const form = first.getByRole('form', { name: 'Nowy element do poprawy', exact: true })
  await form.getByRole('textbox', { name: 'Nazwa', exact: true }).fill(skillName)
  await form.getByRole('textbox', { name: 'Cel', exact: true }).fill(criterion)
  await context.setOffline(true)
  await form.getByRole('button', { name: 'Zapisz ćwiczenie', exact: true }).click()
  const firstPicker = first.getByRole('group', { name: 'Element do poprawy', exact: true })
  await expect(firstPicker.getByText(skillName).filter({ visible: true })).toBeVisible()
  await expect(firstPicker.getByText(/Czeka na wysłanie/).filter({ visible: true })).toBeVisible()
  await app.savePlan()
  await openProfile(page)
  await page.getByRole('button', { name: 'Wyloguj', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Wylogować się?', exact: true })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Anuluj', exact: true }).click()
  await context.setOffline(false)
  await page.getByRole('navigation', { name: 'Główna nawigacja', exact: true }).getByRole('button', { name: 'Trening', exact: true }).click()
  await page.getByRole('dialog', { name: 'Nowy trening', exact: true }).getByRole('link', { name: /^Moje plany/ }).click()
  await expect(page.getByText('Czeka na wysłanie', { exact: true })).toHaveCount(0)
  await openProfile(page)
  await page.getByRole('button', { name: 'Wyloguj', exact: true }).click()
  // The newly saved plan may still be waiting for server acknowledgement.
  if (await dialog.isVisible()) await dialog.getByRole('button', { name: 'Wyloguj mimo to', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Zaloguj się', exact: true })).toBeVisible()
  const second = await createVerifiedAccount(page.request)
  await signIn(page, second)
  await expect(page.getByRole('link', { name: 'Profil', exact: true })).toBeVisible()
  await page.goto('/workouts/new')
  await prepareBuilder(page, 'Plan drugiego konta', ['Nowe ćwiczenie'])
  const secondCard = cardFor(page, 'Nowe ćwiczenie')
  await expand(secondCard)
  await toggle(secondCard).click()
  await expect(skillOption(secondCard)).toHaveCount(0)
  await expect(secondCard.getByRole('radio', { name: /^Nowy element do poprawy/ })).toBeVisible()
})
