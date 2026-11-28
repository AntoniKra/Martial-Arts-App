import { selectRpe } from './rpeSlider'
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
const title = 'Trening spoza aplikacji', addLabel = 'Dodaj trening spoza aplikacji'
const skill: FocusSkill = { id: 'guard', name: 'Powrót do gardy', criterion: 'Ręka wraca do brody.',
  createdAt: now, updatedAt: now, archivedAt: null,
  openCorrection: { problem: 'Opuszczam rękę.', fix: 'Dotykam brody.', sessionId: 'old', workoutDate: '2026-11-10' } }
const form = (page: Page) => page.getByRole('form', { name: title, exact: true })
const category = (page: Page) => form(page).getByRole('group', { name: 'Części zajęć', exact: true })
const historyCard = (page: Page) => page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Trening poza aplikacją · Sparing', exact: true }) })
const summary = (page: Page) => page.getByRole('region', { name: 'Podsumowanie treningów', exact: true })
async function fill(page: Page, kind = 'Sparing') {
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
  await form(page).getByRole('radio', { name: 'Boks', exact: true }).check()
  await category(page).getByRole('checkbox', { name: new RegExp(`^${kind}`) }).check()
  await form(page).getByRole('radio', { name: '90 min', exact: true }).check()
  await selectRpe(form(page), 7)
  if (kind === 'Sparing') {
    await form(page).getByRole('radio', { name: /^Twardy/ }).check()
    await form(page).getByRole('spinbutton', { name: 'Liczba rund (opcjonalnie)', exact: true }).fill('6')
  }
}
async function save(page: Page) { await form(page).getByRole('button', { name: 'Zapisz', exact: true }).click() }
async function capture(page: Page, info: TestInfo, name: string) {
  if (process.env.CAPTURE_SCREENSHOTS !== '1' || info.project.name !== 'phone') return
  const folder = path.dirname(info.outputPath(`${name}-360x800.png`))
  await mkdir(folder, { recursive: true })
  await page.evaluate(() => document.fonts.ready)
  const file = path.join(folder, `${name}-360x800.png`)
  await page.screenshot({ path: file })
  await info.attach(name, { path: file, contentType: 'image/png' })
}
test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(now)) })

for (const [date, weekStart, minutes] of [
  ['2026-03-29', '2026-03-23', '60'], ['2026-10-25', '2026-10-19', '180'],
]) {
  test(`prefills Warsaw club minutes across the clock change on ${date}`, async ({ app, page }) => {
    const instant = `${date}T10:00:00.000Z`
    await page.clock.setFixedTime(new Date(instant))
    await app.open(`/progress/week/${weekStart}`)
    await app.seedWeekPlan({ weekStart, items: [], schedule: [{ id: 'sunday-club', kind: 'club', day: 6,
      disciplineKey: 'boxing', startTime: '01:30', endTime: '03:30', parts: ['technique'], clubName: null, omitted: false }],
      targetCount: 1, createdAt: instant, updatedAt: instant, editedAfterWeekEnd: false })
    await page.getByRole('button', { name: 'Opcje: Boks', exact: true }).click()
    await page.getByRole('link', { name: 'Wpisz trening po zajęciach', exact: true }).click()
    await expect(form(page).getByLabel('Data', { exact: true })).toHaveValue(date)
    if (minutes === '60') await expect(form(page).getByRole('radio', { name: '60 min', exact: true })).toBeChecked()
    else await expect(form(page).getByRole('spinbutton', { name: 'Czas w minutach', exact: true })).toHaveValue(minutes)
  })
}

