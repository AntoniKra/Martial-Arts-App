import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'
import { manualWorkoutSession } from '../src/test/manualWorkoutBuilder'
import { sessionStep, workoutSession } from '../src/test/workoutSessionBuilders'
import { shiftCalendarDate } from '../src/domain/week-plan/weekCalendar'

const instant = '2026-11-18T12:00:00.000Z', current = '2026-11-16'
test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(instant)) })

test.describe('history opened in New York', () => {
  test.use({ timezoneId: 'America/New_York' })
  test('shows the Sunday workout date and the Monday completion time in Warsaw', async ({ app, page }) => {
    await page.clock.setFixedTime(new Date('2026-11-23T15:00:00.000Z'))
    await app.open('/progress?tab=history')
    const completedAt = '2026-11-22T23:10:00.000Z'
    await app.seedSession(workoutSession({ workoutPlanNameSnapshot: 'Trening przez północ', workoutDate: '2026-11-22',
      startedAt: '2026-11-22T22:50:00.000Z', completedAt, stepResults: [sessionStep()] }))
    const card = page.getByRole('region', { name: '16–22 listopada', exact: true }).getByRole('article')
    await card.getByRole('button', { name: /Szczegóły wpisu/ }).click()
    const workoutDate = card.getByText('niedziela, 22 listopada', { exact: true })
    await expect(workoutDate).toBeVisible()
    await expect(workoutDate).toHaveAttribute('datetime', '2026-11-22')
    await expect(card.getByText('zakończenie 00:10 CET', { exact: true })).toBeVisible()
    await expect(card.getByText('00:10 CET', { exact: true })).toHaveAttribute('datetime', completedAt)
  })
})

test('shows the weekly goal, expands five to twelve weeks, and opens the selected journal week', async ({ app, page }) => {
  await app.open('/progress')
  for (const offset of [-77, -28, -21, -14, -7, 0]) {
    await app.seedSession(manualWorkoutSession({ id: `week${offset}`, workoutDate: shiftCalendarDate(current, offset),
      durationSeconds: 3600, rpe: 5, sparring: [], category: 'bag' }))
  }
  await app.seedWeekPlan({ weekStart: current, items: [], schedule: [], targetCount: 4, createdAt: instant, updatedAt: instant, editedAfterWeekEnd: false })
  const summary = page.getByRole('region', { name: 'Ten tydzień w liczbach', exact: true })
  await expect(summary.getByRole('progressbar', { name: 'Plan tygodnia', exact: true })).toHaveAttribute('aria-valuetext', '1 z 4')
  await expect(summary.getByRole('term')).toHaveText(['Plan tygodnia', 'minut', 'rund sparingu'])
  const chart = page.getByRole('region', { name: 'Ostatnie tygodnie', exact: true })
  await expect(chart.getByRole('link')).toHaveCount(5)
  await chart.getByRole('button', { name: 'Pokaż 12 tygodni', exact: true }).click()
  await expect(chart.getByRole('link')).toHaveCount(12)
  await expect(chart.getByRole('status')).toHaveText('Pokazano 12 tygodni')
  await chart.getByRole('button', { name: 'Pokaż mniej', exact: true }).click()
  await expect(chart.getByRole('link')).toHaveCount(5)
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
  }
  await chart.getByRole('link', { name: `Treningi w tygodniu ${current}: 1 trening, plan 4`, exact: true }).click()
  await expect(page).toHaveURL(/tab=history&week=2026-11-16/)
  await expect(page.getByRole('heading', { name: 'Ten tydzień · 16–22 listopada', exact: true })).toBeVisible()
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
  await app.open('/progress?tab=history')
  for (const [id, workoutDate, note] of [['old', '2026-10-20', null], ['new', '2026-11-17', 'Powrót ręki po jabie']] as const) {
    await app.seedSession(manualWorkoutSession({ id, workoutDate, note, category: 'bag', parts: ['bag'], sparring: [] }))
  }
  await expect(page.getByRole('heading', { name: 'Ten tydzień · 16–22 listopada', exact: true })).toBeVisible()
  await expect(page.getByText(/przerwa 3 tyg\. \(0 treningów\)/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Notatka.*Szczegóły wpisu/ })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Szukaj w nazwach i notatkach', exact: true }).fill('po jabie')
  await expect(page.getByRole('article')).toHaveCount(1)
  await page.getByRole('searchbox').clear()
  await page.getByRole('radio', { name: 'Miesiąc', exact: true }).check()
  await page.getByRole('button', { name: '17 listopada 2026: 1 trening', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Treningi 2026-11-17', exact: true }).getByRole('article')).toHaveCount(1)
  await page.getByRole('region', { name: 'Treningi 2026-11-17', exact: true }).getByRole('button', { name: /Szczegóły wpisu/ }).click()
  await page.getByRole('link', { name: 'Popraw', exact: true }).click()
  await expect(page).toHaveURL(/workout-sessions\/new\/edit$/)
})

test('keeps filtered weeks distinct from training gaps and labels the full-week totals', async ({ app, page }) => {
  await app.open('/progress?tab=history')
  for (const [workoutDate, disciplineKey] of [['2026-10-26', 'boxing'], ['2026-11-03', 'kickboxing'], ['2026-11-16', 'boxing']] as const) {
    await app.seedSession(manualWorkoutSession({ id: workoutDate, workoutDate, disciplineKey, durationSeconds: 3600 }))
  }
  const otherWeek = page.getByRole('region', { name: '2–8 listopada', exact: true })
  const gap = page.getByText('9–15 lis · przerwa 1 tydz. (0 treningów)', { exact: true })
  await expect(otherWeek.getByRole('article')).toHaveCount(1)
  await expect(gap).toBeVisible()
  await page.getByRole('button', { name: 'Filtry', exact: true }).click()
  const oldest = page.getByRole('group', { name: 'Sortowanie', exact: true }).getByRole('button', { name: 'Najstarsze', exact: true })
  await oldest.click()
  await expect(oldest).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(/^Cały tydzień/)).toHaveCount(0)
  await page.getByRole('button', { name: 'Boks', exact: true }).click()
  await expect(otherWeek.getByText('Cały tydzień', { exact: true })).toBeVisible()
  await expect(otherWeek.getByRole('term')).toHaveText(['trening', 'Łączny czas'])
  await expect(otherWeek.getByRole('definition')).toHaveText(['1', '60 min'])
  await expect(otherWeek.getByText('Brak pasujących wpisów', { exact: true })).toBeVisible()
  await expect(otherWeek.getByRole('article')).toHaveCount(0)
  await expect(page.getByRole('article')).toHaveCount(2)
  await expect(gap).toBeVisible()
  await expect(page.getByText(/przerwa/)).toHaveCount(1)

  await page.getByRole('searchbox').fill('Brakująca nazwa')
  await expect(page.getByText('Brak pasujących wpisów', { exact: true })).toHaveCount(3)
  await expect(gap).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(0)
})

