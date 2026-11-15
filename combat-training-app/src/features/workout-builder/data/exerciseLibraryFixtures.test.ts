import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { EXERCISE_LIBRARY_FIXTURES } from '@/features/workout-builder/data/exerciseLibraryFixtures'
import { validateExerciseDefinition } from '@/features/exercises/validateExerciseDefinition'
import { WORKOUT_BLOCK_TYPES } from '@/domain/workout/workoutBlockLabels'
import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import { filterExerciseLibrary } from '@/features/workout-builder/utils/exerciseLibraryFilters'

const ALL_STRIKING = ['boxing', 'kickboxing', 'muay_thai', 'k1', 'mma_striking'] as const satisfies readonly DisciplineKey[]
const LEGACY_IDS = [
  'combo-jab-cross', 'combo-jab-cross-hook', 'combo-jab-slip-cross', 'combo-double-jab-cross',
  'combo-jab-body-cross', 'combo-cross-hook-cross', 'combo-jab-cross-low-kick', 'combo-jab-cross-body-kick',
  'combo-teep-jab-cross', 'combo-check-hook', 'combo-jab-cross-knee', 'combo-footwork-angles',
  'pads-hook-cross-hook', 'pads-counter-cross', 'pads-burst-6', 'bag-free-combinations',
  'bag-power-crosses', 'bag-body-work', 'bag-defence-counter', 'warmup-shadowboxing',
  'warmup-jump-rope', 'warmup-dynamic-stretch', 'warmup-footwork-ladder', 'sparring-technical',
  'sparring-light', 'sparring-position', 'cond-shuttle-runs', 'cond-burpees', 'cond-core-circuit',
  'cond-assault-bike', 'snc-kettlebell-swings', 'snc-push-pull-circuit', 'snc-med-ball-throws',
  'snc-sled-push', 'cooldown-hip-leg-stretch', 'cooldown-shoulder-chest-stretch',
  'cooldown-diaphragmatic-breathing', 'cooldown-calf-thigh-roll',
]

describe('exercise library fixtures', () => {
  it('matches every source CSV field through the reproducible generator', () => {
    const script = fileURLToPath(new URL('../../../../scripts/generate-exercise-library.mjs', import.meta.url))
    expect(execFileSync(process.execPath, [script, '--check'], { encoding: 'utf8' })).toContain('86 entries')
  })

  it('has 86 unique entries and preserves all 38 legacy IDs and keys', () => {
    expect(EXERCISE_LIBRARY_FIXTURES).toHaveLength(86)
    expect(new Set(EXERCISE_LIBRARY_FIXTURES.map(({ id }) => id)).size).toBe(86)
    expect(LEGACY_IDS).toHaveLength(38)
    for (const id of LEGACY_IDS) {
      expect(EXERCISE_LIBRARY_FIXTURES.find((exercise) => exercise.id === id)).toMatchObject({
        id, combinationKey: id.replace(/^combo-/, ''),
      })
    }
  })

  it.each(EXERCISE_LIBRARY_FIXTURES)('validates $id including its copy defaults', (exercise) => {
    expect(validateExerciseDefinition({ ...exercise, disciplines: exercise.disciplineKeys })).toEqual([])
    expect(exercise.category.trim()).not.toBe('')
    expect(exercise).toMatchObject({ isSystem: true, isActive: true, nameEn: null })
    expect(exercise).not.toHaveProperty('note')
    expect(exercise).not.toHaveProperty('existingId')
  })

  it.each([
    ['boxing', 56], ['kickboxing', 55], ['muay_thai', 60], ['k1', 59], ['mma_striking', 54],
  ] as const)('offers the approved number of entries for %s', (discipline, expected) => {
    const entries = filterExerciseLibrary(EXERCISE_LIBRARY_FIXTURES, discipline, null, '')
    expect(entries).toHaveLength(expected)
    expect(entries.length).toBeGreaterThanOrEqual(54)
    expect(entries.length).toBeLessThanOrEqual(60)
  })

  for (const discipline of ALL_STRIKING) {
    it.each(WORKOUT_BLOCK_TYPES)(`filters ${discipline} by block %s`, (block) => {
      const expected = EXERCISE_LIBRARY_FIXTURES.filter((entry) =>
        entry.disciplineKeys.includes(discipline) && entry.blockTypes.includes(block))
      expect(expected.length).toBeGreaterThan(0)
      expect(filterExerciseLibrary(EXERCISE_LIBRARY_FIXTURES, discipline, block, '')).toEqual(expected)
    })
  }

  it('combines category, normalized search, discipline and block filters', () => {
    expect(filterExerciseLibrary(EXERCISE_LIBRARY_FIXTURES, 'boxing', 'technique', 'LEWY PROSTY prawy PROSTY', 'Kombinacje 2-ciosowe')
      .map(({ id }) => id)).toEqual(['combo-jab-cross'])
    expect(filterExerciseLibrary(EXERCISE_LIBRARY_FIXTURES, 'boxing', 'technique', '', 'Kolana')).toEqual([])
    expect(filterExerciseLibrary(EXERCISE_LIBRARY_FIXTURES, null, null, '', 'Siła na czas')).toHaveLength(9)
    const inactive = { ...EXERCISE_LIBRARY_FIXTURES[0], isActive: false }
    expect(filterExerciseLibrary([inactive], null, null, '')).toEqual([])
  })

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
