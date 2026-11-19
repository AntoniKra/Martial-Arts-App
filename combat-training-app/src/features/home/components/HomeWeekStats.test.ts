import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { calculateWeekPlanProgress } from '@/domain/week-plan/weekPlanProgress'
import { generateScheduledWeek } from '@/domain/week-plan/scheduledWeek'
import { selectHomeSchedule } from '@/domain/week-plan/homeSchedule'
import { manualWorkoutSession } from '@/test/manualWorkoutBuilder'
import { HomeWeekCard, HomeWeekStats } from './HomeWeekCard'

describe('Start weekly statistics', () => {
  it('keeps the workout count without inventing a goal denominator or percentage when no goal exists', () => {
    const today = '2026-11-17', weekStart = '2026-11-16'
    const plan = generateScheduledWeek(weekStart, undefined, new Date(`${today}T12:00:00Z`))
    const sessions = [manualWorkoutSession({ workoutDate: today })]
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(HomeWeekCard, {
      today, weekStart, progress: calculateWeekPlanProgress(weekStart, plan, sessions, today),
      schedule: selectHomeSchedule(plan, [plan], sessions, today),
    })))
    expect(html).toContain('1 trening')
    expect(html).not.toContain('1 z 0')
    expect(html).not.toContain('Postęp:')
    expect(html).not.toContain('role="progressbar"')
    expect(html).toContain('Nie ustalono celu.')
  })
  it.each([[0, 'jednostek'], [1, 'jednostki'], [2, 'jednostek'], [5, 'jednostek']] as const)('formats a goal of %s without minutes or remaining counts', (total, noun) => {
    const text = renderToStaticMarkup(createElement(HomeWeekStats, { completed: 0, total, percentage: 0 })).replace(/<[^>]+>/g, '')
    expect(text).toBe(`Ukończone: 0 z ${total} ${noun}Postęp: 0%`)
  })
  it('shows the existing goal and percentage without recomputing progress', () => {
    const text = renderToStaticMarkup(createElement(HomeWeekStats, { completed: 2, total: 4, percentage: 50 })).replace(/<[^>]+>/g, '')
    expect(text).toBe('Ukończone: 2 z 4 jednostekPostęp: 50%')
  })
})
