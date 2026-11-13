import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkoutData } from '@/application/workoutDataContext'
import { workoutSession } from '@/test/workoutSessionBuilders'
import { ProfileStatistics } from './ProfileStatistics'

const { useWorkoutData } = vi.hoisted(() => ({ useWorkoutData: vi.fn() }))
vi.mock('@/application/workoutDataContext', () => ({ useWorkoutData }))
let data: Pick<WorkoutData, 'sessions' | 'retrySessions'>
const render = () => renderToStaticMarkup(createElement(ProfileStatistics, { today: '2026-11-13' }))

beforeEach(() => {
  data = { sessions: { status: 'ready', complete: true, items: [], pendingIds: new Set(), hasPendingWrites: false,
    fromCache: false, invalidDocumentIds: [] }, retrySessions: vi.fn() }
  useWorkoutData.mockImplementation(() => data)
})

describe('profile statistics data states', () => {
  it.each([
    { status: 'loading' as const }, { status: 'error' as const }, { complete: false },
    { complete: undefined }, { invalidDocumentIds: ['bad'] },
  ])('does not show false totals for unavailable history: %j', (patch) => {
    data.sessions = { ...data.sessions, items: [workoutSession()], ...patch }
    const html = render()
    expect(html).not.toContain('Od początku')
    expect(html).not.toContain('>0<')
    expect(html).not.toContain('Statystyki pojawią się po pierwszym treningu.')
    expect(html).toContain(patch.status === 'loading' ? 'Wczytywanie podsumowania' : 'Ponów odczyt')
  })
  it('shows the empty state only after complete history and renders cached totals with pending indication', () => {
    expect(render()).toContain('Statystyki pojawią się po pierwszym treningu.')
    data.sessions = { ...data.sessions, fromCache: true, hasPendingWrites: true,
      items: [workoutSession({ workoutDate: '2026-11-13', durationSeconds: 3600,
        sparring: [{ blockId: 'one', intensity: null, rounds: 3 }, { blockId: 'two', intensity: null, rounds: null }] })] }
    const html = render()
    expect(html).toContain('60 min')
    expect(html).toContain('co najmniej 3')
    expect(html).toContain('(w 1 treningu liczba rund nieznana)')
    expect(html).toContain('Czeka na wysłanie')
  })
})
