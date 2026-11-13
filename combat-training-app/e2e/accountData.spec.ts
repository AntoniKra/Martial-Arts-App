import AxeBuilder from '@axe-core/playwright'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Download, Page, TestInfo } from '@playwright/test'
import { test, expect } from './fixtures'
import { accountsWithEmail, createVerifiedAccount, signIn } from './authEmulator'
import { seedRawAccountDocument, readRawAccountCollection, readProfile, seedSession } from './firestoreEmulator'
import { workoutSession } from '../src/test/workoutSessionBuilders'
import type { ManualWorkoutSession } from '../src/domain/workout-session/workoutSession.types'

test.use({ screenshot: 'off' })
const instant = '2026-11-13T09:00:00.000Z'
const names = ['workoutPlans', 'workoutSessions', 'focusSkills', 'weekPlans', 'bodyWeights']
const jsonButton = (page: Page) => page.getByRole('button', { name: 'Pobierz wszystkie dane (JSON)', exact: true })
const csvButton = (page: Page) => page.getByRole('button', { name: 'Pobierz dziennik (CSV)', exact: true })
const profile = { schemaVersion: 1, healthDataConsent: { grantedAt: instant, noticeVersion: '2026-11', adultConfirmed: true },
  weightClassLabel: null, createdAt: instant, updatedAt: instant }

async function openAccount(page: Page) {
  const account = await createVerifiedAccount(page.request)
  await page.goto('/profile')
  await signIn(page, account)
  await expect(jsonButton(page)).toBeEnabled()
  return account
}
async function downloaded(page: Page, button: ReturnType<typeof jsonButton>) {
  const received = page.waitForEvent('download')
  await button.click()
  return received
}
async function bytes(download: Download) {
  const file = await download.path()
  expect(file).not.toBeNull()
  return readFile(file!)
}
async function capture(page: Page, info: TestInfo, name: string, theme: string) {
  if (process.env.CAPTURE_ACCOUNT_SCREENSHOTS !== '1' || info.project.name !== 'phone' || info.repeatEachIndex !== 0) return
  const folder = path.resolve('docs/screenshots/issue-101')
  await mkdir(folder, { recursive: true })
  await page.evaluate(() => document.fonts.ready)
  const file = path.join(folder, `${name}-${theme}-360x800.png`)
  await page.screenshot({ path: file })
  await info.attach(`${name}-${theme}`, { path: file, contentType: 'image/png' })
}

test('exports every raw document including invalid records and the profile as JSON', async ({ page }) => {
  const account = await openAccount(page)
  await seedRawAccountDocument(page.request, account.uid, '', profile)
  const documents = Object.fromEntries(names.map((name) => [name, { schemaVersion: 99, invalid: name, unknown: ['raw', 4] }]))
  for (const name of names) await seedRawAccountDocument(page.request, account.uid, `${name}/raw`, documents[name])
  await expect(page.getByText('Plik zawiera dane o zdrowiu (masa ciała). Przechowuj go bezpiecznie.')).toBeVisible()
  const download = await downloaded(page, jsonButton(page))
  expect(download.suggestedFilename()).toMatch(/^combat-training-dane-\d{4}-\d{2}-\d{2}\.json$/)
  const content = JSON.parse((await bytes(download)).toString('utf8'))
  expect(content).toEqual({ format: 'combat-training-export', formatVersion: 1, exportedAt: expect.any(String),
    account: { uid: account.uid, email: account.email }, profile,
    collections: Object.fromEntries(names.map((name) => [name, [documents[name]]])) })
})

test('downloads BOM CSV with manual and plan entries and safely escaped multiline and formula notes', async ({ page }) => {
  const account = await openAccount(page)
  const plan = workoutSession({ id: 'csv-plan', durationSeconds: 90, workSeconds: 60, note: 'tekst; "cytat"\nnowa linia' })
  const manual: ManualWorkoutSession = { id: 'csv-manual', source: 'manual', status: 'completed', disciplineKey: 'boxing',
    category: 'bag', workoutDate: '2026-11-12', timezone: 'Europe/Warsaw', durationSeconds: 600, workSeconds: null,
    sparringSeconds: null, completion: null, note: '=1+1', rpe: 5, rpeRecordedAt: instant, sparring: [], focusRatings: [],
    createdAt: instant, updatedAt: instant }
  await seedSession(page.request, account.uid, plan); await seedSession(page.request, account.uid, manual)
  const download = await downloaded(page, csvButton(page)), content = await bytes(download)
  expect(download.suggestedFilename()).toMatch(/^combat-training-dziennik-\d{4}-\d{2}-\d{2}\.csv$/)
  expect([...content.subarray(0, 3)]).toEqual([239, 187, 191])
  const csv = content.toString('utf8')
  expect(csv).toContain('Data;Źródło;Status;Dyscyplina;Rodzaj;Nazwa;')
  expect(csv).toContain(';Z planu;'); expect(csv).toContain(';Ręczny;')
  expect(csv).toContain('"tekst; ""cytat""\nnowa linia"')
  expect(csv).toContain(";'=1+1\r\n")
  expect(csv).toContain(';1,5;1,0;')
})

test('disables both exports offline with an explanation', async ({ page, context }) => {
  await openAccount(page)
  await context.setOffline(true)
  await expect(jsonButton(page)).toBeDisabled(); await expect(csvButton(page)).toBeDisabled()
  await expect(page.getByText('Pobranie danych wymaga połączenia z internetem.', { exact: true })).toBeVisible()
  await context.setOffline(false)
})

