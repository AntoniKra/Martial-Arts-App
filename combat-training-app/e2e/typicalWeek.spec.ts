import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'
import { workoutSession } from '../src/test/workoutSessionBuilders'
import type { ManualWorkoutSession, QuickTimerWorkoutSession } from '../src/domain/workout-session/workoutSession.types'

const weekStart = '2026-11-09', instant = '2026-11-12T10:00:00.000Z'
const caption = 'Na tle 3 poprzednich tygodni'
const manual: ManualWorkoutSession = {
  id: 'manual', source: 'manual', status: 'completed', disciplineKey: 'boxing', category: 'bag',
  workoutDate: '2026-10-26', timezone: 'Europe/Warsaw', durationSeconds: 1800, workSeconds: null,
  sparringSeconds: null, completion: null, note: null, rpe: 4, rpeRecordedAt: instant,
  focusRatings: [], sparring: [], createdAt: instant, updatedAt: instant,
}
const quick: QuickTimerWorkoutSession = {
  id: 'quick', source: 'quickTimer', status: 'partial', disciplineKey: 'boxing', category: 'bag',
  workoutDate: '2026-11-02', timezone: 'Europe/Warsaw', durationSeconds: 1800, workSeconds: 900,
  sparringSeconds: 0, completion: { completed: 1, planned: 2, unit: 'round' }, note: null, rpe: 3,
  rpeRecordedAt: instant, sparring: [], createdAt: instant, updatedAt: instant,
  startedAt: instant, completedAt: instant, stepResults: [],
}
const first = workoutSession({ id: 'first', workoutDate: '2026-10-19', durationSeconds: 3600, rpe: 5, rpeRecordedAt: instant })
const current = workoutSession({ id: 'current', workoutDate: weekStart, durationSeconds: 7800, rpe: 3, rpeRecordedAt: instant })

// Fix the calendar before authentication and Firestore listeners select a week.
test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(instant)) })

test('compares three previous weeks across sources, preserves missing load and follows week selection', async ({ app, page }) => {
  await app.open(`/progress/week/${weekStart}`)
  for (const session of [
    workoutSession({ id: 'older', workoutDate: '2026-10-12', durationSeconds: 3600, rpe: 2, rpeRecordedAt: instant }),
    first, manual, quick,
    workoutSession({ id: 'zero', workoutDate: '2026-11-08', durationSeconds: 3600, rpe: 0, rpeRecordedAt: instant }), current,
  ]) await app.seedSession(session)

  const table = page.getByRole('table', { name: caption, exact: true })
  await expect(table.getByRole('cell')).toHaveText(['1', '1,3', '130 min', '60 min', '390 j.u.', '170 j.u.'])
  await expect(table.getByRole('columnheader')).toHaveText(['Miara', 'Ten tydzień (trwa)', 'Zwykle'])
  await expect(table.getByRole('rowheader')).toHaveText(['Treningi', 'Czas treningu', 'Obciążenie'])
  await expect(page.getByText('Zwykle = średnia z 3 tygodni przed tym tygodniem. Tygodnie bez treningów liczą się jako 0. To opis, nie ocena.', { exact: true })).toBeVisible()
  expect(await table.evaluate((element) => Boolean(element.parentElement?.nextElementSibling?.matches('details')))).toBe(true)
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
  }

  await app.seedSession({ ...first, rpe: null, rpeRecordedAt: null })
  await expect(table.getByRole('cell').last()).toHaveText('Brak pełnych danych')
  await app.seedSession({ ...current, rpe: null, rpeRecordedAt: null })
  await expect(table.getByRole('cell').nth(4)).toHaveText('Brak danych')
  await app.seedSession(first)
  await expect(table.getByRole('cell').last()).toHaveText('170 j.u.')
  await page.getByRole('link', { name: 'Poprzedni tydzień', exact: true }).click()
  await expect(table.getByRole('columnheader').nth(1)).toHaveText('Ten tydzień')
  await expect(table.getByRole('cell')).toHaveText(['2', '1,0', '90 min', '50 min', '90 j.u.', '180 j.u.'])
})

test('explains the three-week requirement for a new account and hides comparison for incomplete history', async ({ app, page }) => {
  await app.open(`/progress/week/${weekStart}`)
  const table = page.getByRole('table', { name: caption, exact: true })
  const hint = page.getByText('Porównanie pojawi się po 3 pełnych tygodniach treningów.', { exact: true })
  await expect(hint).toBeVisible()
  await expect(table).toHaveCount(0)
  await app.seedSession(current)
  await expect(page.getByText('Treningi: 1', { exact: true })).toBeVisible()
  await expect(hint).toBeVisible()
  await app.seedSession(first)
  await expect(table.getByRole('cell')).toHaveText(['1', '0,3', '130 min', '20 min', '390 j.u.', '100 j.u.'])
  await app.seedSession({ ...first, note: 'n'.repeat(1001) })
  await expect(page.getByText(/Historia treningów jest niepełna/)).toBeVisible()
  await expect(table).toHaveCount(0)
  await expect(hint).toHaveCount(0)
})
