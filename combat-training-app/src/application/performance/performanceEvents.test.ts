import { afterEach, expect, it, vi } from 'vitest'
import { hasPerformanceObserver, reportPerformanceEvent } from './performanceEvents'

afterEach(() => vi.unstubAllGlobals())

it('stays inactive without a panel and isolates observer errors from writes', () => {
  vi.stubGlobal('window', {})
  expect(hasPerformanceObserver()).toBe(false)
  expect(() => reportPerformanceEvent({ type: 'unsubscribe' })).not.toThrow()
  const observer = vi.fn(() => { throw new Error('diagnostic failure') })
  vi.stubGlobal('window', { combatPerformanceObserver: observer })
  expect(hasPerformanceObserver()).toBe(true)
  expect(() => reportPerformanceEvent({ type: 'save-click', at: 10 })).not.toThrow()
  expect(observer).toHaveBeenCalledWith({ type: 'save-click', at: 10 })
})
