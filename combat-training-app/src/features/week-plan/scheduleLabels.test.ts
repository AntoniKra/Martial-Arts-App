import { expect, it } from 'vitest'
import { scheduledWeekLabel } from './scheduleLabels'

it('formats a Polish calendar range including a month or year boundary without timezone shifts', () => {
  expect(scheduledWeekLabel('2026-11-16')).toBe('16–22 listopada')
  expect(scheduledWeekLabel('2026-11-30')).toContain('listopada')
  expect(scheduledWeekLabel('2026-11-30')).toContain('grudnia')
  expect(scheduledWeekLabel('2026-12-28')).toContain('2026')
  expect(scheduledWeekLabel('2026-12-28')).toContain('2027')
})
