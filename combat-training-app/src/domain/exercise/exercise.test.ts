import { describe, expect, it } from 'vitest'
import { archiveExercise, exerciseIsReferenced, normalizeExerciseSearch, restoreExercise, selectExerciseSections } from './exercise'
import { personalExercise } from '@/test/exerciseBuilders'
import { block, continuousExercise, workoutPlan } from '@/test/workoutBuilders'
import { sessionStep, workoutSession } from '@/test/workoutSessionBuilders'
import { createWorkoutPlaybackTimeline } from '@/domain/workout-playback/createWorkoutPlaybackTimeline'
import { mapPlaybackStepToSessionStepResult } from '@/features/workout-player/mappers/mapPlaybackStepToSessionStepResult'

describe('personal exercise identity and selection', () => {
  it.each([
    ['  ŻÓŁĆ → ŁĄKA  ', 'zolc laka'], ['żółć -> łĄka', 'zolc laka'], ['Łódź ⇢ lewy SIERP', 'lodz lewy sierp'],
    ['Jab   →  prawy prosty', 'jab prawy prosty'], ['ZAŻÓŁĆ GĘŚLĄ JAŹŃ', 'zazolc gesla jazn'],
  ])('normalizes %s', (source, expected) => expect(normalizeExerciseSearch(source)).toBe(expected))
  it('matches fragments and ignores arrows and accents in both directions', () => {
    expect(normalizeExerciseSearch('Lewy sierp → zejście').includes(normalizeExerciseSearch('SIERP zejscie'))).toBe(true)
  })
  it('limits recent to five with deterministic ties, sorts favorites and excludes archives without mutating the source', () => {
    const items = Array.from({ length: 7 }, (_, index) => personalExercise({ id: String(index), namePl: `Exercise ${index}`,
      favorite: index % 2 === 0, lastUsedAt: `2026-11-0${index + 1}T10:00:00.000Z` }))
    const original = structuredClone(items)
    const sections = selectExerciseSections([...items, personalExercise({ id: 'archived', favorite: true, archivedAt: items[0].createdAt })])
    expect(sections.recent.map((item) => item.id)).toEqual(['6', '5', '4', '3', '2'])
    expect(sections.favorites.map((item) => item.id)).toEqual(['0', '2', '4', '6'])
    expect(sections.all).toHaveLength(7)
    expect(items).toEqual(original)
    expect(selectExerciseSections([personalExercise({ id: 'b' }), personalExercise({ id: 'a' })]).all.map((item) => item.id)).toEqual(['a', 'b'])
  })
  it('archives and restores the same identity without changing its metadata', () => {
    const exercise = personalExercise({ favorite: true })
    const archived = archiveExercise(exercise, '2026-11-02T10:00:00.000Z')
    expect(archived).toMatchObject({ id: exercise.id, favorite: true, archivedAt: '2026-11-02T10:00:00.000Z' })
    expect(restoreExercise(archived, '2026-11-03T10:00:00.000Z')).toMatchObject({ id: exercise.id, archivedAt: null, favorite: true })
    expect(exercise.archivedAt).toBeNull()
  })
  it('forbids deletion for plan and immutable session references even after the plan is deleted', () => {
    const exercise = personalExercise()
    const plan = workoutPlan([block('one', [{ ...continuousExercise('one', 60), combinationId: exercise.id }])])
    expect(exerciseIsReferenced(exercise.id, [plan], [], [])).toBe(true)
    const session = workoutSession({ stepResults: [sessionStep({ combinationId: exercise.id })] })
    expect(exerciseIsReferenced(exercise.id, [], [session], [])).toBe(true)
    expect(exerciseIsReferenced('unused', [plan], [session], [])).toBe(false)
  })
  it('copies library identity and immutable name into the session without changing timer durations', () => {
    const plan = workoutPlan([block('one', [{ ...continuousExercise('one', 60), combinationId: 'personal' }])])
    const timeline = createWorkoutPlaybackTimeline(plan)
    const result = mapPlaybackStepToSessionStepResult(timeline.steps[0], 60, 'completed')
    expect(result).toMatchObject({ combinationId: 'personal', nameSnapshot: 'Exercise one', plannedDurationSeconds: 60 })
    plan.blocks[0].items[0] = { ...continuousExercise('one', 60), exerciseNameSnapshot: 'Changed' }
    expect(result.nameSnapshot).toBe('Exercise one')
  })
})