test('rejects a wrong password without deletion, then deletes all data, Auth and account storage and returns the next user home', async ({ page }) => {
  const account = await openAccount(page)
  await seedRawAccountDocument(page.request, account.uid, '', profile)
  for (const name of names) await seedRawAccountDocument(page.request, account.uid, `${name}/raw`, { schemaVersion: 99, invalid: name })
  await page.evaluate((uid) => {
    for (const name of ['activeWorkout', 'rpeDismissals', 'quickTimer']) localStorage.setItem(`combat-training.${name}.${uid}`, '{}')
    localStorage.setItem('combat-training.quickTimer.other', '{}')
    localStorage.setItem('combat-training.preparation', '10')
  }, account.uid)
  await page.getByRole('link', { name: 'Usuń konto', exact: true }).click()
  await page.getByLabel('Hasło', { exact: true }).fill('incorrect-test-password')
  await page.getByRole('button', { name: 'Potwierdź hasłem', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Nieprawidłowy adres e-mail lub hasło.')
  for (const name of names) expect(await readRawAccountCollection(page.request, account.uid, name)).toHaveLength(1)
  expect(await readProfile(page.request, account.uid)).not.toBeNull()
  expect(await accountsWithEmail(page.request, account.email)).toHaveLength(1)
  await page.getByLabel('Hasło', { exact: true }).fill(account.password)
  await page.getByRole('button', { name: 'Potwierdź hasłem', exact: true }).click()
  await page.getByRole('button', { name: 'Usuń konto na zawsze', exact: true }).click()
  await expect(page).toHaveURL('/login')
  await expect(page.getByText('Konto zostało usunięte.', { exact: true })).toBeVisible()
  for (const name of names) expect(await readRawAccountCollection(page.request, account.uid, name)).toEqual([])
  expect(await readProfile(page.request, account.uid)).toBeNull()
  expect(await accountsWithEmail(page.request, account.email)).toEqual([])
  await expect.poll(() => page.evaluate((uid) => Object.keys(localStorage).filter((key) =>
    key.startsWith('combat-training.') && key.endsWith(`.${uid}`)), account.uid)).toEqual([])
  expect(await page.evaluate(() => localStorage.getItem('combat-training.quickTimer.other'))).toBe('{}')
  expect(await page.evaluate(() => localStorage.getItem('combat-training.preparation'))).toBe('10')
  await expect.poll(() => page.evaluate(async () => (await indexedDB.databases()).filter(({ name }) => name?.startsWith('firestore/')).length)).toBe(0)
  const next = await createVerifiedAccount(page.request)
  await signIn(page, next)
  await expect(page).toHaveURL('/')
})

test('blocks account deletion and export with an unsent profile write', async ({ page, context }) => {
  const account = await openAccount(page)
  await seedRawAccountDocument(page.request, account.uid, '', profile)
  await expect(page.getByRole('button', { name: 'Ustaw kategorię wagową (opcjonalnie)', exact: true })).toBeVisible()
  // Load the lazy route before disconnecting, then make a local profile write.
  await page.getByRole('link', { name: 'Usuń konto', exact: true }).click()
  await page.getByRole('link', { name: 'Anuluj', exact: true }).click()
  await page.getByRole('button', { name: 'Ustaw kategorię wagową (opcjonalnie)', exact: true }).click()
  await page.getByRole('textbox', { name: 'Kategoria wagowa (opcjonalnie)', exact: true }).fill('77 kg')
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Zapisz kategorię', exact: true }).click()
  await expect(page.getByText('Kategoria: 77 kg', { exact: true })).toBeVisible()
  await expect(jsonButton(page)).toBeDisabled(); await expect(csvButton(page)).toBeDisabled()
  await page.getByRole('link', { name: 'Usuń konto', exact: true }).click()
  await page.getByLabel('Hasło', { exact: true }).fill(account.password)
  await expect(page.getByRole('button', { name: 'Potwierdź hasłem', exact: true })).toBeDisabled()
  await expect(page.getByText('Poczekaj, aż wszystkie zapisy zostaną wysłane (Czeka na wysłanie).', { exact: true })).toBeVisible()
  expect(await readProfile(page.request, account.uid)).toMatchObject({ weightClassLabel: null })
  expect(await accountsWithEmail(page.request, account.email)).toHaveLength(1)
  await context.setOffline(false)
})

for (const theme of ['dark', 'light'] as const) {
  test(`has accessible account screens before and after password confirmation in ${theme}`, async ({ page, app }, info) => {
    const account = await openAccount(page)
    await app.setTheme(theme)
    const section = page.getByRole('region', { name: 'Twoje dane', exact: true })
    await section.evaluate((element) => element.scrollIntoView({ block: 'start' }))
    await capture(page, info, 'your-data', theme)
    for (const screen of ['profile', 'delete-before', 'delete-after']) {
      if (screen === 'delete-before') {
        await page.getByRole('link', { name: 'Usuń konto', exact: true }).click()
        await page.getByLabel('Hasło', { exact: true }).scrollIntoViewIfNeeded()
        await capture(page, info, screen, theme)
      } else if (screen === 'delete-after') {
        await page.getByLabel('Hasło', { exact: true }).fill(account.password)
        await page.getByRole('button', { name: 'Potwierdź hasłem', exact: true }).click()
        await expect(page.getByRole('button', { name: 'Usuń konto na zawsze', exact: true })).toBeFocused()
        await capture(page, info, screen, theme)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) =>
        impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
    }
    await page.getByRole('link', { name: 'Anuluj', exact: true }).click()
    expect(await accountsWithEmail(page.request, account.email)).toHaveLength(1)
  })
}