test('gives all twelve weeks separate touch targets below the expanded chart', async ({ app, page }, testInfo) => {
  await app.open('/progress')
  const dates = Array.from({ length: 12 }, (_, index) => shiftCalendarDate(current, (index - 11) * 7))
  await app.seedSession(manualWorkoutSession({ id: 'oldest', workoutDate: dates[0] }))
  await app.seedSession(manualWorkoutSession({ id: 'latest', workoutDate: current }))
  const chart = page.getByRole('region', { name: 'Ostatnie tygodnie', exact: true })
  await chart.getByRole('button', { name: 'Pokaż 12 tygodni', exact: true }).click()
  const picker = chart.getByRole('list', { name: 'Wybierz tydzień w Historii', exact: true })
  const links = picker.getByRole('link')
  await expect(links).toHaveCount(12)
  await expect(chart.getByRole('group').getByRole('link')).toHaveCount(0)
  const viewport = page.viewportSize()!
  for (const width of testInfo.project.name === 'phone' ? [360, 390] : [viewport.width]) {
    await page.setViewportSize({ ...viewport, width })
    for (const theme of ['dark', 'light'] as const) {
      await app.setTheme(theme)
      const targets = await links.evaluateAll((elements) => elements.map((element) => {
        const { left, right, width, height } = element.getBoundingClientRect()
        return { left, right, width, height, href: element.getAttribute('href') }
      }))
      expect(targets.map(({ href }) => href)).toEqual(dates.map((date) => `/progress?tab=history&week=${date}`))
      expect(targets.every((target, index) => target.width >= 44 && target.height >= 44
        && (index === 0 || targets[index - 1].right <= target.left))).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${theme} at ${width}px`).toBeLessThanOrEqual(width)
      expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
    }
  }
  if (testInfo.project.name === 'phone') {
    expect(await picker.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true)
  }
  await links.last().click()
  await expect(page).toHaveURL(/tab=history&week=2026-11-16$/)
  await expect(page.getByRole('article')).toHaveCount(1)
})

test('offers expansion only when it adds columns and announces their actual count', async ({ app, page }) => {
  await app.open('/progress')
  const chart = page.getByRole('region', { name: 'Ostatnie tygodnie', exact: true })
  await app.seedSession(manualWorkoutSession({ id: 'three', workoutDate: shiftCalendarDate(current, -14) }))
  await expect(chart.getByRole('link')).toHaveCount(3)
  await expect(chart.getByRole('button', { name: /^Pokaż/ })).toHaveCount(0)
  await app.seedSession(manualWorkoutSession({ id: 'five', workoutDate: shiftCalendarDate(current, -28) }))
  await expect(chart.getByRole('link')).toHaveCount(5)
  await expect(chart.getByRole('button', { name: /^Pokaż/ })).toHaveCount(0)
  await app.seedSession(manualWorkoutSession({ id: 'seven', workoutDate: shiftCalendarDate(current, -42) }))
  await chart.getByRole('button', { name: 'Pokaż 7 tygodni', exact: true }).click()
  await expect(chart.getByRole('list', { name: 'Wybierz tydzień w Historii', exact: true }).getByRole('link')).toHaveCount(7)
  await expect(chart.getByRole('status')).toHaveText('Pokazano 7 tygodni')
  await chart.getByRole('button', { name: 'Pokaż mniej', exact: true }).click()
  await expect(chart.getByRole('link')).toHaveCount(5)
  await expect(chart.getByRole('status')).toHaveText('Pokazano 5 tygodni')
})

test('redirects a dated History link to Monday and opens the local month without a week filter', async ({ app, page }) => {
  await page.clock.setFixedTime(new Date('2026-04-01T12:00:00.000Z'))
  await app.open('/progress?tab=history&week=2026-04-01&view=keep#example')
  await expect(page).toHaveURL(/tab=history&week=2026-03-30&view=keep#example$/)
  await app.seedSession(manualWorkoutSession({ id: 'april', workoutDate: '2026-04-01' }))
  await expect(page.getByRole('article')).toHaveCount(1)
  await page.getByRole('radio', { name: 'Miesiąc', exact: true }).check()
  const calendar = page.getByRole('region', { name: 'Kalendarz treningów', exact: true })
  await expect(calendar.getByRole('heading', { name: 'marzec 2026', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Wszystkie tygodnie', exact: true }).click()
  await expect(calendar.getByRole('heading', { name: 'kwiecień 2026', exact: true })).toBeVisible()
  await expect(calendar.getByRole('button', { name: '1 kwietnia 2026: 1 trening', exact: true })).toBeVisible()
})
