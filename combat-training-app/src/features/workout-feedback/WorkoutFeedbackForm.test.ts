import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import { workoutSession } from '@/test/workoutSessionBuilders'
import { WorkoutFeedbackForm } from './WorkoutFeedbackForm'
import { sparringIntensityLabels } from './sparringIntensityLabels'

it.each([
  { skippedIndex: 0, completedCount: 1 },
  { skippedIndex: 1, completedCount: 2 },
])('numbers only visible sparring blocks with a skipped block at index $skippedIndex', ({ skippedIndex, completedCount }) => {
  const sparring = Array.from({ length: completedCount }, (_, index) => ({
    blockId: `completed-${index}`, intensity: null, rounds: 1,
  }))
  sparring.splice(skippedIndex, 0, { blockId: 'skipped', intensity: null, rounds: 0 })
  const html = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(WorkoutFeedbackForm, {
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
  const html = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(WorkoutFeedbackForm, {
    session, skills: [], pending: false, rpeCard: null, onSave: async () => {},
  })))
  expect(html).toContain('Sparing 1 · intensywność (opcjonalnie)')
  expect(html).toContain('Sparing 2 · intensywność (opcjonalnie)')
  expect(html).not.toContain('Sparing 3')
  expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
  expect(html.match(/aria-pressed="false"/g)).toHaveLength(5)
  expect(html).toMatch(new RegExp(`aria-pressed="true"[^>]*><span[^>]*>✓ </span>${sparringIntensityLabels.technical}`))
  for (const label of Object.values(sparringIntensityLabels)) expect(html.split(label)).toHaveLength(3)
})

it('uses the same metrics for both runs and shows the previous date, missing RPE, notice and link without previous ratings', () => {
  const previous = workoutSession({ id: 'previous', durationSeconds: 3130.8, workSeconds: 900,
    completedAt: '2026-11-06T10:00:00.000Z', completion: { completed: 5, planned: 5, unit: 'exercise' },
    rpe: null, exerciseRatings: [{ workoutItemId: 'old', nameSnapshot: 'Hidden previous exercise', blockType: 'bag', rating: 2 }] })
  const html = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(WorkoutFeedbackForm, {
    session: { ...previous, id: 'current', exerciseRatings: [] }, skills: [], pending: false, rpeCard: null,
    previousRun: { session: previous, planChanged: true }, onSave: async () => {},
  })))
  for (const value of ['52:10', '15:00', '5/5']) expect(html.split(`>${value}<`)).toHaveLength(3)
  expect(html).toContain('Poprzednio ten plan: 6 lis')
  expect(html).toContain('RPE: brak')
  expect(html).toContain('Plan zmieniono po tamtym treningu.')
  expect(html).toContain('href="/workout-sessions/previous/feedback"')
  expect(html).not.toContain('Hidden previous exercise')
})

it.each([0, 7])('shows previous RPE %s without a plan-edit notice', (rpe) => {
  const session = workoutSession()
  const html = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(WorkoutFeedbackForm, {
    session, skills: [], pending: false, rpeCard: null, previousRun: { session: { ...session, rpe }, planChanged: false }, onSave: async () => {},
  })))
  expect(html).toContain(`RPE: ${rpe}`)
  expect(html).not.toContain('Plan zmieniono po tamtym treningu.')
})

it('omits the comparison entirely when there is no previous run', () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(WorkoutFeedbackForm, {
    session: workoutSession(), skills: [], pending: false, rpeCard: null, previousRun: null, onSave: async () => {},
  })))
  expect(html).not.toContain('Poprzednio ten plan')
  expect(html).not.toContain('previous-plan-run-heading')
})
