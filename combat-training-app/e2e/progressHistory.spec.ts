import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'
import { manualWorkoutSession } from '../src/test/manualWorkoutBuilder'
import { shiftCalendarDate } from '../src/domain/week-plan/weekCalendar'

const instant = '2026-11-18T12:00:00.000Z', current = '2026-11-16'
test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(instant)) })

test('shows progress tiles, expands five to twelve weeks, and opens the selected journal week', async ({ app, page }) => {
  await app.open('/progress')
  for (const offset of [-77, -28, -21, -14, -7, 0]) {
    await app.seedSession(manualWorkoutSession({ id: `week${offset}`, workoutDate: shiftCalendarDate(current, offset),
      durationSeconds: 3600, rpe: 5, sparring: [], category: 'bag' }))
  }
  await app.seedWeekPlan({ weekStart: current, items: [], schedule: [], targetCount: 4, createdAt: instant, updatedAt: instant, editedAfterWeekEnd: false })
  await expect(page.getByRole('definition').first()).toHaveText('1 / 4')
  await expect(page.getByText('minut · zwykle 60', { exact: true })).toBeVisible()
  const chart = page.getByRole('region', { name: 'Ostatnie tygodnie', exact: true })
  await expect(chart.getByRole('link')).toHaveCount(5)
  await expect(chart.locator('.is-current .progress-week-bar')).toHaveCSS('background-image', /linear-gradient.*rgb\(240, 117, 58\)/)
  await expect(chart.locator('.progress-week-column:not(.is-current):not(.is-hidden) .progress-week-bar').first()).toHaveCSS('background-image', /linear-gradient.*rgb\(122, 26, 40\)/)
  await chart.getByRole('button', { name: 'Pokaż 12 tygodni', exact: true }).click()
  await expect(chart.getByRole('link')).toHaveCount(12)
  await chart.getByRole('button', { name: 'Pokaż mniej', exact: true }).click()
  await expect(chart.getByRole('link')).toHaveCount(5)
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
  }
  await chart.getByRole('link', { name: new RegExp(`Treningi w tygodniu ${current}: 1, plan 4$`) }).click()
  await expect(page).toHaveURL(/tab=history&week=2026-11-16/)
  await expect(page.getByText('Ten tydzień · 16–22 lis', { exact: true })).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(1)
})

test('adds reusable improvement elements from progress and the manual entry without submitting the workout', async ({ app, page }) => {
  await app.open('/progress')
  await page.getByRole('button', { name: '+ Dodaj', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Nowy element do poprawy', exact: true })
  await dialog.getByRole('textbox', { name: 'Nazwa', exact: true }).fill('Powrót ręki')
  await dialog.getByRole('textbox', { name: 'Cel', exact: true }).fill('Ręka wraca do brody po jabie')
  await dialog.getByRole('button', { name: 'Zapisz ćwiczenie', exact: true }).click()
  await expect(page.getByRole('link', { name: /Powrót ręki/ })).toBeVisible()
  await expect.poll(() => app.readFocusSkills()).toMatchObject([{ name: 'Powrót ręki' }])
  await app.open('/workout-sessions/new')
  await page.getByRole('button', { name: '+ Dodaj element do poprawy', exact: true }).click()
  await dialog.getByRole('textbox', { name: 'Nazwa', exact: true }).fill('Garda po kopnięciu')
  await dialog.getByRole('textbox', { name: 'Cel', exact: true }).fill('Łokieć przy żebrach')
  await dialog.getByRole('button', { name: 'Zapisz ćwiczenie', exact: true }).click()
  await expect(page.getByRole('checkbox', { name: 'Garda po kopnięciu', exact: true })).toBeVisible()
  await expect.poll(async () => (await app.readFocusSkills()).length).toBe(2)
  expect(await app.readSessions()).toEqual([])
})

test('groups journal weeks, collapses gaps, searches notes and selects calendar days', async ({ app, page }) => {
  await app.open('/workouts?tab=history')
  for (const [id, workoutDate, note] of [['old', '2026-10-20', null], ['new', '2026-11-17', 'Powrót ręki po jabie']] as const) {
    await app.seedSession(manualWorkoutSession({ id, workoutDate, note, category: 'bag', parts: ['bag'], sparring: [] }))
  }
  await expect(page.getByText('Ten tydzień · 16–22 lis', { exact: true })).toBeVisible()
  await expect(page.getByText(/przerwa 3 tyg\. \(0 treningów\)/)).toBeVisible()
  await expect(page.getByRole('img', { name: 'Ma notatkę', exact: true })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Szukaj w nazwach i notatkach', exact: true }).fill('po jabie')
  await expect(page.getByRole('article')).toHaveCount(1)
  await page.getByRole('searchbox').clear()
  await page.getByRole('radio', { name: 'Miesiąc', exact: true }).check()
  await page.getByRole('button', { name: '2026-11-17: 1 treningów', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Treningi 2026-11-17', exact: true }).getByRole('article')).toHaveCount(1)
  await page.getByRole('region', { name: 'Treningi 2026-11-17', exact: true }).locator('.disclosure-trigger').first().click()
  await page.getByRole('link', { name: 'Popraw', exact: true }).click()
  await expect(page).toHaveURL(/workout-sessions\/new\/edit$/)
})