test('saves three club parts with sparring, custom minutes and one session load', async ({ app, page }, info) => {
  await app.open('/')
  await app.seedWeekPlan({ weekStart: '2026-11-09', createdAt: now, updatedAt: now, editedAfterWeekEnd: false,
    items: [{ id: 'pads', kind: 'category', category: 'pads' }] })
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  await page.getByRole('link', { name: /^Trening w klubie/ }).click()
  await expect(category(page).getByRole('checkbox', { checked: true })).toHaveCount(0)
  await expect(form(page).getByRole('slider', { name: 'RPE od 0 do 10' })).toHaveAttribute('aria-valuetext', 'Nie wybrano RPE')
  await form(page).getByRole('radio', { name: 'Kickboxing', exact: true }).check()
  for (const part of ['Technika', 'Tarcze', 'Sparing']) await category(page).getByRole('checkbox', { name: new RegExp(`^${part}`) }).check()
  await expect(form(page).getByRole('region', { name: 'Szczegóły sparingu' })).toBeFocused()
  await expect(form(page).getByRole('status')).toContainText('Otwarto szczegóły sparingu')
  await form(page).getByRole('radio', { name: /^Techniczny/ }).check()
  await form(page).getByRole('spinbutton', { name: 'Liczba rund (opcjonalnie)', exact: true }).fill('4')
  const otherBox = await form(page).getByRole('radio', { name: 'Inny', exact: true }).locator('..').boundingBox()
  const otherDocumentY = (otherBox?.y ?? 0) + await page.evaluate(() => scrollY)
  await form(page).getByRole('radio', { name: 'Inny', exact: true }).click()
  const minutes = form(page).getByRole('spinbutton', { name: 'Czas w minutach', exact: true })
  await expect(minutes).toBeFocused(); await expect(minutes).toHaveAttribute('inputmode', 'numeric')
  const customBox = await minutes.boundingBox()
  expect(customBox?.x).toBe(otherBox?.x)
  expect(customBox?.width).toBe(otherBox?.width)
  expect((customBox?.y ?? 0) + await page.evaluate(() => scrollY)).toBe(otherDocumentY)
  await expect(form(page).getByRole('radio', { name: 'Inny', exact: true })).toHaveCount(0)
  await minutes.fill('75')
  await minutes.scrollIntoViewIfNeeded(); await capture(page, info, 'parts-custom-minutes')
  await selectRpe(form(page), 6)
  await expect(form(page).getByText('Między ciężko a bardzo ciężko', { exact: true })).toBeVisible()
  await form(page).getByRole('button', { name: 'Wczoraj', exact: true }).click()
  await expect(form(page).getByLabel('Data', { exact: true })).toHaveValue('2026-11-11')
  await form(page).getByRole('button', { name: 'Dziś', exact: true }).click()
  await form(page).getByPlaceholder('Czego się uczyłeś? Co poprawiał trener?').fill('Powrót ręki do gardy.')
  await save(page)
  await expect.poll(async () => (await app.readSessions()).length).toBe(1)
  expect((await app.readSessions())[0]).toMatchObject({ schemaVersion: 2, parts: ['technique', 'pads', 'sparring'],
    category: 'mixed', durationSeconds: 4500, rpe: 6, createdAt: now, sparring: [{ blockId: null, intensity: 'technical', rounds: 4 }] })
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
  await page.getByRole('link', { name: 'Postęp', exact: true }).click()
  await page.getByRole('button', { name: /^Sparing .*4 tyg/ }).click()
  const stats = page.getByRole('region', { name: 'Statystyki', exact: true })
  await stats.getByRole('button').first().click()
  await expect(stats).toContainText('Tarcze: jedne zajęcia')
  await expect(stats).toContainText('Nie dzielimy czasu zajęć z kilkoma częściami')
  await expect(stats).toContainText('1 h 15 min')
  await page.getByRole('link', { name: 'Plan tygodnia ›', exact: true }).click()
  await page.getByRole('button', { name: /^Podsumowanie tygodnia/ }).click()
  await expect(summary(page)).toContainText('450 j.u.')
})

