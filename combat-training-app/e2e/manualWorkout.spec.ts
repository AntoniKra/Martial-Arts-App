import AxeBuilder from '@axe-core/playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { Page, TestInfo } from '@playwright/test'
import { test, expect } from './fixtures'
import { workoutSession } from '../src/test/workoutSessionBuilders'
import { manualWorkoutSession } from '../src/test/manualWorkoutBuilder'
import { manualFocusRating } from '../src/test/manualWorkoutBuilder'
import type { FocusSkill } from '../src/domain/focus-skill/focusSkill.types'

const now = '2026-11-12T12:00:00.000Z'
const title = 'Trening spoza aplikacji', addLabel = '+ Dodaj trening spoza aplikacji'
const skill: FocusSkill = { id: 'guard', name: 'Powrót do gardy', criterion: 'Ręka wraca do brody.',
  createdAt: now, updatedAt: now, archivedAt: null,
  openCorrection: { problem: 'Opuszczam rękę.', fix: 'Dotykam brody.', sessionId: 'old', workoutDate: '2026-11-10' } }
const form = (page: Page) => page.getByRole('form', { name: title, exact: true })
const category = (page: Page) => form(page).getByRole('group', { name: 'Rodzaj treningu', exact: true })
const historyCard = (page: Page) => page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Trening poza aplikacją · Sparing', exact: true }) })
const summary = (page: Page) => page.getByRole('region', { name: 'Podsumowanie treningów', exact: true })
async function fill(page: Page, kind = 'Sparing') {
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
  await form(page).getByRole('radio', { name: 'Boks', exact: true }).check()
  await category(page).getByRole('radio', { name: new RegExp(`^${kind}`) }).check()
  await form(page).getByRole('radio', { name: '90 min', exact: true }).check()
  await form(page).getByRole('radio', { name: '7 Bardzo ciężko', exact: true }).check()
  if (kind === 'Sparing') {
    await form(page).getByRole('radio', { name: /^Twardy/ }).check()
    await form(page).getByRole('spinbutton', { name: 'Liczba rund (opcjonalnie)', exact: true }).fill('6')
  }
}
async function save(page: Page) { await form(page).getByRole('button', { name: 'Zapisz', exact: true }).click() }
async function capture(page: Page, info: TestInfo, name: string) {
  if (process.env.CAPTURE_SCREENSHOTS !== '1' || info.project.name !== 'phone') return
  const folder = path.resolve('docs/screenshots/issue-97')
  await mkdir(folder, { recursive: true })
  await page.evaluate(() => document.fonts.ready)
  const file = path.join(folder, `${name}-360x800.png`)
  await page.screenshot({ path: file })
  await info.attach(name, { path: file, contentType: 'image/png' })
}
test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(now)) })

test('adds sparring from home, shows manual cards, and counts toward summary and the category goal', async ({ app, page }) => {
  await app.open('/')
  await app.seedWeekPlan({ weekStart: '2026-11-09', createdAt: now, updatedAt: now, editedAfterWeekEnd: false,
    items: [{ id: 'sparring', kind: 'category', category: 'sparring' }] })
  await page.getByRole('link', { name: addLabel, exact: true }).click()
  await fill(page); await save(page)
  await expect(page).toHaveURL(/\/$/)
  const recent = page.getByRole('region', { name: 'Ostatnie sesje', exact: true })
  await expect(recent).toContainText('Trening poza aplikacją · Sparing')
  await expect(recent).toContainText('90 min')
  await expect(recent).not.toContainText('0/0')
  const history = await app.openHistory()
  await expect(historyCard(page)).toBeVisible()
  await expect(historyCard(page)).toContainText('RPE 7')
  await expect(historyCard(page).locator('[style*="width"]')).toHaveCount(0)
  await expect(history).not.toContainText('0/0')
  await app.open('/progress/week/2026-11-09')
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
  await expect(summary(page)).toContainText('Treningi: 1')
  await expect(summary(page)).toContainText('630 j.u.')
  await expect(summary(page).getByRole('definition').first()).toHaveText('90 min')
})

test('marks a four-day-old RPE in history and load details and returns to history', async ({ app, page }) => {
  await app.open('/workouts?tab=history')
  await page.getByRole('link', { name: addLabel, exact: true }).click()
  await fill(page)
  await form(page).getByLabel('Data', { exact: true }).fill('2026-11-08')
  await expect(form(page)).toContainText('Ten trening był 4 dni temu.')
  await save(page)
  await expect(page).toHaveURL(/\/workouts\?tab=history$/)
  await expect(historyCard(page).getByText('z pamięci', { exact: true })).toBeVisible()
  await app.open('/progress/week/2026-11-02')
  await summary(page).getByText('Szczegóły obciążenia', { exact: true }).click()
  await expect(summary(page).getByText('z pamięci', { exact: true })).toBeVisible()
})

