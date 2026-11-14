import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import { WellbeingChart } from './WellbeingChart'

it('renders 28 dates, accessible data and neutral percentile bands without filling missing days', () => {
  const entries = Array.from({ length: 27 }, (_, i) => ({ date: shiftCalendarDate('2026-11-14', i - 28), questionsVersion: 1,
    sleep: 3, energy: 3, soreness: 3, stress: 3, note: null, createdAt: '2026-11-14T09:00:00.000Z', updatedAt: '2026-11-14T09:00:00.000Z' }))
  const html = renderToStaticMarkup(createElement(WellbeingChart, { entries, field: 'sleep', end: '2026-11-14', version: 1 }))
  expect(html.match(/scope="row"/g)).toHaveLength(28)
  expect(html).toContain('Brak wpisu')
  expect(html).toContain('Pasmo P25–P75')
  expect(html).toContain('fill="var(--app-muted)"')
  expect(html).toContain('Pokaż dane')
  expect(html).not.toContain('crimson')
  expect(html).not.toContain('green')
})