test('uses only previous discipline, duration and parts with badges until each field changes', async ({ app, page }, info) => {
  await app.open('/progress?tab=history')
  await app.seedSession(manualWorkoutSession({ category: 'mixed', disciplineKey: 'kickboxing', parts: ['technique', 'pads', 'sparring'],
    rpe: 9, sparring: [{ blockId: null, intensity: 'hard', rounds: 8 }], note: 'Praca na dystansie.' }))
  await expect(page.getByRole('heading', { name: 'Trening poza aplikacją · Technika, Tarcze, Sparing', exact: true })).toBeVisible()
  await page.getByRole('link', { name: addLabel, exact: true }).click()
  await expect(form(page)).toContainText('Jak ostatnio: Kickboxing · 90 min · technika, tarcze, sparing')
  await expect(category(page).getByRole('checkbox', { checked: true })).toHaveCount(0)
  await form(page).getByRole('button', { name: 'Użyj', exact: true }).click()
  await expect(form(page).getByText('jak ostatnio', { exact: true })).toHaveCount(3)
  await expect(category(page).getByRole('checkbox', { checked: true })).toHaveCount(3)
  await expect(form(page).getByRole('radio', { name: '90 min', exact: true })).toBeChecked()
  await expect(form(page).getByRole('radio', { name: 'Kickboxing', exact: true })).toBeChecked()
  await expect(form(page).getByRole('slider', { name: 'RPE od 0 do 10' })).toHaveAttribute('aria-valuetext', 'Nie wybrano RPE')
  const sparring = form(page).getByRole('region', { name: 'Szczegóły sparingu' })
  await expect(sparring.getByRole('radio', { checked: true })).toHaveCount(0)
  await expect(sparring.getByRole('spinbutton')).toHaveValue('')
  await expect(form(page).getByPlaceholder('Czego się uczyłeś? Co poprawiał trener?')).toHaveValue('')
  await form(page).getByRole('button', { name: 'Użyj', exact: true }).scrollIntoViewIfNeeded()
  await capture(page, info, 'parts-use-previous')
  await form(page).getByRole('radio', { name: 'Boks', exact: true }).check()
  await expect(form(page).getByText('jak ostatnio', { exact: true })).toHaveCount(2)
  await form(page).getByRole('radio', { name: '60 min', exact: true }).check()
  await expect(form(page).getByText('jak ostatnio', { exact: true })).toHaveCount(1)
  await category(page).getByRole('checkbox', { name: /^Sparing/ }).uncheck()
  await expect(form(page).getByText('jak ostatnio', { exact: true })).toHaveCount(0)
  await form(page).getByRole('group', { name: 'Wcześniejsze notatki', exact: true }).getByRole('button', { name: 'Praca na dystansie.', exact: true }).click()
  await expect(form(page).getByPlaceholder('Czego się uczyłeś? Co poprawiał trener?')).toHaveValue('Praca na dystansie.')
})

test('clears sparring details on deselection and preserves untouched legacy mixed history', async ({ app, page }) => {
  await app.open('/progress?tab=history')
  await app.seedSession(manualWorkoutSession({ category: 'mixed' }))
  const oldCard = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Trening poza aplikacją · Mieszany', exact: true }) })
  await expect(oldCard).toBeVisible()
  await oldCard.getByRole('button', { name: /Szczegóły wpisu/ }).first().click()
  await oldCard.getByRole('link', { name: 'Popraw', exact: true }).click()
  await expect(form(page)).toContainText('Ten wpis był zapisany jako „Mieszany”. Zaznacz, co było na zajęciach.')
  expect((await app.readSessions())[0]).toMatchObject({ schemaVersion: 1, category: 'mixed' })
  expect((await app.readSessions())[0]).not.toHaveProperty('parts')
  await category(page).getByRole('checkbox', { name: /^Sparing/ }).check()
  await form(page).getByRole('radio', { name: /^Twardy/ }).check()
  await form(page).getByRole('spinbutton', { name: 'Liczba rund (opcjonalnie)' }).fill('6')
  await category(page).getByRole('checkbox', { name: /^Sparing/ }).uncheck()
  await expect(form(page).getByRole('region', { name: 'Szczegóły sparingu' })).toHaveCount(0)
  await expect(form(page).getByRole('status')).toContainText('Usunięto szczegóły sparingu')
  await category(page).getByRole('checkbox', { name: /^Sparing/ }).check()
  await expect(form(page).getByRole('region', { name: 'Szczegóły sparingu' }).getByRole('radio', { checked: true })).toHaveCount(0)
  await expect(form(page).getByRole('spinbutton', { name: 'Liczba rund (opcjonalnie)' })).toHaveValue('')
})