test('warns about a plan duplicate, cancels without writing and explicitly saves separately', async ({ app, page }) => {
  await app.open('/workouts?tab=history')
  await app.seedSession(workoutSession({ id: 'plan-duplicate', workoutDate: '2026-11-12', category: 'sparring',
    workoutPlanNameSnapshot: 'Sparing z planu', durationSeconds: 600 }))
  await page.getByRole('link', { name: addLabel, exact: true }).click()
  await fill(page); await save(page)
  const dialog = page.getByRole('dialog', { name: 'Masz już trening z tego dnia', exact: true })
  await expect(dialog).toContainText('Masz już trening „Sparing z planu” z tego dnia. To osobny trening?')
  await dialog.getByRole('button', { name: 'Wróć do wpisu', exact: true }).click()
  expect((await app.readSessions()).length).toBe(1)
  await save(page)
  await dialog.getByRole('button', { name: 'Tak, zapisz osobno', exact: true }).click()
  await expect.poll(async () => (await app.readSessions()).length).toBe(2)
  expect((await app.readSessions()).find((entry) => entry.id === 'plan-duplicate')?.durationSeconds).toBe(600)
})

test('requires a place for mixed focus feedback, closes the correction and links the trend to editing', async ({ app, page }) => {
  await app.open('/workouts?tab=history'); await app.seedFocusSkill(skill)
  await page.getByRole('link', { name: addLabel, exact: true }).click()
  await fill(page, 'Mieszany')
  await form(page).getByRole('checkbox', { name: skill.name, exact: true }).check()
  const card = form(page).getByRole('article', { name: skill.name, exact: true })
  await card.getByRole('radio', { name: /^4 Zwykle/ }).check()
  await save(page)
  await expect(form(page).getByText('Wybierz, gdzie ćwiczyłeś.', { exact: true })).toBeVisible()
  expect(await app.readSessions()).toEqual([])
  await card.getByRole('combobox', { name: 'Gdzie ćwiczyłeś?', exact: true }).selectOption('sparring')
  await card.getByRole('radio', { name: 'Lepiej', exact: true }).check()
  await save(page)
  await expect.poll(async () => (await app.readFocusSkills())[0]?.openCorrection).toBeNull()
  const session = (await app.readSessions())[0]
  await app.open(`/progress/focus-skills/${skill.id}`)
  const row = page.getByRole('link').filter({ hasText: 'Trening poza aplikacją' })
  await expect(row).toContainText('4')
  await expect(row).toHaveAttribute('href', `/workout-sessions/${session.id}/edit`)
  await row.click()
  await expect(page.getByRole('heading', { name: 'Popraw trening spoza aplikacji', exact: true })).toBeVisible()
})

test('edits duration and RPE while timed entries remain unavailable for editing', async ({ app, page }) => {
  await app.open('/workouts?tab=history')
  await app.seedSession(manualWorkoutSession({ category: 'sparring', sparring: [{ blockId: null, intensity: 'hard', rounds: 6 }], rpeRecordedAt: '2026-11-11T12:00:00.000Z' }))
  await expect(historyCard(page)).toBeVisible()
  await historyCard(page).getByRole('link', { name: 'Popraw', exact: true }).click()
  await form(page).getByRole('radio', { name: '120 min', exact: true }).check()
  await form(page).getByRole('radio', { name: '5 Ciężko', exact: true }).check()
  await save(page)
  await expect(historyCard(page)).toContainText('120 min')
  await expect.poll(async () => (await app.readSessions())[0]?.rpe).toBe(5)
  const entry = (await app.readSessions())[0]
  expect(entry).toMatchObject({ durationSeconds: 7200, rpeRecordedAt: now, createdAt: now, timezone: 'Europe/Warsaw' })
  await app.seedSession(workoutSession({ id: 'timed', workoutDate: '2026-11-12', workoutPlanNameSnapshot: 'Plan bez edycji', durationSeconds: 60 }))
  const timedCard = page.getByRole('article').filter({ hasText: 'Plan bez edycji' })
  await expect(timedCard.getByRole('link', { name: 'Popraw', exact: true })).toHaveCount(0)
  await app.open('/workout-sessions/timed/edit')
  await expect(page.getByRole('heading', { name: 'Ten wpis można tylko usunąć.', exact: true })).toBeVisible()
})

