import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'
import type { Page } from '@playwright/test'
import { test, expect, openProfile, expandProfileSection } from './fixtures'
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
  await expandProfileSection(page, 'Samopoczucie')
  await page.getByRole('link', { name: 'Włącz Samopoczucie', exact: true }).click()
  const adult = page.getByRole('switch', { name: 'Mam ukończone 18 lat.', exact: true })
  const agreed = page.getByRole('switch', { name: 'Wyrażam wyraźną zgodę na przetwarzanie moich danych o samopoczuciu w opisanym celu.', exact: true })
  const enable = page.getByRole('button', { name: 'Włącz Samopoczucie', exact: true })
  await expect(adult).not.toBeChecked(); await expect(agreed).not.toBeChecked(); await expect(enable).toBeDisabled()
  await adult.check(); await expect(enable).toBeDisabled(); await agreed.check(); await enable.click()
  await expandProfileSection(page, 'Samopoczucie')
  await expect(page.getByRole('switch', { name: 'Samopoczucie włączone', exact: true })).toBeChecked()
  await expect(page.getByText('Czeka na wysłanie', { exact: true })).toHaveCount(0)
}
async function answer(page: Page, value = 3) {
  for (const question of Object.values(wellbeingQuestions)) {
    const slider = page.getByRole('slider', { name: question.question, exact: true })
    await slider.press('Home')
    for (let step = 1; step < value; step++) await slider.press('ArrowRight')
  }
}
async function accessible(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
}
test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(instant)) })

test.describe('cached startup', () => {
  test.use({ serviceWorkers: 'allow' })
  test('reopens offline with cached consent, allows Not today and saves the following day offline', async ({ app, page, context }) => {
    await app.open('/profile'); await grant(page); await nav(page, 'Start').click()
    await expect(card(page)).toBeVisible(); await app.prepareOffline()
    await context.setOffline(true)
    try {
      await app.open('/')
      await expect(card(page).getByRole('button', { name: 'Zapisz', exact: true })).toBeVisible()
      await card(page).getByRole('button', { name: 'Nie dziś', exact: true }).click()
      await app.open('/'); await expect(card(page)).toHaveCount(0)
      await page.clock.setFixedTime(new Date('2026-11-15T09:00:00.000Z'))
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await expect(card(page)).toBeVisible()
      await answer(page)
      await card(page).getByRole('button', { name: 'Zapisz', exact: true }).click()
      await expect(card(page)).toHaveCount(0)
      await expect(page.getByText('Samopoczucie: Czeka na wysłanie', { exact: true })).toBeVisible()
      await nav(page, 'Postęp').click()
      await page.getByRole('button', { name: /^Samopoczucie / }).click()
      await expect(progress(page).getByRole('alert')).toContainText('niepełne')
      await expect(progress(page).getByRole('img')).toHaveCount(0)
    } finally { await context.setOffline(false) }
    await expect.poll(() => app.readWellbeing()).toMatchObject([{ date: '2026-11-15', sleep: 3, energy: 3 }])
  })
})

