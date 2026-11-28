import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import type { FocusRating } from '@/domain/workout-session/workoutSession.types'
import { manualFocusRating } from '@/test/manualWorkoutBuilder'
import { sessionStep, workoutSession } from '@/test/workoutSessionBuilders'
import { FocusCard } from './FocusCard'

const rating: FocusRating = {
  workoutItemId: 'exercise-1',
  focusSkillId: 'guard',
  skillNameSnapshot: 'Powrót do gardy',
  criterionSnapshot: 'Ręka wraca do brody.',
  blockType: 'bag',
  assessment: 4,
  correction: null,
  previousCorrectionCheck: null,
}
const completed = workoutSession({ stepResults: [sessionStep()] })
const skipped = workoutSession({
  stepResults: [sessionStep({ outcome: 'skipped', performedDurationSeconds: 0 })],
})

const collapsedDetails = /<div[^>]*hidden=""[^>]*class="feedback-focus-details"/
const cardProps = { skills: [], first: true, onChange: () => {} }
const skill: FocusSkill = {
  id: rating.focusSkillId,
  name: rating.skillNameSnapshot,
  criterion: rating.criterionSnapshot,
  openCorrection: { sessionId: 'earlier', workoutDate: '2026-11-01', problem: 'Ręka opada.', fix: 'Wracam do gardy.' },
  archivedAt: null,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
}

it.each([
  [4, 'Poziom 4 · Zwykle się udaje, błąd sam łapię i poprawiam.'],
  ['unableToRate', 'Nie umiem ocenić'],
] as const)('starts a saved summary assessment %s collapsed with its full accessible name', (assessment, description) => {
  const html = renderToStaticMarkup(createElement(FocusCard, {
    ...cardProps, session: completed, rating: { ...rating, assessment },
  }))
  expect(html).toMatch(collapsedDetails)
  expect(html).toContain(`aria-label="Powrót do gardy — ${description} · Zmień"`)
})

it('keeps an unrated card open and a skipped card outside the rating interaction', () => {
  const unrated = renderToStaticMarkup(createElement(FocusCard, {
    ...cardProps, session: completed, rating: { ...rating, assessment: null },
  }))
  const skippedCard = renderToStaticMarkup(createElement(FocusCard, { ...cardProps, session: skipped, rating }))
  expect(unrated).not.toMatch(collapsedDetails)
  expect(unrated).toContain('Jak dobrze ci wychodziło?')
  expect(skippedCard).not.toMatch(collapsedDetails)
  expect(skippedCard).not.toContain('Zmień')
  expect(skippedCard).toContain('Pominięte w treningu')
})

it.each([
  [null, 'Dodaj notatkę: błąd i wskazówka'],
  [{ problem: 'Ręka opada.', fix: 'Wracam do gardy.' }, 'Wracam do gardy.'],
] as const)('renders the note action or saved form after the hidden assessment details', (correction, noteText) => {
  const html = renderToStaticMarkup(createElement(FocusCard, {
    ...cardProps, session: completed, rating: { ...rating, correction },
  }))
  expect(html).toMatch(collapsedDetails)
  const noteSection = html.split('</fieldset></div></div><div class="feedback-card-section">')[1]
  expect(noteSection).toContain(noteText)
})

it('keeps a saved rating open until the earlier correction has an answer', () => {
  const props = { ...cardProps, session: completed, skills: [skill] }
  const unanswered = renderToStaticMarkup(createElement(FocusCard, { ...props, rating }))
  const answered = renderToStaticMarkup(createElement(FocusCard, {
    ...props, rating: { ...rating, previousCorrectionCheck: 'notChecked' },
  }))
  expect(unanswered).toContain('Czy ten błąd dziś się powtarzał?')
  expect(unanswered).not.toMatch(collapsedDetails)
  expect(answered).toMatch(collapsedDetails)
})

it('opens a rated summary card when a correction is invalid', () => {
  const html = renderToStaticMarkup(createElement(FocusCard, {
    ...cardProps, session: completed, rating: { ...rating, correction: { problem: 'Ręka opada.', fix: '' } },
    error: 'Uzupełnij wskazówkę.',
  }))
  expect(html).not.toMatch(collapsedDetails)
  expect(html).toContain('aria-invalid="true"')
  expect(html).toContain('Uzupełnij wskazówkę.')
})

it('keeps a saved manual assessment visible', () => {
  const html = renderToStaticMarkup(createElement(FocusCard, {
    ...cardProps, session: { id: 'manual', workoutDate: '2026-11-02' }, rating: manualFocusRating({ assessment: 4 }),
  }))
  expect(html).not.toMatch(collapsedDetails)
  expect(html).not.toContain('Zmień')
  expect(html).toContain('Poziom 4:')
})
