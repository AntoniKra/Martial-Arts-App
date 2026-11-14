import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'
import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'
import { shiftCalendarDate } from '../src/domain/week-plan/weekCalendar'
import type { WellbeingEntry } from '../src/domain/wellbeing/wellbeing'
import { wellbeingQuestions } from '../src/features/wellbeing/wellbeingLabels'
import { sessionStep, workoutSession } from '../src/test/workoutSessionBuilders'
import type { ManualWorkoutSession, QuickTimerWorkoutSession } from '../src/domain/workout-session/workoutSession.types'
import { workoutSessionDocumentSchema } from '../src/infrastructure/firebase/workoutDocumentSchemas'

test.use({ screenshot: 'off', trace: 'off' })
const today = '2026-11-14', instant = `${today}T09:00:00.000Z`
const card = (page: Page) => page.getByRole('region', { name: 'Jak się dziś czujesz?', exact: true })
const progress = (page: Page) => page.getByRole('region', { name: 'Samopoczucie', exact: true })
const nav = (page: Page, name: string) => page.getByRole('navigation', { name: 'Główna nawigacja' }).filter({ visible: true }).getByRole('link', { name, exact: true })
function entry(offset: number, patch: Partial<WellbeingEntry> = {}): WellbeingEntry {
  return { date: shiftCalendarDate(today, offset), questionsVersion: 1, sleep: 3, energy: 3, soreness: 3, stress: 3,
    note: null, createdAt: instant, updatedAt: instant, ...patch }
}
async function grant(page: Page) {
  await page.getByRole('link', { name: 'Włącz Samopoczucie', exact: true }).click()
  const adult = page.getByRole('checkbox', { name: 'Mam ukończone 18 lat.', exact: true })
  const agreed = page.getByRole('checkbox', { name: 'Wyrażam wyraźną zgodę na przetwarzanie moich danych o samopoczuciu w opisanym celu.', exact: true })
  const enable = page.getByRole('button', { name: 'Włącz Samopoczucie', exact: true })
  await expect(adult).not.toBeChecked(); await expect(agreed).not.toBeChecked(); await expect(enable).toBeDisabled()
  await adult.check(); await expect(enable).toBeDisabled(); await agreed.check(); await enable.click()
  await expect(page.getByRole('switch', { name: 'Samopoczucie włączone', exact: true })).toBeChecked()
  await expect(page.getByText('Czeka na wysłanie', { exact: true })).toHaveCount(0)
}
async function answer(page: Page, value = 3) {
  for (const question of Object.values(wellbeingQuestions)) {
    await page.getByRole('group', { name: question.question, exact: true }).getByRole('radio', { name: `${value} ${question.options[value - 1]}`, exact: true }).check()
  }
}
async function accessible(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
}
test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(instant)) })