test('separate consent, offline daily entry, progress, same-day edit and deletion on withdrawal', async ({ app, page, context }) => {
  await app.open()
  await expect(card(page)).toHaveCount(0)
  await nav(page, 'Postęp').click(); await expect(progress(page)).toHaveCount(0)
  await nav(page, 'Profil').click(); await grant(page)
  expect((await app.readProfile())?.healthDataConsent).toBeNull()
  await nav(page, 'Start').click(); await expect(card(page)).toBeVisible()
  await expect(card(page).getByRole('slider')).toHaveCount(4)
  for (const slider of await card(page).getByRole('slider').all()) {
    await expect(slider).toHaveAttribute('aria-valuetext', 'Nie wybrano odpowiedzi')
  }
  await card(page).getByRole('button', { name: 'Zapisz', exact: true }).click()
  await expect(card(page).getByRole('alert')).toContainText('Odpowiedz na wszystkie')
  await answer(page)
  await page.getByRole('textbox', { name: 'Coś nietypowego? (opcjonalnie)', exact: true }).fill('=1+1')
  await accessible(page)
  await context.setOffline(true)
  await card(page).getByRole('button', { name: 'Zapisz', exact: true }).click()
  await expect(card(page)).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Samopoczucie: Czeka na wysłanie' })).toBeVisible()
  await openProfile(page)
  await page.getByRole('button', { name: 'Wyloguj', exact: true }).click()
  const signOut = page.getByRole('dialog', { name: 'Wylogować się?', exact: true })
  await expect(signOut).toBeVisible()
  await signOut.getByRole('button', { name: 'Anuluj', exact: true }).click()
  await context.setOffline(false)
  await expect.poll(() => app.readWellbeing()).toMatchObject([{ date: today, sleep: 3, energy: 3, soreness: 3, stress: 3, note: '=1+1', questionsVersion: 1 }])
  await expect(page.getByText('Samopoczucie: Czeka na wysłanie', { exact: true })).toHaveCount(0)
  await nav(page, 'Postęp').click()
  await page.getByRole('button', { name: /^Samopoczucie / }).click()
  await expect(progress(page)).toContainText('Jeszcze 14 wpisów do Twojej normy')
  await expect(progress(page)).toContainText('Sen: 3 · przeciętna')
  await expect(progress(page)).toContainText('To nie jest ocena medyczna.')
  await accessible(page)
  await nav(page, 'Profil').click()
  await expandProfileSection(page, 'Samopoczucie')
  await page.getByRole('button', { name: 'Popraw dzisiejszy wpis', exact: true }).click()
  await answer(page, 4); await page.getByRole('button', { name: 'Zapisz', exact: true }).click()
  await expect.poll(() => app.readWellbeing()).toMatchObject([{ sleep: 4 }])
  const originalCreated = (await app.readWellbeing())[0] as WellbeingEntry
  expect(originalCreated.createdAt).toBe(instant)
  const csvDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Pobierz swoje dane', exact: true }).click()
  await page.getByRole('button', { name: 'Pobierz samopoczucie (CSV)', exact: true }).click()
  const csv = await csvDownload
  expect(csv.suggestedFilename()).toBe('combat-training-samopoczucie-2026-11-14.csv')
  expect(await readFile((await csv.path())!, 'utf8')).toContain(`${today};4;4;4;4;'=1+1;1;`)
  const jsonDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Pobierz wszystkie dane (JSON)', exact: true }).click()
  const json = JSON.parse(await readFile((await (await jsonDownload).path())!, 'utf8'))
  expect(json.collections.readiness).toHaveLength(1)
  // Enabling body weight after wellbeing must preserve both independent consents.
  await expandProfileSection(page, 'Masa ciała')
  await page.getByRole('link', { name: 'Włącz zapisywanie masy ciała', exact: true }).click()
  await page.getByRole('switch', { name: 'Mam ukończone 18 lat.', exact: true }).check()
  await page.getByRole('switch', { name: 'Zgadzam się na zapisywanie mojej masy ciała i kategorii wagowej na moim koncie.', exact: true }).check()
  await page.getByRole('button', { name: 'Włącz', exact: true }).click()
  await expandProfileSection(page, 'Masa ciała')
  await expandProfileSection(page, 'Samopoczucie')
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
  expect(await app.readWellbeing()).toEqual([])
})

