import { useCallback, useEffect, useRef, useState } from 'react'
import type { WeekPlanRepository, WeekPlanSnapshot } from './weekPlanRepository'
import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import { WEEK_PLAN_HISTORY_WEEKS } from '@/domain/week-plan/weekPlan.types'

export interface WeekPlanCollectionState extends WeekPlanSnapshot { status: 'loading' | 'ready' | 'error' }
function loading(currentWeek: string): WeekPlanCollectionState {
  return { status: 'loading', items: [], pendingIds: new Set(), hasPendingWrites: false, fromCache: true,
    invalidDocumentIds: [], complete: false, rangeStart: shiftCalendarDate(currentWeek, -7 * WEEK_PLAN_HISTORY_WEEKS) }
}

export function useWeekPlanCollection(repository: WeekPlanRepository, currentWeek: string, retryInitialization: () => void) {
  const [attempt, setAttempt] = useState(0)
  const receivedSnapshot = useRef(false)
  const [result, setResult] = useState(() => ({ repository, currentWeek, attempt, state: loading(currentWeek) }))
  useEffect(() => repository.subscribe(currentWeek,
    (snapshot) => { receivedSnapshot.current = true; setResult({ repository, currentWeek, attempt, state: { ...snapshot, status: 'ready' } }) },
    () => setResult((current) => ({ repository, currentWeek, attempt, state: {
      ...(current.repository === repository && current.currentWeek === currentWeek ? current.state : loading(currentWeek)), status: 'error',
    } })),
  ), [repository, currentWeek, attempt])
  const retry = useCallback(() => {
    // Once a document can be edited, retry only its listener and preserve the mounted draft.
    // A failed SDK bootstrap has never exposed an editable document and needs a fresh boot.
    if (receivedSnapshot.current) setAttempt((value) => value + 1)
    else retryInitialization()
  }, [retryInitialization])
  const state = result.repository === repository && result.currentWeek === currentWeek && result.attempt === attempt ? result.state : loading(currentWeek)
  return { state, retry }
}