test('requires confirmed parts for legacy mixed sparring and preserves saved focus places until explicitly changed', async ({ app, page }, info) => {
  await app.open('/progress?tab=history')
  await app.seedFocusSkill({ ...skill, openCorrection: null })
  const rating = manualFocusRating({ skillNameSnapshot: skill.name, criterionSnapshot: skill.criterion, blockType: 'pads' })
  const original = manualWorkoutSession({ category: 'mixed', note: 'Pierwotna notatka.', focusRatings: [rating],
    sparring: [{ blockId: null, intensity: 'hard', rounds: 6 }] })
  await app.seedSession(original)
  const oldCard = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Trening poza aplikacją · Mieszany', exact: true }) })
  await oldCard.getByRole('button', { name: /Szczegóły wpisu/ }).first().click()
  await oldCard.getByRole('link', { name: 'Popraw', exact: true }).click()
  await expect(category(page).getByRole('checkbox', { checked: true })).toHaveCount(0)
  await expect(form(page)).toContainText('Ten wpis był zapisany jako „Mieszany”. Zaznacz, co było na zajęciach.')
  const focusCard = form(page).getByRole('article', { name: skill.name, exact: true })
  const place = focusCard.getByRole('combobox', { name: 'Gdzie ćwiczyłeś?', exact: true })
  await expect(place).toHaveValue('pads')
  await form(page).getByPlaceholder('Czego się uczyłeś? Co poprawiał trener?').fill('Poprawiona notatka.')
  await save(page)
  await expect(form(page).getByRole('alert')).toContainText('Wybierz co najmniej jedną część zajęć')
  expect((await app.readSessions())[0]).toMatchObject({ schemaVersion: 1, category: 'mixed', note: original.note, focusRatings: [rating] })
  await category(page).scrollIntoViewIfNeeded(); await capture(page, info, 'legacy-mixed-choice-required')
  await category(page).getByRole('checkbox', { name: /^Sparing/ }).check()
  await expect(place).toHaveValue('pads')
  await expect(form(page).getByRole('radio', { name: /^Twardy/ })).toBeChecked()
  await expect(form(page).getByRole('spinbutton', { name: 'Liczba rund (opcjonalnie)' })).toHaveValue('6')
  await save(page)
  await expect(page).toHaveURL(/\/progress\?tab=history$/)
  await expect.poll(async () => (await app.readSessions())[0]?.note).toBe('Poprawiona notatka.')
  expect((await app.readSessions())[0]).toMatchObject({ schemaVersion: 2, parts: ['sparring'], category: 'sparring', focusRatings: [rating],
    durationSeconds: 5400, createdAt: original.createdAt, rpeRecordedAt: original.rpeRecordedAt })
  await historyCard(page).getByRole('button', { name: /Szczegóły wpisu/ }).first().click()
  await historyCard(page).getByRole('link', { name: 'Popraw', exact: true }).click()
  await expect(place).toHaveValue('pads')
  await place.selectOption('bag')
  await save(page)
  await expect.poll(async () => {
    const updated = (await app.readSessions())[0]
    return updated?.source === 'manual' ? updated.focusRatings[0]?.blockType : null
  }).toBe('bag')
})