test('saves a manual entry offline and confirms it on reconnect', async ({ app, page, context }) => {
  await app.open('/workouts?tab=history')
  await page.getByRole('link', { name: addLabel, exact: true }).click()
  await fill(page); await context.setOffline(true); await save(page)
  await expect(page).toHaveURL(/\/workouts\?tab=history$/)
  await expect(historyCard(page)).toContainText('Czeka na wysłanie')
  expect(await app.readSessions()).toEqual([])
  await context.setOffline(false)
  await expect.poll(async () => (await app.readSessions()).length).toBe(1)
  await expect(historyCard(page).getByText('Czeka na wysłanie', { exact: true })).toHaveCount(0)
})

test('guards unsaved changes and focuses the first invalid field', async ({ app, page }) => {
  await app.open('/workout-sessions/new')
  await save(page)
  await expect(form(page).getByRole('radio', { name: 'Boks', exact: true })).toBeFocused()
  await form(page).getByRole('radio', { name: 'Boks', exact: true }).check()
  await form(page).getByRole('button', { name: 'Anuluj', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Odrzucić zmiany?', exact: true })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Wróć do edycji', exact: true }).click()
  await expect(form(page)).toBeVisible()
  await form(page).getByRole('button', { name: 'Anuluj', exact: true }).click()
  await dialog.getByRole('button', { name: 'Odrzuć zmiany', exact: true }).click()
  await expect(page).toHaveURL(/\/workouts\?tab=history$/)
})

test('retains saved focus ratings when the skill section fails and still saves the other fields', async ({ app, page }) => {
  await app.open('/workouts?tab=history')
  const entry = manualWorkoutSession({ focusRatings: [manualFocusRating()] })
  await app.seedSession(entry)
  await app.seedFocusSkill({ ...skill, name: '' })
  await app.open(`/workout-sessions/${entry.id}/edit`)
  await expect(form(page).getByRole('alert')).toContainText('Nie udało się wczytać ćwiczeń celu.')
  await expect(form(page).getByRole('button', { name: 'Spróbuj ponownie', exact: true })).toBeVisible()
  await category(page).getByRole('radio', { name: /^Tarcze/ }).check()
  await form(page).getByRole('radio', { name: '120 min', exact: true }).check()
  await form(page).getByRole('button', { name: 'Spróbuj ponownie', exact: true }).click()
  await expect(form(page).getByRole('alert')).toContainText('Nie udało się wczytać ćwiczeń celu.')
  await expect(category(page).getByRole('radio', { name: /^Tarcze/ })).toBeChecked()
  await expect(form(page).getByRole('radio', { name: '120 min', exact: true })).toBeChecked()
  await save(page)
  await expect(page).toHaveURL(/\/workouts\?tab=history$/)
  await expect.poll(async () => (await app.readSessions())[0]?.durationSeconds).toBe(7200)
  expect((await app.readSessions())[0]).toMatchObject({ category: 'pads', focusRatings: entry.focusRatings, rpeRecordedAt: entry.rpeRecordedAt })
})

for (const theme of ['dark', 'light'] as const) {
  test(`accessible manual form and four requested screenshots in ${theme} theme`, async ({ app, page }, info) => {
    await app.open('/workouts?tab=history'); await app.setTheme(theme); await app.seedFocusSkill(skill)
    await app.seedSession(workoutSession({ id: 'duplicate', workoutDate: '2026-11-12', category: 'sparring', durationSeconds: 60 }))
    await page.getByRole('link', { name: addLabel, exact: true }).click()
    await fill(page)
    await page.getByRole('heading', { name: title, exact: true }).scrollIntoViewIfNeeded()
    await capture(page, info, `form-top-${theme}`)
    await form(page).getByRole('region', { name: 'Był sparing', exact: true }).scrollIntoViewIfNeeded()
    await capture(page, info, `sparring-focus-${theme}`)
    expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) =>
      impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await save(page)
    await expect(page.getByRole('dialog')).toBeVisible()
    await capture(page, info, `duplicate-${theme}`)
    await page.getByRole('button', { name: 'Tak, zapisz osobno', exact: true }).click()
    await expect(historyCard(page)).toBeVisible()
    await historyCard(page).scrollIntoViewIfNeeded()
    await capture(page, info, `history-${theme}`)
  })
}
