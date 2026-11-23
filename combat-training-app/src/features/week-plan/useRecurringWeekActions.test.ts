import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import type { WorkoutData } from '@/application/workoutDataContext'
import { changeScheduledWeek, generateScheduledWeek } from '@/domain/week-plan/scheduledWeek'
import { useRecurringWeekActions } from './useRecurringWeekActions'

const { useWorkoutData } = vi.hoisted(() => ({ useWorkoutData: vi.fn() }))
vi.mock('@/application/workoutDataContext', () => ({ useWorkoutData }))

afterEach(() => vi.useRealTimers())

it.each([
  ['2026-03-29T22:00:00.000Z', '2026-03-23', '2026-03-30'],
  ['2026-10-25T23:00:00.000Z', '2026-10-19', '2026-10-26'],
  ['2026-11-22T23:00:00.000Z', '2026-11-16', '2026-11-23'],
])('uses the snapshot and timestamp at the click after Warsaw midnight %s', async (boundary, sundayWeek, mondayWeek) => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(Date.parse(boundary) - 1))
  const sunday = generateScheduledWeek(sundayWeek, undefined, new Date())
  const monday = { ...generateScheduledWeek(mondayWeek, undefined, new Date()), targetCount: 3 }
  const save = vi.fn<WorkoutData['weekPlanRepository']['save']>().mockResolvedValue(undefined)
  const ready = { status: 'ready' as const, complete: true, invalidDocumentIds: [], pendingIds: new Set<string>(), hasPendingWrites: false, fromCache: false }
  const data = { recurringWeeks: { ...ready, items: [] }, weekPlans: { ...ready, rangeStart: sundayWeek, items: [sunday, monday] },
    weekPlanRepository: { save, subscribe: vi.fn(), reconcile: vi.fn() } } satisfies Pick<WorkoutData, 'recurringWeeks' | 'weekPlans' | 'weekPlanRepository'>
  useWorkoutData.mockReturnValue(data)
  const rendered = vi.fn<(actions: ReturnType<typeof useRecurringWeekActions>) => void>()
  function Harness() {
    rendered(useRecurringWeekActions())
    return null
  }
  renderToStaticMarkup(createElement(Harness))
  const [actions] = rendered.mock.calls[0]
  expect(actions.ready).toBe(true)

  vi.setSystemTime(new Date(boundary))
  await actions.save([], (current, now) => {
    expect(current).toMatchObject({ weekStart: mondayWeek, targetCount: 3, editedAfterWeekEnd: false })
    expect(now.toISOString()).toBe(boundary)
    return changeScheduledWeek(sunday, [], 0, now)
  }, sunday)
  expect(save).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ weekStart: sundayWeek, updatedAt: boundary, editedAfterWeekEnd: true }),
    expect.objectContaining({ updatedAt: boundary }),
    expect.objectContaining({ weekStart: mondayWeek, updatedAt: boundary, editedAfterWeekEnd: false, targetCount: 3 }),
    expect.objectContaining({ operationTime: new Date(boundary) }),
  )
})