test('adds sparring from home, shows manual cards, and counts toward summary and the category goal', async ({ app, page }) => {
  await app.open('/')
  await app.seedWeekPlan({ weekStart: '2026-11-09', createdAt: now, updatedAt: now, editedAfterWeekEnd: false,
    items: [{ id: 'sparring', kind: 'category', category: 'sparring' }] })
  // The REST seed finishes before the mounted Firestore listener receives it.
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  await page.getByRole('link', { name: /^Trening w klubie/ }).click()
  await fill(page); await save(page)
  await expect(page).toHaveURL(/\/$/)
  const recent = page.getByRole('region', { name: 'Ostatnia sesja', exact: true })
  await expect(recent).toContainText('Trening poza aplikacją · Sparing')
  await expect(recent).toContainText('90 min')
  await expect(recent).not.toContainText('0/0')
  // Observe both the stored entry and this client's acknowledgement before the summary.
  await expect.poll(async () => (await app.readSessions()).length).toBe(1)
  await expect(page.getByText('Czeka na wysłanie', { exact: true })).toHaveCount(0)
  // Follow the user journey without restarting the Firestore client. A hard
  // navigation discards collection completeness and races the old primary lease.
  await page.getByRole('link', { name: 'Postęp', exact: true }).click()
  await page.getByRole('radio', { name: 'Historia', exact: true }).check()
  const history = page.getByRole('region', { name: 'Historia treningów', exact: true })
  await expect(historyCard(page)).toBeVisible()
  await expect(historyCard(page)).toContainText('RPE 7')
  await expect(historyCard(page).locator('[style*="width"]')).toHaveCount(0)
  await expect(history).not.toContainText('0/0')
  await page.getByRole('link', { name: 'Postęp', exact: true }).click()
  await page.getByRole('link', { name: 'Plan tygodnia ›', exact: true }).click()
  await page.getByRole('button', { name: /^Podsumowanie tygodnia/ }).click()
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
  await expect(summary(page)).toContainText('Treningi: 1')
  await expect(summary(page)).toContainText('630 j.u.')
  await expect(summary(page).getByRole('definition').first()).toHaveText('90 min')
})

test('marks a four-day-old RPE in history and load details and returns to history', async ({ app, page }) => {
  await app.open('/progress?tab=history')
  await page.getByRole('link', { name: addLabel, exact: true }).click()
  await fill(page)
  await form(page).getByLabel('Data', { exact: true }).fill('2026-11-08')
  await expect(form(page)).toContainText('Ten trening był 4 dni temu.')
  await save(page)
  await expect(page).toHaveURL(/\/progress\?tab=history$/)
  await historyCard(page).getByRole('button', { name: /Szczegóły wpisu/ }).first().click()
  await expect(historyCard(page).getByText('z pamięci', { exact: true })).toBeVisible()
  // Reload only after the server acknowledged the entry: an immediate reload can drop the local write.
  await expect.poll(async () => (await app.readSessions()).length).toBe(1)
  await expect(page.getByText('Czeka na wysłanie', { exact: true })).toHaveCount(0)
  await app.open('/progress/week/2026-11-02')
  await page.getByRole('button', { name: /^Podsumowanie tygodnia/ }).click()
  await summary(page).getByText('Szczegóły obciążenia', { exact: true }).click()
  await expect(summary(page).getByText('z pamięci', { exact: true })).toBeVisible()
})

test('warns about a plan duplicate, cancels without writing and explicitly saves separately', async ({ app, page }) => {
  await app.open('/progress?tab=history')
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
  await app.open('/progress?tab=history'); await app.seedFocusSkill(skill)
  await page.getByRole('link', { name: addLabel, exact: true }).click()
  await fill(page, 'Technika')
  await category(page).getByRole('checkbox', { name: /^Tarcze/ }).check()
  await form(page).getByRole('checkbox', { name: skill.name, exact: true }).check()
  const card = form(page).getByRole('article', { name: skill.name, exact: true })
  const assessment = card.getByRole('radio', { name: /^4 Zwykle/ })
  await assessment.check()
  await expect(assessment).toBeChecked()
  await expect(card.getByRole('button', { name: /Zmień$/ })).toHaveCount(0)
  await save(page)
  await expect(form(page).getByText('Wybierz, gdzie ćwiczyłeś.', { exact: true })).toBeVisible()
  await expect(assessment).toBeVisible()
  expect(await app.readSessions()).toEqual([])
  await card.getByRole('combobox', { name: 'Gdzie ćwiczyłeś?', exact: true }).selectOption('sparring')
  await card.getByRole('radio', { name: 'Rzadziej', exact: true }).check()
  await save(page)
  await expect.poll(async () => (await app.readFocusSkills())[0]?.openCorrection).toBeNull()
  const session = (await app.readSessions())[0]
  await app.open(`/progress/focus-skills/${skill.id}`)
  const row = page.getByRole('link').filter({ hasText: 'Trening poza aplikacją' })
  await expect(row).toContainText('4')
  await expect(row).toHaveAttribute('href', `/workout-sessions/${session.id}/edit`)
  await row.click()
  await expect(page.getByRole('heading', { name: 'Popraw trening spoza aplikacji', exact: true })).toBeVisible()
  await expect(assessment).toBeChecked()
})