for (const method of ['touch', 'keyboard'] as const) {
  test(`wellbeing sliders save the same values by ${method} and reopen in Profile`, async ({ app, page, context }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    await app.open('/profile'); await grant(page)
    const profile = await app.readProfile()
    await nav(page, 'Start').click()
    const form = card(page).getByRole('form', { name: 'Samopoczucie', exact: true })
    await expect(form.getByText('—', { exact: true })).toHaveCount(4)
    const values = { sleep: 1, energy: 4, soreness: 2, stress: 5 }
    const touch = method === 'touch' ? await context.newCDPSession(page) : null
    for (const field of ['sleep', 'energy', 'soreness', 'stress'] as const) {
      const question = wellbeingQuestions[field], value = values[field]
      const slider = form.getByRole('slider', { name: question.question, exact: true })
      await expect(slider).toHaveAttribute('aria-valuemin', '1')
      await expect(slider).toHaveAttribute('aria-valuemax', '5')
      await expect(slider).toHaveAttribute('aria-valuetext', 'Nie wybrano odpowiedzi')
      await expect(slider.locator(':scope > span')).toHaveCount(5)
      await slider.scrollIntoViewIfNeeded()
      const bounds = await slider.boundingBox()
      if (!bounds) throw new Error('Wellbeing slider is not visible')
      expect(bounds.height).toBeGreaterThanOrEqual(44)
      expect((bounds.width - 12) / 5).toBeGreaterThanOrEqual(44)
      if (touch) {
        const y = bounds.y + bounds.height / 2
        await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bounds.x + bounds.width * (value === 1 ? 0.9 : 0.1), y }] })
        await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: bounds.x + bounds.width * (value - 0.5) / 5, y }] })
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      } else {
        await slider.press('Home'); await slider.press('ArrowDown')
        await expect(slider).toHaveAttribute('aria-valuenow', '1')
        await slider.press('End'); await slider.press('ArrowUp')
        await expect(slider).toHaveAttribute('aria-valuenow', '5')
        await slider.press('Home')
        for (let step = 1; step < value; step++) await slider.press('ArrowRight')
        await expect(slider).toBeFocused()
      }
      await expect(slider).toHaveAttribute('aria-valuenow', String(value))
      await expect(slider).toHaveAttribute('aria-valuetext', question.options[value - 1])
      const selected = form.getByText(`${value} · ${question.options[value - 1]}`, { exact: true }).and(form.locator('p'))
      await expect(selected).toBeVisible()
      await expect(selected).toHaveCSS('white-space', 'nowrap')
      const colors = await slider.evaluate((element) => Array.from(element.children, (segment) => getComputedStyle(segment).backgroundColor))
      expect(colors).toHaveLength(5)
      await expect.poll(() => slider.evaluate((element, count) => Array.from(element.children).slice(0, count).map((segment) => getComputedStyle(segment).backgroundColor), value)).toEqual(Array<string>(value).fill(colors[0]))
      if (value < 5) expect(colors[value]).not.toBe(colors[0])
    }
    await touch?.detach()
    await form.getByRole('textbox').fill('Po spacerze')
    const saveBounds = await form.getByRole('button', { name: 'Zapisz', exact: true }).boundingBox()
    const skipBounds = await form.getByRole('button', { name: 'Nie dziś', exact: true }).boundingBox()
    if (!saveBounds || !skipBounds) throw new Error('Wellbeing actions are not visible')
    expect(saveBounds.y).toBe(skipBounds.y)
    for (const theme of ['dark', 'light'] as const) { await app.setTheme(theme); await accessible(page) }
    await form.getByRole('button', { name: 'Zapisz', exact: true }).click()
    await expect(card(page)).toHaveCount(0)
    await expect.poll(() => app.readWellbeing()).toMatchObject([{ ...values, date: today, note: 'Po spacerze', questionsVersion: 1 }])
    expect(await app.readProfile()).toEqual(profile)
    await nav(page, 'Profil').click(); await expandProfileSection(page, 'Samopoczucie')
    await page.getByRole('button', { name: 'Popraw dzisiejszy wpis', exact: true }).click()
    for (const field of ['sleep', 'energy', 'soreness', 'stress'] as const) {
      const question = wellbeingQuestions[field]
      await expect(page.getByRole('slider', { name: question.question, exact: true })).toHaveAttribute('aria-valuenow', String(values[field]))
      await expect(page.getByRole('slider', { name: question.question, exact: true })).toHaveAttribute('aria-valuetext', question.options[values[field] - 1])
    }
    await accessible(page)
    await page.getByRole('button', { name: 'Anuluj', exact: true }).click()
    await expect(page.getByRole('slider')).toHaveCount(0)
    await expect.poll(() => app.readWellbeing()).toMatchObject([{ ...values, note: 'Po spacerze' }])
  })
}

test('seeded personal norms, neutral chart data and wellbeing beside RPE for all sources and the previous plan run', async ({ app, page }) => {
  await app.open('/profile'); await grant(page)
  for (let offset = -32; offset <= 0; offset++) await app.seedWellbeing(entry(offset, offset >= -3 ? { sleep: 1 } : {}))
  await nav(page, 'Postęp').click()
  await page.getByRole('button', { name: /^Samopoczucie / }).click()
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
  await nav(page, 'Postęp').click()
  await page.getByRole('radio', { name: 'Historia', exact: true }).check()
  await page.getByRole('article').filter({ has: page.locator(`a[href="/workout-sessions/${current.id}/feedback"]`) }).locator('.disclosure-trigger').first().click()
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
