import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { RecentSessionCard } from '@/features/home/components/RecentSessionCard'
import { mapWorkoutSessionToHomeRecentSession } from '@/features/home/mappers/workoutSessionToHomeRecentSession'
import { WorkoutHistoryCard } from '@/features/workouts/components/WorkoutHistoryCard'
import { mapWorkoutSessionToHistoryListItem } from '@/features/workouts/mappers/workoutSessionHistoryListItemMapper'
import { sessionStep, workoutSession } from '@/test/workoutSessionBuilders'
import { manualWorkoutSession } from '@/test/manualWorkoutBuilder'

describe('session card completion counters', () => {
  it('shows manual entries without completion, rounds or a bar, with an edit link and recalled RPE in history', () => {
    const session = manualWorkoutSession({ workoutDate: '2026-11-08' })
    for (const card of [createElement(RecentSessionCard, { session: mapWorkoutSessionToHomeRecentSession(session) }),
      createElement(WorkoutHistoryCard, { session: mapWorkoutSessionToHistoryListItem(session),
        onUpdateNote: async () => 'applied' as const, onDelete: async () => 'applied' as const })]) {
      const markup = renderToStaticMarkup(createElement(MemoryRouter, null, card))
      expect(markup).toContain('Trening poza aplikacją · Worek')
      expect(markup).toContain('/workout-sessions/manual/edit')
      expect(markup).toContain('Popraw')
      expect(markup).not.toMatch(/0\/0|width:|ćwiczeń|rund/)
    }
    expect(renderToStaticMarkup(createElement(MemoryRouter, null, createElement(WorkoutHistoryCard, {
      session: mapWorkoutSessionToHistoryListItem(session), onUpdateNote: async () => 'applied' as const, onDelete: async () => 'applied' as const,
    })))).toContain('RPE podane co najmniej 3 dni po treningu')
  })
  it.each([true, false])('shares ordered exercise and round labels on both cards (rounds: %s)', (hasRounds) => {
    const session = workoutSession({ stepResults: hasRounds ? [
      sessionStep({ playbackStepId: 'round-1', roundNumber: 1, roundCount: 2 }),
      sessionStep({ playbackStepId: 'round-2', roundNumber: 2, roundCount: 2, outcome: 'skipped', performedDurationSeconds: 0 }),
    ] : [sessionStep({ outcome: 'skipped', performedDurationSeconds: 0 })] })
    const home = createElement(RecentSessionCard, { session: mapWorkoutSessionToHomeRecentSession(session) })
    const history = createElement(WorkoutHistoryCard, {
      session: mapWorkoutSessionToHistoryListItem(session),
      onUpdateNote: async () => 'applied' as const, onDelete: async () => 'applied' as const,
    })
    for (const card of [home, history]) {
      const markup = renderToStaticMarkup(createElement(MemoryRouter, null, card))
      const text = markup.replace(/<[^>]+>/g, '')
      expect(text).toContain('0/1 ćwiczeń')
      expect(text).not.toContain('wykonania')
      expect(markup).toContain('width:0%')
      if (hasRounds) {
        expect(text).toContain('0/1 ćwiczeń1/2 rund')
      } else {
        expect(text).not.toContain('rund')
      }
    }
  })
})

it('shows only round completion and its percentage for quick timers on both session cards', () => {
  const plan = workoutSession({ stepResults: [1, 2, 3].map((roundNumber) => sessionStep({ playbackStepId: `round-${roundNumber}`,
    roundNumber, roundCount: 3, outcome: roundNumber === 1 ? 'completed' : 'skipped', performedDurationSeconds: roundNumber === 1 ? 60 : 0 })) })
  const session = { ...plan, source: 'quickTimer' as const, completion: { completed: 1, planned: 3, unit: 'round' as const } }
  const cards = [createElement(RecentSessionCard, { session: mapWorkoutSessionToHomeRecentSession(session) }),
    createElement(WorkoutHistoryCard, { session: mapWorkoutSessionToHistoryListItem(session),
      onUpdateNote: async () => 'applied' as const, onDelete: async () => 'applied' as const })]
  for (const card of cards) {
    const markup = renderToStaticMarkup(createElement(MemoryRouter, null, card))
    expect(markup.replace(/<[^>]+>/g, '')).toContain('1/3 rund')
    expect(markup).not.toContain('ćwiczeń')
    expect(markup).toContain('width:33%')
  }
})