test('edits duration and RPE while timed entries remain unavailable for editing', async ({ app, page }) => {
  await app.open('/progress?tab=history')
  await app.seedSession(manualWorkoutSession({ category: 'sparring', sparring: [{ blockId: null, intensity: 'hard', rounds: 6 }], rpeRecordedAt: '2026-11-11T12:00:00.000Z' }))
  await expect(historyCard(page)).toBeVisible()
  await historyCard(page).getByRole('button', { name: /Szczegóły wpisu/ }).first().click()
  await historyCard(page).getByRole('link', { name: 'Popraw', exact: true }).click()
  await form(page).getByRole('radio', { name: '120 min', exact: true }).check()
  await selectRpe(form(page), 5)
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
  await app.open('/progress?tab=history')
  await page.getByRole('link', { name: addLabel, exact: true }).click()
  await fill(page); await context.setOffline(true); await save(page)
  await expect(page).toHaveURL(/\/progress\?tab=history$/)
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
  await expect(page).toHaveURL(/\/progress\?tab=history$/)
})

test('retains saved focus ratings when the skill section fails and still saves the other fields', async ({ app, page }) => {
  await app.open('/progress?tab=history')
  const entry = manualWorkoutSession({ focusRatings: [manualFocusRating()] })
  await app.seedSession(entry)
  const savedCard = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Trening poza aplikacją · Worek', exact: true }) })
  await savedCard.getByRole('button', { name: /Szczegóły wpisu/ }).first().click()
  await savedCard.getByRole('link', { name: 'Popraw', exact: true }).click()
  await expect(form(page)).toBeVisible()
  // Seed the invalid document on the mounted listener; a reload can reuse a stale cache lease.
  await app.seedFocusSkill({ ...skill, name: '' })
  await expect(form(page).getByRole('alert')).toContainText('Nie udało się wczytać elementów do poprawy.')
  await expect(form(page).getByRole('button', { name: 'Spróbuj ponownie', exact: true })).toBeVisible()
  await category(page).getByRole('checkbox', { name: /^Worek/ }).uncheck()
  await category(page).getByRole('checkbox', { name: /^Tarcze/ }).check()
  await form(page).getByRole('radio', { name: '120 min', exact: true }).check()
  await form(page).getByRole('button', { name: 'Spróbuj ponownie', exact: true }).click()
  await expect(form(page).getByRole('alert')).toContainText('Nie udało się wczytać elementów do poprawy.')
  await expect(category(page).getByRole('checkbox', { name: /^Tarcze/ })).toBeChecked()
  await expect(form(page).getByRole('radio', { name: '120 min', exact: true })).toBeChecked()
  await save(page)
  await expect(page).toHaveURL(/\/progress\?tab=history$/)
  await expect.poll(async () => (await app.readSessions())[0]?.durationSeconds).toBe(7200)
  expect((await app.readSessions())[0]).toMatchObject({ category: 'pads', focusRatings: entry.focusRatings, rpeRecordedAt: entry.rpeRecordedAt })
})

for (const theme of ['dark', 'light'] as const) {
  test(`accessible manual form and four requested screenshots in ${theme} theme`, async ({ app, page }, info) => {
    await app.open('/progress?tab=history'); await app.setTheme(theme); await app.seedFocusSkill(skill)
    await app.seedSession(workoutSession({ id: 'duplicate', workoutDate: '2026-11-12', category: 'sparring', durationSeconds: 60 }))
    await page.getByRole('link', { name: addLabel, exact: true }).click()
    await fill(page)
    await page.getByRole('heading', { name: title, exact: true }).scrollIntoViewIfNeeded()
    await capture(page, info, `form-top-${theme}`)
    await form(page).getByRole('region', { name: 'Szczegóły sparingu', exact: true }).scrollIntoViewIfNeeded()
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
