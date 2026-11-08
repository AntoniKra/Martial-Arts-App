import { describe, expect, it } from 'vitest'

import { EXERCISE_LIBRARY_FIXTURES } from '@/features/workout-builder/data/exerciseLibraryFixtures'

const ALL_STRIKING = ['boxing', 'kickboxing', 'muay_thai', 'k1', 'mma_striking']

describe('exercise library fixtures', () => {
  it('offers cooldown exercises for every discipline, without promising repetitions', () => {
    const cooldown = EXERCISE_LIBRARY_FIXTURES.filter((item) => item.blockTypes.includes('cooldown'))

    expect(cooldown.map((item) => [item.combinationKey, item.namePl])).toEqual([
      ['cooldown-hip-leg-stretch', 'Rozciąganie bioder i nóg'],
      ['cooldown-shoulder-chest-stretch', 'Rozciąganie barków i klatki piersiowej'],
      ['cooldown-diaphragmatic-breathing', 'Spokojny oddech przeponowy'],
      ['cooldown-calf-thigh-roll', 'Rolowanie łydek i ud'],
    ])

    for (const item of cooldown) {
      expect(item.disciplineKeys).toEqual(ALL_STRIKING)
      expect(item.blockTypes).toEqual(['cooldown'])
      expect(item.namePl.toLowerCase()).not.toContain('powtórze')
    }
  })

  it('keeps the kettlebell key and names the swing without a repetition series', () => {
    const swing = EXERCISE_LIBRARY_FIXTURES.find((item) => item.id === 'snc-kettlebell-swings')
    const strength = EXERCISE_LIBRARY_FIXTURES.filter((item) => item.blockTypes.includes('strengthAndConditioning'))

    expect(swing).toMatchObject({
      combinationKey: 'snc-kettlebell-swings',
      namePl: 'Swing kettlebell',
    })
    expect(strength.map((item) => item.namePl).join(' ').toLowerCase()).not.toContain('powtórze')
  })
})
