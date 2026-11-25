import { describe, expect, it } from 'vitest'

import type { PersonalExercise } from '@/domain/exercise/exercise'
import { resolveExerciseType } from './resolveExerciseType'

const personal = {
  id: 'mine-1', namePl: 'Moje', type: 'continuous', blockTypes: ['warmup'], disciplines: ['boxing'],
  defaultConfiguration: { mode: 'continuous', durationSeconds: 60 }, archivedAt: null, favorite: false,
  lastUsedAt: null, createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z',
} satisfies PersonalExercise

describe('resolveExerciseType', () => {
  it('reads the type of a built-in library exercise', () => {
    expect(resolveExerciseType({ combinationId: 'combo-jab-cross', personalExercises: [] })).toBe('combination')
  })

  it('reads the type of a personal exercise', () => {
    expect(resolveExerciseType({ combinationId: 'mine-1', personalExercises: [personal] })).toBe('continuous')
  })

  it('uses the type chosen for a new custom exercise', () => {
    expect(resolveExerciseType({ combinationId: null, personalExercises: [], customType: 'drill' })).toBe('drill')
  })

  it('has no type for a one-off exercise without one', () => {
    expect(resolveExerciseType({ combinationId: null, personalExercises: [] })).toBeNull()
    expect(resolveExerciseType({ combinationId: 'missing', personalExercises: [] })).toBeNull()
  })
})