test('separate consent, offline daily entry, progress, same-day edit and deletion on withdrawal', async ({ app, page, context }) => {
  await app.open()
  await expect(card(page)).toHaveCount(0)
  await nav(page, 'Postęp').click(); await expect(progress(page)).toHaveCount(0)
  await nav(page, 'Profil').click(); await grant(page)
  expect((await app.readProfile())?.healthDataConsent).toBeNull()
  await nav(page, 'Start').click(); await expect(card(page)).toBeVisible()
  await expect(card(page).getByRole('radio', { checked: true })).toHaveCount(0)
  await card(page).getByRole('button', { name: 'Zapisz', exact: true }).click()
  await expect(card(page).getByRole('alert')).toContainText('Odpowiedz na wszystkie')
  await answer(page)
  await page.getByRole('textbox', { name: 'Coś nietypowego? (opcjonalnie)', exact: true }).fill('=1+1')
  await accessible(page)
  await context.setOffline(true)
  await card(page).getByRole('button', { name: 'Zapisz', exact: true }).click()
  await expect(card(page)).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Samopoczucie: Czeka na wysłanie' })).toBeVisible()
  await page.getByRole('button', { name: 'Wyloguj', exact: true }).click()
  const signOut = page.getByRole('dialog', { name: 'Wylogować się?', exact: true })
  await expect(signOut).toBeVisible()
  await signOut.getByRole('button', { name: 'Anuluj', exact: true }).click()
  await context.setOffline(false)
  await expect.poll(() => app.readWellbeing()).toMatchObject([{ date: today, sleep: 3, energy: 3, soreness: 3, stress: 3, note: '=1+1', questionsVersion: 1 }])
  await expect(page.getByText('Samopoczucie: Czeka na wysłanie', { exact: true })).toHaveCount(0)
  await nav(page, 'Postęp').click()
  await expect(progress(page)).toContainText('Jeszcze 14 wpisów do Twojej normy')
  await expect(progress(page)).toContainText('Sen: 3 · przeciętna')
  await expect(progress(page)).toContainText('To nie jest ocena medyczna.')
  await accessible(page)
  await nav(page, 'Profil').click()
  await page.getByRole('button', { name: 'Popraw dzisiejszy wpis', exact: true }).click()
  await answer(page, 4); await page.getByRole('button', { name: 'Zapisz', exact: true }).click()
  await expect.poll(() => app.readWellbeing()).toMatchObject([{ sleep: 4 }])
  const originalCreated = (await app.readWellbeing())[0] as WellbeingEntry
  expect(originalCreated.createdAt).toBe(instant)
  const csvDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Pobierz samopoczucie (CSV)', exact: true }).click()
  const csv = await csvDownload
  expect(csv.suggestedFilename()).toBe('combat-training-samopoczucie-2026-11-14.csv')
  expect(await readFile((await csv.path())!, 'utf8')).toContain(`${today};4;4;4;4;'=1+1;1;`)
  const jsonDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Pobierz wszystkie dane (JSON)', exact: true }).click()
  const json = JSON.parse(await readFile((await (await jsonDownload).path())!, 'utf8'))
  expect(json.collections.readiness).toHaveLength(1)
  // Enabling body weight after wellbeing must preserve both independent consents.
  await page.getByRole('link', { name: 'Włącz zapisywanie masy ciała', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Mam ukończone 18 lat.', exact: true }).check()
  await page.getByRole('checkbox', { name: 'Zgadzam się na zapisywanie mojej masy ciała i kategorii wagowej na moim koncie.', exact: true }).check()
  await page.getByRole('button', { name: 'Włącz', exact: true }).click()
  await expect(page.getByRole('button', { name: '+ Dodaj pomiar', exact: true })).toBeVisible()
  await expect(page.getByText('Czeka na wysłanie', { exact: true })).toHaveCount(0)
  const weightConsent = (await app.readProfile())?.healthDataConsent
  await app.seedBodyWeight({ date: today, weightKg: 76, createdAt: instant, updatedAt: instant })
  await context.setOffline(true)
  await page.getByRole('switch', { name: 'Samopoczucie włączone', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Wyłączyć Samopoczucie?', exact: true })
  await dialog.getByRole('button', { name: 'Usuń wpisy i wyłącz', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('wymaga internetu')
  await context.setOffline(false)
  await dialog.getByRole('button', { name: 'Usuń wpisy i wyłącz', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect.poll(() => app.readWellbeing()).toEqual([])
  expect((await app.readProfile())?.wellbeingConsent).toBeNull()
  expect((await app.readProfile())?.healthDataConsent).toEqual(weightConsent)
  expect(await app.readBodyWeights()).toHaveLength(1)
  await nav(page, 'Start').click(); await expect(card(page)).toHaveCount(0)
})

test('Not today persists on this device for the day and returns on the next calendar day', async ({ app, page }) => {
  await app.open('/profile'); await grant(page); await nav(page, 'Start').click()
  await card(page).getByRole('button', { name: 'Nie dziś', exact: true }).click()
  await expect(card(page)).toHaveCount(0)
  await app.open('/'); await expect(card(page)).toHaveCount(0)
  await page.clock.setFixedTime(new Date('2026-11-15T09:00:00.000Z'))
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(card(page)).toBeVisible()
})

test('seeded personal norms, neutral chart data and wellbeing beside RPE for all sources and the previous plan run', async ({ app, page }) => {
  await app.open('/profile'); await grant(page)
  for (let offset = -32; offset <= 0; offset++) await app.seedWellbeing(entry(offset, offset >= -3 ? { sleep: 1 } : {}))
  await nav(page, 'Postęp').click()
  await expect(progress(page)).toContainText('Sen: gorzej niż zwykle (od 4 dni)')
  await expect(progress(page)).toContainText('Wypoczęcie: typowo dla Ciebie')
  await progress(page).getByText('Pokaż dane', { exact: true }).first().click()
  await expect(progress(page).getByRole('table').first().locator('tbody tr')).toHaveCount(28)
  await expect(progress(page).getByRole('img')).toHaveCount(4)
  await accessible(page)
  await app.setTheme('light'); await accessible(page)
  const first = workoutSession({ id: 'wellbeing-first', stepResults: [sessionStep()], workoutDate: '2026-11-10', startedAt: '2026-11-10T10:00:00.000Z', completedAt: '2026-11-10T11:00:00.000Z', rpe: 6, rpeRecordedAt: '2026-11-10T11:10:00.000Z' })
  const current = workoutSession({ id: 'wellbeing-current', stepResults: [sessionStep()], workoutDate: today, startedAt: '2026-11-14T10:00:00.000Z', completedAt: '2026-11-14T11:00:00.000Z', rpe: 8, rpeRecordedAt: '2026-11-14T11:10:00.000Z' })
  expect(workoutSessionDocumentSchema.safeParse({ ...current, schemaVersion: 1 }).success).toBe(true)
  await app.seedSession(first); await app.seedSession(current)
  await nav(page, 'Treningi').click()
  await page.getByRole('radio', { name: 'Historia', exact: true }).check()
  await page.locator(`a[href="/workout-sessions/${current.id}/feedback"]`).click()
  await expect(page.getByText('Dziś rano: sen gorzej niż zwykle', { exact: true })).toBeVisible()
  const previous = page.getByRole('region', { name: /Poprzednio ten plan/ })
  await expect(previous).toContainText('RPE: 6')
  await expect(previous.getByText('Tamtego dnia: typowo dla Ciebie', { exact: true })).toBeVisible()
  const { workoutPlanId: _id, workoutPlanNameSnapshot: _name, focusRatings: _focus, exerciseRatings: _ratings, ...timed } = current
  const quick: QuickTimerWorkoutSession = { ...timed, id: 'wellbeing-quick', source: 'quickTimer', completion: { completed: 1, planned: 1, unit: 'round' } }
  await app.seedSession(quick); await app.open(`/workout-sessions/${quick.id}/feedback`)
  await expect(page.getByText('Dziś rano: sen gorzej niż zwykle', { exact: true })).toBeVisible()
  const manual: ManualWorkoutSession = { id: 'wellbeing-manual', source: 'manual', status: 'completed', disciplineKey: 'boxing', category: 'bag', workoutDate: today, timezone: 'Europe/Warsaw', durationSeconds: 600,
    workSeconds: null, sparringSeconds: null, completion: null, note: null, rpe: 8, rpeRecordedAt: instant, sparring: [], focusRatings: [], createdAt: instant, updatedAt: instant }
  await app.seedSession(manual); await app.open(`/workout-sessions/${manual.id}/edit`)
  await expect(page.getByText('Dziś rano: sen gorzej niż zwykle', { exact: true })).toBeVisible()
  const history = await app.openHistory()
  await expect(history.getByText('Dziś rano: sen gorzej niż zwykle', { exact: true })).toHaveCount(3)
  await app.open(`/workout-sessions/${first.id}/feedback`)
  await expect(page.getByText('Dziś rano: typowo dla Ciebie', { exact: true })).toBeVisible()
})
