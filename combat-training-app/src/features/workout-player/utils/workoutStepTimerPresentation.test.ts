import { describe, expect, it } from 'vitest'
import { getWorkoutArcProgress, getWorkoutTimerPhase } from './workoutStepTimerPresentation'

describe('workout arc presentation', () => {
  it.each([[60, 0, 0], [60, 30, .5], [60, 60, 1], [60, 75, 1], [0, 0, 0]])(
    'uses duration %i and remaining time %i to draw %f of the arc',
    (duration, remaining, expected) => {
      expect(getWorkoutArcProgress(duration, remaining)).toBe(expected)
    },
  )

  it('displays paused playback with the same arc progress', () => {
    const duration = 60
    const remaining = 4
    const beforePause = getWorkoutArcProgress(duration, remaining)
    expect(getWorkoutTimerPhase('paused', 'exercise', remaining)).toEqual({ phase: 'paused', label: 'WSTRZYMANO' })
    expect(getWorkoutArcProgress(duration, remaining)).toBe(beforePause)
  })
})

describe('workout phase presentation', () => {
  it.each([
    ['running', 'exercise', 6, 'work', 'PRACA'],
    ['running', 'roundRest', 6, 'rest', 'ODPOCZYNEK'],
    ['running', 'break', 6, 'rest', 'PRZERWA'],
    ['running', 'exercise', 5, 'warning', 'OSTATNIE SEKUNDY'],
    ['running', 'roundRest', 5, 'warning', 'OSTATNIE SEKUNDY'],
    ['paused', 'exercise', 5, 'paused', 'WSTRZYMANO'],
    ['preparing', 'exercise', 5, 'preparing', 'PRZYGOTUJ SIĘ'],
    ['idle', 'exercise', 5, 'work', 'PRACA'],
  ] as const)('displays %s %s with %is left as %s', (status, kind, seconds, phase, label) => {
    expect(getWorkoutTimerPhase(status, kind, seconds)).toEqual({ phase, label })
  })
})
