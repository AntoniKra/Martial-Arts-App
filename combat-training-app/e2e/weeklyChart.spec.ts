import AxeBuilder from '@axe-core/playwright'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test, expect } from './fixtures'
import { workoutSession } from '../src/test/workoutSessionBuilders'
import type { ManualWorkoutSession, QuickTimerWorkoutSession } from '../src/domain/workout-session/workoutSession.types'

const weekStart = '2026-11-09', instant = '2026-11-12T10:00:00.000Z'
const chartName = 'Ostatnie 12 tygodni'
const manual: ManualWorkoutSession = {
  id: 'manual', source: 'manual', status: 'completed', disciplineKey: 'boxing', category: 'bag',
  workoutDate: '2026-11-01', timezone: 'Europe/Warsaw', durationSeconds: 900, workSeconds: null,
  sparringSeconds: null, completion: null, note: null, rpe: 0, rpeRecordedAt: instant, focusRatings: [], sparring: [], createdAt: instant, updatedAt: instant,
}
const { focusRatings: _manualRatings, ...timedFields } = manual
const quick: QuickTimerWorkoutSession = {
  ...timedFields, id: 'quick', source: 'quickTimer', status: 'partial', workoutDate: '2026-11-02', durationSeconds: 1200,
  workSeconds: 600, sparringSeconds: 0,
  startedAt: instant, completedAt: instant, stepResults: [], completion: { completed: 1, planned: 2, unit: 'round' },
}

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(instant)) })

test('shows twelve weeks across sources, switches units and themes, and moves with the selected week', async ({ app, page }, info) => {
  await app.open(`/progress/week/${weekStart}`)
  for (const session of [
    manual, quick, workoutSession({ id: 'plan', workoutDate: weekStart, durationSeconds: 1800.25 }),
    workoutSession({ id: 'second', workoutDate: weekStart, durationSeconds: 30.25 }),
    { ...manual, id: 'before', workoutDate: '2026-08-23' }, { ...manual, id: 'after', workoutDate: '2026-11-16' },
  ]) await app.seedSession(session)
  const chart = page.getByRole('region', { name: chartName, exact: true })
  const image = chart.getByRole('img')
  const rows = chart.getByRole('row')
  const data = chart.locator('details')
  await expect(chart.getByRole('button', { name: 'Treningi', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await chart.getByText('Pokaż dane', { exact: true }).click()
  await expect(rows).toHaveCount(13)
  await expect(rows.nth(1).getByRole('rowheader')).toHaveText('24.08.2026 – 30.08.2026')
  await expect(rows.nth(1).getByRole('cell')).toHaveText(['0', '0'])
  await expect(rows.nth(10).getByRole('cell')).toHaveText(['1', '15'])
  await expect(rows.nth(11).getByRole('cell')).toHaveText(['1', '20'])
  await expect(rows.nth(12).getByRole('cell')).toHaveText(['2', '31'])
  await expect(rows.nth(12).getByRole('rowheader')).toHaveText('09.11.2026 – 15.11.2026wybranytrwa')
  await expect(image.locator('g > text:first-of-type')).toHaveText(['0', '0', '0', '0', '0', '0', '0', '0', '0', '1', '1', '2'])
  await expect(page.getByText('Treningi: 2', { exact: true })).toBeVisible()
  await expect(page.getByRole('term').filter({ hasText: /^Czas treningu$/ }).locator('+ dd')).toHaveText('31 min')

  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    for (const metric of theme === 'dark' ? ['Treningi', 'Minuty'] : ['Treningi']) {
      await chart.getByRole('button', { name: metric, exact: true }).click()
      await expect(image).toHaveAccessibleName(new RegExp(`12 tygodni. ${metric}`))
      await expect(chart.getByRole('button', { name: metric, exact: true })).toHaveAttribute('aria-pressed', 'true')
      await expect(image.locator('g > text:first-of-type').last()).toHaveText(metric === 'Minuty' ? '31' : '2')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
      for (const button of await chart.getByRole('button').all()) {
        expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(44)
      }
      await data.locator('summary').click()
      if (process.env.CAPTURE_SCREENSHOTS === '1' && info.project.name === 'phone') {
        const folder = path.join(tmpdir(), 'weekly-chart')
        await mkdir(folder, { recursive: true })
        const name = `${theme}-${metric === 'Minuty' ? 'minutes' : 'workouts'}`
        const file = path.join(folder, `${name}.png`)
        await page.evaluate(() => document.fonts.ready)
        await chart.screenshot({ path: file })
        await info.attach(name, { path: file, contentType: 'image/png' })
      }
      await data.locator('summary').click()
    }
  }
  await page.getByRole('link', { name: 'Poprzedni tydzień', exact: true }).click()
  await chart.getByText('Pokaż dane', { exact: true }).click()
  await expect(rows.nth(1).getByRole('rowheader')).toHaveText('17.08.2026 – 23.08.2026')
  await expect(rows.nth(1).getByRole('cell')).toHaveText(['1', '15'])
  await expect(rows.nth(12).getByRole('rowheader')).toHaveText('02.11.2026 – 08.11.2026wybrany')
  await expect(rows.nth(12).getByRole('cell')).toHaveText(['1', '20'])
  await expect(chart.getByText('trwa', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Treningi: 1', { exact: true })).toBeVisible()
})

test('keeps empty weeks as zeros and hides the chart when the session history is incomplete', async ({ app, page }) => {
  await app.open(`/progress/week/${weekStart}`)
  const chart = page.getByRole('region', { name: chartName, exact: true })
  await chart.getByText('Pokaż dane', { exact: true }).click()
  await expect(chart.getByRole('cell')).toHaveText(Array.from({ length: 24 }, () => '0'))
  await expect(chart.getByRole('img').locator('g > text:first-of-type')).toHaveText(Array.from({ length: 12 }, () => '0'))
  await app.seedSession({ ...manual, id: 'bad', note: 'n'.repeat(1001) })
  await expect(page.getByText(/Historia treningów jest niepełna/)).toBeVisible()
  await expect(chart).toHaveCount(0)
})
