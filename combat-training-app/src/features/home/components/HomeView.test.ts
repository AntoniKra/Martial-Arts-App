import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { HomeView } from '@/features/home/components/HomeView'
import { mapWorkoutSessionToHomeRecentSession } from '@/features/home/mappers/workoutSessionToHomeRecentSession'
import type { RecentWorkoutSessionsLoadState } from '@/features/home/types/homeView.types'
import { workoutSession } from '@/test/workoutSessionBuilders'

function renderHome(recentSessionsLoadState: RecentWorkoutSessionsLoadState): string {
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(HomeView, {
    featuredPlanLoadState: { status: 'success', plan: null },
    recentSessionsLoadState,
    onRetryLoadFeaturedPlan: () => {},
    onRetryLoadRecentSessions: () => {},
  })))
}

describe('home recent sessions', () => {
  it('announces session loading', () => {
    const html = renderHome({ status: 'loading' })
    expect(html).toContain('role="status"')
    expect(html).toContain('Ładowanie sesji…')
  })

  it('invites the first workout when history is empty without example sessions', () => {
    const html = renderHome({ status: 'success', sessions: [] })
    expect(html).toContain('Nie masz jeszcze ukończonych treningów.')
    expect(html).not.toContain('/report')
  })

  it('shows the load error and retry button', () => {
    const html = renderHome({ status: 'error', message: 'Read failed' })
    expect(html).toContain('role="alert"')
    expect(html).toContain('Read failed')
    expect(html).toContain('Spróbuj ponownie')
  })

  it('shows saved sessions and zero completion without missing RPE or ratings', () => {
    const html = renderHome({
      status: 'success',
      sessions: [mapWorkoutSessionToHomeRecentSession(workoutSession({ workoutPlanNameSnapshot: 'Saved session' }))],
    })
    expect(html).toContain('Saved session')
    expect(html).toContain('/workouts/session-1/report')
    expect(html).toContain('0%')
    expect(html).not.toContain('RPE')
    expect(html).not.toContain('Śr.')
  })
})
