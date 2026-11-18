import { expect, it } from 'vitest'
import { legacyHistoryRedirect } from './legacyHistoryRedirect'

it('redirects history while preserving week, extra parameters and hash', () => {
  expect(legacyHistoryRedirect('?tab=history')).toBe('/progress?tab=history')
  expect(legacyHistoryRedirect('?tab=history&week=2026-11-16&perf=0', '#session'))
    .toBe('/progress?tab=history&week=2026-11-16&perf=0#session')
})

it.each(['', '?tab=plans', '?tab=unknown', '?week=2026-11-16'])('keeps plan addresses unchanged: %s', (search) => {
  expect(legacyHistoryRedirect(search)).toBeNull()
})
