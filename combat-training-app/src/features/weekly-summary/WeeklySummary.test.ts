import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkoutData } from '@/application/workoutDataContext'
import { workoutSession } from '@/test/workoutSessionBuilders'
import { WeeklySummary } from './WeeklySummary'

const { useWorkoutData } = vi.hoisted(() => ({ useWorkoutData: vi.fn() }))
vi.mock('@/application/workoutDataContext', () => ({ useWorkoutData }))
const weekStart = '2026-11-09'
const entry = workoutSession({ workoutDate: weekStart, durationSeconds: 30.4, workSeconds: 0, sparringSeconds: 0 })
let data: Pick<WorkoutData, 'sessions' | 'retrySessions'>
const render = () => renderToStaticMarkup(createElement(WeeklySummary, { weekStart }))

beforeEach(() => {
  data = { sessions: { status: 'ready', complete: true, items: [entry], pendingIds: new Set(),
    hasPendingWrites: false, fromCache: false, invalidDocumentIds: [] }, retrySessions: vi.fn() }
  useWorkoutData.mockImplementation(() => data)
})

describe('WeeklySummary collection states', () => {
  it.each([
    ['loading', { status: 'loading' as const }, 'Wczytywanie podsumowania', false],
    ['error with stale data', { status: 'error' as const }, 'Nie udało się wczytać treningów', true],
    ['incomplete cache', { complete: false, fromCache: true }, 'Historia treningów jest niepełna', true],
    ['unconfirmed completeness', { complete: undefined }, 'Historia treningów jest niepełna', true],
    ['invalid document', { invalidDocumentIds: ['bad'] }, 'Historia treningów jest niepełna', true],
  ])('does not show partial totals or a false zero for %s', (_name, overrides, message, retry) => {
    data.sessions = { ...data.sessions, ...overrides }
    const html = render()
    expect(html).toContain(message)
    expect(html.includes('Ponów odczyt podsumowania')).toBe(retry)
    expect(html).not.toContain('Treningi:')
    expect(html).not.toContain('Czas treningu')
    expect(html).not.toContain('Brak treningów w tym tygodniu')
    expect(html).not.toContain('RPE w')
  })

  it('renders recovered data, then recalculates when the collection changes', () => {
    data.sessions.status = 'error'
    expect(render()).not.toContain('Treningi:')
    data.sessions.status = 'ready'
    expect(render()).toContain('Treningi: 1')
    expect(render()).toContain('RPE w 0 z 1 treningów')
    data.sessions.items = [entry, { ...entry, id: 'second', rpe: 0 }]
    expect(render()).toContain('Treningi: 2')
    expect(render()).toContain('RPE w 1 z 2 treningów')
    // Two fractional sessions are formatted once after summing, using the journal convention.
    expect(render()).toContain('2 min')
  })

  it('shows full cached data with the existing pending-write indication without requiring week plans', () => {
    data.sessions.fromCache = true
    data.sessions.hasPendingWrites = true
    expect(render()).toContain('Treningi: 1')
    expect(render()).toContain('Czeka na wysłanie')
  })

  it('shows a truly empty week as zero without missing RPE or time coverage warnings', () => {
    data.sessions.items = []
    const html = render()
    expect(html).toContain('Brak treningów w tym tygodniu')
    expect(html).toContain('Treningi: 0')
    expect(html.match(/>0 s</g)).toHaveLength(3)
    expect(html).not.toContain('RPE w')
    expect(html).not.toContain('Dane w')
    expect(html).not.toContain('Brak danych')
  })
})
