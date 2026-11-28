import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { expect, it } from 'vitest'
import { workoutSession } from '@/test/workoutSessionBuilders'
import { WorkoutFeedbackForm } from './WorkoutFeedbackForm'
import { workoutFeedbackLabels } from './workoutFeedbackLabels'

function FeedbackTestRouter({ children }: { children?: ReactNode }) {
  return createElement(RouterProvider, { router: createMemoryRouter([{ path: '/', element: children }]) })
}

it.each([
  { skippedIndex: 0, completedCount: 1 },
  { skippedIndex: 1, completedCount: 2 },
])('numbers only visible sparring blocks with a skipped block at index $skippedIndex', ({ skippedIndex, completedCount }) => {
  const sparring = Array.from({ length: completedCount }, (_, index) => ({
    blockId: `completed-${index}`, intensity: null, rounds: 1,
  }))
  sparring.splice(skippedIndex, 0, { blockId: 'skipped', intensity: null, rounds: 0 })
  const html = renderToStaticMarkup(createElement(FeedbackTestRouter, {}, createElement(WorkoutFeedbackForm, {
    session: workoutSession({ sparring }), skills: [], pending: false, rpeCard: null, onSave: async () => {},
  })))
  expect(html.match(/Sparing \d+ · intensywność \(opcjonalnie\)/g)).toEqual(
    Array.from({ length: completedCount }, (_, index) => `Sparing ${index + 1} · intensywność (opcjonalnie)`),
  )
})

it('prefills saved intensity, leaves unknown intensity empty, and excludes entries without a completed round or block ID', () => {
  const session = workoutSession({ sparring: [
    { blockId: 'first', intensity: 'technical', rounds: 3 }, { blockId: 'second', intensity: null, rounds: 1 },
    { blockId: 'skipped', intensity: 'hard', rounds: 0 }, { blockId: 'unknown-rounds', intensity: null, rounds: null },
    { blockId: null, intensity: 'hard', rounds: 2 },
  ] })
  const html = renderToStaticMarkup(createElement(FeedbackTestRouter, {}, createElement(WorkoutFeedbackForm, {
    session, skills: [], pending: false, rpeCard: null, onSave: async () => {},
  })))
  expect(html.match(/class="grid grid-cols-3 gap-1.5"/g)).toHaveLength(2)
  expect(html).toContain('Sparing 1 · intensywność (opcjonalnie)')
  expect(html).toContain('Sparing 2 · intensywność (opcjonalnie)')
  expect(html).not.toContain('Sparing 3')
  expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
  expect(html.match(/aria-pressed="false"/g)).toHaveLength(5)
  expect(html).toMatch(/aria-pressed="true"[^>]*><span[^>]*>Techniczny<\/span>/)
  expect(html).not.toContain('✓')
  for (const { name, description } of Object.values(workoutFeedbackLabels.sparringOptions)) {
    expect(html.split(`>${name}</span> <span class="feedback-sparring-description">${description}<`)).toHaveLength(3)
  }
})

it('shows the metrics for the current session', () => {
  const session = workoutSession({ durationSeconds: 3130.8, workSeconds: 900,
    completion: { completed: 5, planned: 5, unit: 'exercise' } })
  const html = renderToStaticMarkup(createElement(FeedbackTestRouter, {}, createElement(WorkoutFeedbackForm, {
    session, skills: [], pending: false, rpeCard: null, onSave: async () => {},
  })))
  expect(html).toMatch(/<h1[^>]*>Trening ukończony<\/h1>.*Podsumowanie czasu sesji.*Czas czystej pracy<\/dt><dd[^>]*>15:00<\/dd>/)
  expect(html).toMatch(/>Trening<\/dt><dd[^>]*>52:10<\/dd>.*>Ćwiczenia<\/dt><dd[^>]*>5\/5<\/dd>/)
})
