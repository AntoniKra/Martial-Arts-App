import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { playbackStep } from '@/test/workoutBuilders'
import { WorkoutPlayerNextPreview } from './WorkoutPlayerNextPreview'

it('shows a single next label and only the rest duration when a round rest is next', () => {
  const nextStep = { ...playbackStep('Tarcze', 65), kind: 'roundRest' as const }
  const html = renderToStaticMarkup(createElement(WorkoutPlayerNextPreview, {
    roundStep: undefined, nextStep, isLastStep: false,
  }))

  expect(html).toContain('<p class="player-next-step">Następnie: <strong>Odpoczynek (1:05)</strong></p>')
  expect(html).not.toContain('Tarcze')
})

it('keeps the exercise name, work label and round when work is next', () => {
  const nextStep = { ...playbackStep('Tarcze', 90), roundNumber: 2, roundCount: 3 }
  const html = renderToStaticMarkup(createElement(WorkoutPlayerNextPreview, {
    roundStep: nextStep, nextStep, isLastStep: false,
  }))

  expect(html).toContain('<p class="player-next-step">Następnie: <b>Tarcze</b> · Praca · Runda 2 z 3</p>')
})
