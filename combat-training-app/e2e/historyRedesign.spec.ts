import AxeBuilder from '@axe-core/playwright'
import type { Locator } from '@playwright/test'
import { manualWorkoutSession } from '../src/test/manualWorkoutBuilder'
import { sessionStep, workoutSession } from '../src/test/workoutSessionBuilders'
import { expect, test } from './fixtures'

const today = new Date('2026-11-22T18:00:00Z')
const historyUrl = '/progress?tab=history'

async function expectTouchTarget(target: Locator) {
  await expect(target).toBeVisible()
  const bounds = await target.boundingBox()
  expect(bounds?.width).toBeGreaterThanOrEqual(44)
  expect(bounds?.height).toBeGreaterThanOrEqual(44)
}

for (const width of [360, 390]) {
  for (const theme of ['dark', 'light'] as const) {
    test(`shows the redesigned journal at ${width}px in ${theme}`, async ({ app, page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.clock.setFixedTime(today)
      await app.open(historyUrl)
      await app.setTheme(theme)
      await app.seedSession(workoutSession({
        id: 'planned', workoutPlanNameSnapshot: 'Kickboxing – tarcze i kombinacje bokserskie', disciplineKey: 'kickboxing',
        workoutDate: '2026-11-22', startedAt: '2026-11-22T16:40:00.000Z', completedAt: '2026-11-22T17:30:00.000Z',
        createdAt: '2026-11-22T17:30:00.000Z', updatedAt: '2026-11-22T17:50:00.000Z',
        stepResults: [1, 2, 3, 4].map((roundNumber) => sessionStep({
          playbackStepId: `round-${roundNumber}`, blockType: 'sparring', roundNumber, roundCount: 4,
          plannedDurationSeconds: 750, performedDurationSeconds: 750,
        })),
        rpe: 7, rpeRecordedAt: '2026-11-22T17:50:00.000Z', note: 'Powrót do gardy.',
        sparring: [{ blockId: 'block-1', intensity: 'technical', rounds: 4 }],
      }))
      await app.seedSession(manualWorkoutSession({
        id: 'manual', workoutDate: '2026-11-20', durationSeconds: 6000, category: 'sparring', parts: ['sparring'],
        rpe: 5, rpeRecordedAt: '2026-11-20T17:00:00.000Z', sparring: [{ blockId: null, intensity: 'light', rounds: null }],
      }))
      await app.seedSession(workoutSession({ id: 'old', workoutDate: '2026-11-05', disciplineKey: 'muay_thai', stepResults: [sessionStep()] }))
      await app.seedWeekPlan({ weekStart: '2026-11-16', items: [], schedule: [], targetCount: 3,
        createdAt: today.toISOString(), updatedAt: today.toISOString(), editedAfterWeekEnd: false })

      const history = page.getByRole('region', { name: 'Historia treningów', exact: true })
      const current = history.getByRole('region', { name: 'Ten tydzień · 16–22 listopada', exact: true })
      const planned = current.getByRole('article').filter({ has: page.getByRole('heading', { name: /Kickboxing – tarcze/ }) })
      const manual = current.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Trening poza aplikacją · Sparing' }) })
      await expect(current.getByText('Aktywny', { exact: true })).toBeVisible()
      await expect(current.getByRole('term')).toHaveText(['treningi', 'Łączny czas', 'Plan 67%'])
      await expect(current.getByRole('definition')).toHaveText(['2', '150 min', '2 z 3'])
      await expect(history.getByText('9–15 lis · przerwa 1 tydz. (0 treningów)', { exact: true })).toBeVisible()
      const old = history.getByRole('region', { name: '2–8 listopada', exact: true })
      await expect(old.getByRole('term')).toHaveText(['trening', 'Łączny czas'])
      await old.getByRole('article').getByRole('button', { name: /Szczegóły wpisu/ }).click()
      await expect(old.getByRole('article').getByRole('term')).toHaveText(['Czas trwania', 'Ćwiczenia'])

      const search = page.getByRole('searchbox', { name: 'Szukaj w nazwach i notatkach', exact: true })
      await expect(search).toHaveAttribute('placeholder', 'Szukaj')
      await expect(search).toHaveCSS('font-size', '16px')
      expect(await search.evaluate((input) => getComputedStyle(input, '::placeholder').fontSize)).toBe('12px')
      await expectTouchTarget(search)

      const filters = page.getByRole('button', { name: /^Filtry/ })
      await expectTouchTarget(filters)
      await filters.click()
      const discipline = page.getByRole('group', { name: 'Dyscyplina', exact: true }).getByRole('button', { name: 'Kickboxing', exact: true })
      await expectTouchTarget(discipline)
      await discipline.click()
      await expect(discipline).toHaveAttribute('aria-pressed', 'true')
      await expect(discipline).toHaveCSS('border-top-width', '2px')
      await expect(page.getByRole('button', { name: 'Filtry (1)', exact: true }).locator('.history-filter-dot')).toBeVisible()
      await expect(history.getByRole('article')).toHaveCount(1)
      await expect(planned).toBeVisible()
      await page.getByRole('button', { name: 'Wyczyść filtry', exact: true }).click()

      const sort = page.getByRole('group', { name: 'Sortowanie', exact: true })
      const oldest = sort.getByRole('button', { name: 'Najstarsze', exact: true })
      await oldest.click()
      await expect(oldest).toHaveAttribute('aria-pressed', 'true')
      await expect(current.getByRole('article').first()).toContainText('Trening poza aplikacją · Sparing')
      await expect(history.getByRole('heading', { level: 3 }).first()).toHaveText('2–8 listopada')
      await sort.getByRole('button', { name: 'Najnowsze', exact: true }).click()
      await expect(current.getByRole('article').first()).toContainText('Kickboxing – tarcze')
      await filters.click()

      const plannedToggle = planned.getByRole('button', { name: /50 min.*RPE 7.*4 rundy.*Notatka.*Szczegóły wpisu/ })
      await expectTouchTarget(plannedToggle)
      await plannedToggle.click()
      await expect(plannedToggle).toHaveAttribute('aria-expanded', 'true')
      await expect(plannedToggle.locator('.disclosure-chevron')).toHaveCSS('transform', 'none')
      await expect(planned.getByRole('term')).toHaveText(['Czas trwania', 'Odczucie RPE', 'Ćwiczenia', 'Sparing'])
      await expect(planned.getByText('7 / 10 · Bardzo ciężko', { exact: true })).toBeVisible()
      await expect(planned.getByText('zakończenie 18:30', { exact: true })).toBeVisible()
      await expect(planned.getByText('Powrót do gardy.', { exact: true })).toBeVisible()
      await expectTouchTarget(planned.getByRole('button', { name: 'Edytuj notatkę', exact: true }))
      await expectTouchTarget(planned.getByRole('button', { name: 'Usuń wpis', exact: true }))

      await manual.getByRole('button', { name: /Szczegóły wpisu/ }).click()
      await expect(manual.getByRole('term')).toHaveText(['Czas trwania', 'Odczucie RPE'])
      await expect(manual.getByText('piątek, 20 listopada', { exact: true })).toBeVisible()
      await expect(manual.getByText(/zakończenie|\d{2}:\d{2}/i)).toHaveCount(0)
      await expect(manual.getByRole('link', { name: 'Popraw', exact: true })).toBeVisible()
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

      const month = history.getByRole('radio', { name: 'Miesiąc', exact: true })
      await expectTouchTarget(month)
      await month.click()
      await expect(month).toHaveCSS('border-top-width', '2px')
      const calendar = history.getByRole('region', { name: 'Kalendarz treningów', exact: true })
      const sparringDay = calendar.getByRole('button', { name: '20 listopada 2026: 1 trening · sparing', exact: true })
      await expectTouchTarget(sparringDay)
      await expect(sparringDay.locator('.history-sparring-marker')).toBeVisible()
      await sparringDay.click()
      await expect(sparringDay).toHaveAttribute('aria-pressed', 'true')
      await expect(sparringDay).toHaveCSS('border-top-width', '2px')
      await expect(history.getByRole('region', { name: 'Treningi 2026-11-20', exact: true }).getByRole('article')).toContainText('Trening poza aplikacją · Sparing')
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    })
  }
}

test('offers the manual entry on an empty journal and displays an empty calendar', async ({ app, page }) => {
  await page.clock.setFixedTime(today)
  await app.open(historyUrl)
  await expect(page.getByRole('heading', { name: 'Brak historii treningów', exact: true })).toBeVisible()
  await page.getByRole('radio', { name: 'Miesiąc', exact: true }).click()
  await expect(page.getByText('Brak treningów w wybranym miesiącu.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '22 listopada 2026: 0 treningów', exact: true }).click()
  await expect(page.getByText('Brak treningów tego dnia.', { exact: true })).toBeVisible()
  await page.getByRole('radio', { name: 'Tygodnie', exact: true }).click()
  const add = page.getByRole('link', { name: 'Dodaj pierwszy trening', exact: true })
  await expectTouchTarget(add)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await add.click()
  await expect(page.getByRole('form', { name: 'Trening spoza aplikacji', exact: true })).toBeVisible()
})
