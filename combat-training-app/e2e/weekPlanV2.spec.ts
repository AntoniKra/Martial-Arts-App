import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'
import { generateScheduledWeek } from '../src/domain/week-plan/scheduledWeek'
import type { RecurringWeek, WeekActivity } from '../src/domain/week-plan/weekPlan.types'

test.use({ screenshot: 'off', trace: 'off', serviceWorkers: 'allow' })
const weekStart = '2026-11-16', instant = '2026-11-17T10:00:00Z'
const form = (page: Page) => page.getByRole('form', { name: 'Dodaj lub edytuj trening', exact: true })
const row = (page: Page, name: string, date: string) => page.getByRole('listitem', { name: `${name} ${date}`, exact: true })
async function save(page: Page) {
  await form(page).getByRole('button', { name: 'Zapisz', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}
async function hours(page: Page, start = '18:00', end = '19:30') {
  await form(page).getByLabel('Od', { exact: true }).fill(start)
  await form(page).getByLabel('Do', { exact: true }).fill(end)
}
test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(instant)) })

for (const theme of ['dark', 'light'] as const) test(`opens one bottom sheet, validates, traps focus and closes on save, Escape and Back in ${theme}`, async ({ app, page }) => {
  await app.open(`/progress/week/${weekStart}`); await app.setTheme(theme)
  const add = page.getByRole('button', { name: 'Dodaj trening: wtorek', exact: true })
  await add.click()
  const dialog = page.getByRole('dialog', { name: 'wtorek, 17 listopada', exact: true })
  await expect(dialog).toBeVisible()
  await expect(form(page)).toHaveCount(1)
  await expect(form(page).getByRole('switch')).not.toBeChecked()
  expect(await page.evaluate(() => document.querySelector('dialog[open]')?.contains(document.activeElement))).toBe(true)
  await expect(page.locator('html')).toHaveCSS('overflow', 'hidden')
  const bounds = await dialog.boundingBox()
  expect(bounds!.y + bounds!.height).toBeCloseTo(page.viewportSize()!.height, 0)
  await page.getByRole('button', { name: 'Zamknij', exact: true }).press('Shift+Tab')
  expect(await page.evaluate(() => document.querySelector('dialog[open]')?.contains(document.activeElement))).toBe(true)
  await form(page).getByRole('button', { name: 'Zapisz', exact: true }).click()
  await expect(form(page).getByRole('alert')).toContainText('Godzina końca')
  await hours(page, '19:30', '18:00')
  await form(page).getByRole('button', { name: 'Zapisz', exact: true }).click()
  await expect(form(page).getByRole('alert')).toBeVisible()
  await hours(page)
  expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0); await expect(add).toBeFocused()
  await add.click(); await page.goBack()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(`/progress/week/${weekStart}`)
  await add.click(); await hours(page); await save(page)
  await expect(row(page, 'Wtorek', '2026-11-17')).toContainText('Plan')
  await expect.poll(async () => (await app.readWeekPlans())[0]?.schedule?.length).toBe(1)
  expect(await app.readRecurringWeek()).toBeUndefined()
  await expect(page.getByText('Zapisano na urządzeniu.', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Podsumowanie tygodnia', exact: false })).toHaveAttribute('aria-expanded', 'false')
  await page.getByRole('button', { name: 'Podsumowanie tygodnia', exact: false }).click()
  await expect(page.getByRole('region', { name: 'Podsumowanie treningów', exact: true })).toBeVisible()
  await row(page, 'Wtorek', '2026-11-17').getByRole('button', { name: 'Opcje: Boks', exact: true }).click()
  await page.getByRole('button', { name: 'Edytuj', exact: true }).click()
  await expect(form(page).getByLabel('Od', { exact: true })).toHaveValue('18:00')
  await hours(page, '17:00', '18:30'); await save(page)
  await expect(row(page, 'Wtorek', '2026-11-17')).toContainText('17:00–18:30')
  await expect.poll(async () => (await app.readWeekPlans())[0]?.schedule?.length).toBe(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('repeats Sunday immediately, propagates edits and removals offline, and shows the result on Start', async ({ app, page, context }) => {
  await page.clock.setFixedTime(new Date('2026-11-22T12:00:00Z'))
  await app.open(`/progress/week/${weekStart}`)
  await page.getByRole('button', { name: 'Dodaj trening: niedziela', exact: true }).click()
  await form(page).getByRole('radio', { name: 'Muay Thai', exact: true }).check()
  await hours(page, '10:00', '12:00')
  await form(page).getByRole('switch').check(); await save(page)
  await expect.poll(async () => (await app.readRecurringWeek())?.items.length).toBe(1)
  await expect.poll(async () => (await app.readWeekPlans())[0]?.schedule?.[0]).toMatchObject({ kind: 'club', day: 6, disciplineKey: 'muay_thai' })
  await page.getByRole('button', { name: /^Stały tydzień/ }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Opcje: Muay Thai', exact: true }).click()
  await page.getByRole('button', { name: 'Edytuj', exact: true }).click()
  await expect(form(page).getByRole('switch')).toHaveCount(0)
  await hours(page, '11:00', '13:00')
  await context.setOffline(true); await save(page)
  await expect(page.getByText('Czeka na wysłanie', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '‹ Plan tygodnia', exact: true }).click()
  await expect(row(page, 'Niedziela', '2026-11-22')).toContainText('11:00–13:00')
  await context.setOffline(false)
  await expect.poll(async () => (await app.readWeekPlans())[0]?.schedule?.[0]).toMatchObject({ startTime: '11:00' })
  await expect.poll(async () => (await app.readRecurringWeek())?.items[0]).toMatchObject({ startTime: '11:00' })
  await page.getByRole('navigation', { name: 'Główna nawigacja', exact: true }).getByRole('link', { name: 'Start', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Dziś · Muay Thai · 11:00', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Plan tygodnia ›', exact: true }).click()
  await page.getByRole('button', { name: /^Stały tydzień/ }).click()
  await page.getByRole('button', { name: 'Opcje: Muay Thai', exact: true }).click()
  await page.getByRole('button', { name: 'Usuń', exact: true }).click()
  await expect.poll(async () => (await app.readRecurringWeek())?.items.length).toBe(0)
  await expect.poll(async () => (await app.readWeekPlans())[0]?.schedule?.length).toBe(0)
})

test('leaves past days, moved, omitted and week-only entries untouched when recurring entries change', async ({ app, page }) => {
  await app.open(`/progress/week/${weekStart}`)
  const template: RecurringWeek = { id: 'default', createdAt: instant, updatedAt: instant, items: [] }
  // Create through the UI so the persisted recurring IDs and snapshots are realistic.
  await page.getByRole('button', { name: /^Stały tydzień/ }).click()
  for (const day of ['poniedziałek', 'wtorek', 'czwartek']) {
    await page.getByRole('button', { name: `Dodaj trening: ${day}`, exact: true }).click(); await hours(page); await save(page)
    await expect.poll(async () => (await app.readRecurringWeek())?.items.length).toBe(template.items.length + 1)
    template.items = (await app.readRecurringWeek())!.items
  }
  // Seed the old week generation, including the past Monday occurrence.
  const generated = generateScheduledWeek(weekStart, template, new Date(instant))
  const oneOff: WeekActivity = { id: 'one-off', kind: 'own', day: null, category: 'bag', workoutPlanId: null, planNameSnapshot: null }
  generated.schedule!.push({ ...oneOff, omitted: false })
  await app.seedWeekPlan(generated)
  await page.getByRole('button', { name: '‹ Plan tygodnia', exact: true }).click()
  const tuesday = row(page, 'Wtorek', '2026-11-17'), thursday = row(page, 'Czwartek', '2026-11-19')
  await tuesday.getByRole('button', { name: 'Opcje: Boks', exact: true }).click()
  await tuesday.getByRole('combobox', { name: 'Przenieś na…', exact: true }).selectOption('4')
  await expect(row(page, 'Piątek', '2026-11-20')).toContainText('Boks')
  await thursday.getByRole('button', { name: 'Opcje: Boks', exact: true }).click()
  await thursday.getByRole('button', { name: 'Nie byłem', exact: true }).click()
  await expect(thursday).toContainText('– Nie byłem')
  await expect.poll(async () => (await app.readWeekPlans())[0]?.schedule?.some((item) => item.omitted)).toBe(true)
  const before = (await app.readWeekPlans())[0].schedule
  await page.getByRole('button', { name: /^Stały tydzień/ }).click()
  for (const day of ['Poniedziałek', 'Wtorek', 'Czwartek']) {
    const dayRow = page.getByRole('listitem', { name: day, exact: true })
    await dayRow.getByRole('button', { name: 'Opcje: Boks', exact: true }).click()
    await dayRow.getByRole('button', { name: 'Usuń', exact: true }).click()
    await expect(dayRow.getByText('Boks', { exact: true })).toHaveCount(0)
  }
  await expect.poll(async () => (await app.readRecurringWeek())?.items.length).toBe(0)
  await expect.poll(async () => (await app.readWeekPlans())[0]?.schedule).toEqual(before)
})

test('repeats from a future displayed week in one offline save including the current week', async ({ app, page, context }) => {
  await app.open('/progress/week/2026-11-23')
  await page.getByRole('button', { name: 'Dodaj trening: niedziela', exact: true }).click()
  await hours(page, '10:00', '12:00')
  await form(page).getByRole('switch').check()
  await context.setOffline(true)
  await save(page)
  await expect(row(page, 'Niedziela', '2026-11-29')).toContainText('Boks')
  await expect(page.getByText('Czeka na wysłanie', { exact: true })).toBeVisible()
  await context.setOffline(false)
  await expect.poll(async () => (await app.readRecurringWeek())?.items.length).toBe(1)
  await expect.poll(async () => (await app.readWeekPlans()).map((plan) => [plan.weekStart, plan.schedule?.length])).toEqual([['2026-11-16', 1], ['2026-11-23', 1]])
  await page.getByRole('link', { name: 'Poprzedni tydzień', exact: true }).click()
  await expect(row(page, 'Niedziela', '2026-11-22')).toContainText('Boks')
})

test('review regression: repeating an edited occurrence updates the same recurring ID without duplicates', async ({ app, page }) => {
  await app.open(`/progress/week/${weekStart}`)
  await page.getByRole('button', { name: 'Dodaj trening: wtorek', exact: true }).click()
  await hours(page); await form(page).getByRole('switch').check(); await save(page)
  await expect.poll(async () => (await app.readRecurringWeek())?.items.length).toBe(1)
  const id = (await app.readRecurringWeek())!.items[0].id
  for (const start of ['17:00', '16:00']) {
    await page.getByRole('button', { name: 'Opcje: Boks', exact: true }).click()
    await page.getByRole('button', { name: 'Edytuj', exact: true }).click()
    await hours(page, start); await form(page).getByRole('switch').check(); await save(page)
    await expect.poll(async () => (await app.readRecurringWeek())?.items).toEqual([
      expect.objectContaining({ id, startTime: start }),
    ])
    await expect.poll(async () => (await app.readWeekPlans()).find((week) => week.weekStart === weekStart)?.schedule).toEqual([
      expect.objectContaining({ id: `${weekStart}:${id}`, startTime: start }),
    ])
  }
})

test('review regression: a future repeating occurrence receives edits and deletion when its week becomes current', async ({ app, page }) => {
  const future = '2026-11-23'
  await app.open(`/progress/week/${future}`)
  await page.getByRole('button', { name: 'Dodaj trening: piątek', exact: true }).click()
  await hours(page); await form(page).getByRole('switch').check(); await save(page)
  await expect.poll(async () => (await app.readRecurringWeek())?.items.length).toBe(1)
  const id = (await app.readRecurringWeek())!.items[0].id
  await expect.poll(async () => (await app.readWeekPlans()).find((week) => week.weekStart === future)?.schedule?.[0]?.id).toBe(`${future}:${id}`)
  await page.clock.setFixedTime(new Date('2026-11-24T10:00:00Z'))
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(page.getByText('ten tydzień', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: /^Stały tydzień/ }).click()
  await page.getByRole('button', { name: 'Opcje: Boks', exact: true }).click()
  await page.getByRole('button', { name: 'Edytuj', exact: true }).click()
  await hours(page, '17:00'); await save(page)
  await expect.poll(async () => (await app.readWeekPlans()).find((week) => week.weekStart === future)?.schedule?.[0]).toMatchObject({ startTime: '17:00' })
  await page.getByRole('button', { name: 'Usuń', exact: true }).click()
  await expect.poll(async () => (await app.readRecurringWeek())?.items.length).toBe(0)
  await expect.poll(async () => (await app.readWeekPlans()).find((week) => week.weekStart === future)?.schedule).toEqual([])
})
