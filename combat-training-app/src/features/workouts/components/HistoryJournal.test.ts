import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { scheduledWeekFromLegacy } from '@/domain/week-plan/updateRecurringWeek'
import type { WeekPlan } from '@/domain/week-plan/weekPlan.types'
import { manualWorkoutSession } from '@/test/manualWorkoutBuilder'
import { mapWorkoutSessionsToHistoryListItems } from '../mappers/workoutSessionHistoryListItemMapper'
import { HistoryJournal } from './HistoryJournal'

const week = '2026-11-09'
const timestamp = '2026-11-09T12:00:00.000Z'
const legacy: WeekPlan = {
  weekStart: week, items: [{ kind: 'category', id: 'bag', category: 'bag' }],
  createdAt: timestamp, updatedAt: timestamp, editedAfterWeekEnd: false,
}
const numeric: WeekPlan = { ...legacy, items: [], schedule: [], targetCount: 1 }
let weekPlan = legacy
let workouts = [manualWorkoutSession()]

vi.mock('@/application/workoutDataContext', () => ({
  useWorkoutData: () => ({
    currentWeek: '2026-11-16',
    sessions: { status: 'ready', items: workouts, complete: true, invalidDocumentIds: [] },
    weekPlans: { status: 'ready', items: [weekPlan], rangeStart: '2026-08-17', complete: true, invalidDocumentIds: [] },
  }),
}))

it.each([
  ['v1', legacy, 'technique', '0/1'],
  ['migrated v1', scheduledWeekFromLegacy(legacy), 'technique', '0/1'],
  ['v1 with a matching workout', legacy, 'bag', '1/1'],
  ['migrated v1 with a matching workout', scheduledWeekFromLegacy(legacy), 'bag', '1/1'],
  ['numeric v2', numeric, 'technique', '1/1'],
] as const)('shows the full week and its credited goal for %s despite a content filter', (_name, plan, category, goal) => {
  weekPlan = plan
  workouts = [manualWorkoutSession({ category, workoutDate: '2026-11-12' }),
    manualWorkoutSession({ id: 'next-week', workoutDate: '2026-11-17', category: 'bag' })]
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(HistoryJournal, {
    week, history: mapWorkoutSessionsToHistoryListItems(workouts), matching: [], contentFiltered: true, sortOrder: 'newest',
    onUpdateNote: async () => 'applied' as const, onDelete: async () => 'applied' as const,
  })))
  expect(html).toContain(`Cały tydzień · 1 trening · 90 min · plan ${goal}`)
  expect(html).toContain('Brak pasujących wpisów')
  expect(html).not.toContain('przerwa')
})
