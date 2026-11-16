import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { HomeView } from '@/features/home/components/HomeView'
import { homeCardDate } from '@/features/home/homeLabels'
import { mapWorkoutSessionToHomeRecentSession } from '@/features/home/mappers/workoutSessionToHomeRecentSession'
import type { RecentWorkoutSessionsLoadState } from '@/features/home/types/homeView.types'
import { workoutSession } from '@/test/workoutSessionBuilders'

function renderHome(recentSessionsLoadState: RecentWorkoutSessionsLoadState): string {
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(HomeView, {
    today: '2026-11-17', timerLabel: '3 × 3:00',
    featuredPlanLoadState: { status: 'success', plan: null },
    recentSessionsLoadState,
    onRetryLoadFeaturedPlan: () => {},
    onRetryLoadRecentSessions: () => {},
  })))
}

describe('home recent sessions', () => {
  it('keeps one hidden heading and the date in the storm card', () => {
    const html = renderHome({ status: 'success', sessions: [] })
    expect(html).toContain('<h1 class="sr-only">Start</h1>')
    expect(html).toContain('storm-decoration')
    expect(html).toContain('Dziś, wt 17.11 · trening własny')
    expect(html).not.toContain('Gotowy do treningu?')
  })

  it('formats the today card label for club and own workouts', () => {
    expect(homeCardDate('2026-11-19', 'club')).toBe('Dziś, czw 19.11 · klub')
    expect(homeCardDate('2026-11-19')).toBe('Dziś, czw 19.11 · trening własny')
  })
  it('announces session loading', () => {
    const html = renderHome({ status: 'loading' })
    expect(html).toContain('role="status"')
    expect(html).toContain('Ładowanie sesji…')
  })

  it('keeps empty history without an extra session card', () => {
    const html = renderHome({ status: 'success', sessions: [] })
    expect(html).not.toContain('aria-label="Ostatnia sesja"')
    expect(html).not.toContain('/report')
  })

  it('shows the load error and retry button', () => {
    const html = renderHome({ status: 'error', message: 'Read failed' })
    expect(html).toContain('role="alert"')
    expect(html).toContain('Read failed')
    expect(html).toContain('Spróbuj ponownie')
  })

  it('shows only the last saved session and links to its missing RPE', () => {
    const html = renderHome({
      status: 'success',
      sessions: [mapWorkoutSessionToHomeRecentSession(workoutSession({ workoutPlanNameSnapshot: 'Saved session' })),
        mapWorkoutSessionToHomeRecentSession(workoutSession({ id: 'older', workoutPlanNameSnapshot: 'Older session' }))],
    })
    expect(html).toContain('Saved session')
    expect(html).toContain('/workouts/session-1/report')
    expect(html).not.toContain('Older session')
    expect(html).toContain('/workout-sessions/session-1/feedback?rpe=1')
    expect(html).toContain('Uzupełnij RPE')
    expect(html).not.toContain('Śr.')
  })
  it('shows a recorded RPE of zero without a completion counter', () => {
    const html = renderHome({ status: 'success', sessions: [mapWorkoutSessionToHomeRecentSession(workoutSession({ rpe: 0 }))] })
    expect(html).toContain('RPE 0')
    expect(html).not.toContain('Uzupełnij RPE')
    expect(html).not.toContain('0/0')
  })
})
