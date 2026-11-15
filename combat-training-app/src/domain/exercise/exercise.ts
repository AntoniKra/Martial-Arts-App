import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import type { ExerciseConfiguration, WorkoutBlockType, WorkoutPlan } from '@/domain/workout/workout.types'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'

export const EXERCISE_TYPES = ['combination', 'drill', 'continuous'] as const
export type ExerciseType = typeof EXERCISE_TYPES[number]

export interface PersonalExercise {
  id: string
  namePl: string
  type: ExerciseType
  blockTypes: WorkoutBlockType[]
  disciplines: DisciplineKey[]
  defaultConfiguration: ExerciseConfiguration
  copiedFromId?: string
  archivedAt: string | null
  favorite: boolean
  lastUsedAt: string | null
  createdAt: string
  updatedAt: string
}

export function normalizeExerciseSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[łŁ]/g, 'l')
    .toLowerCase().replace(/(?:[-=]+>|[←-⇿⟰-⟿➔-➿])/g, ' ').replace(/\s+/g, ' ').trim()
}

export function selectExerciseSections(exercises: readonly PersonalExercise[]) {
  const active = exercises.filter((exercise) => exercise.archivedAt === null)
  const alphabetical = (a: PersonalExercise, b: PersonalExercise) => a.namePl.localeCompare(b.namePl, 'pl') || a.id.localeCompare(b.id)
  return {
    recent: active.filter((exercise) => exercise.lastUsedAt !== null).sort((a, b) =>
      b.lastUsedAt!.localeCompare(a.lastUsedAt!) || alphabetical(a, b)).slice(0, 5),
    favorites: active.filter((exercise) => exercise.favorite).sort(alphabetical),
    all: [...active].sort(alphabetical),
  }
}

export function exerciseIsReferenced(id: string, plans: readonly WorkoutPlan[], sessions: readonly WorkoutSession[], skills: readonly FocusSkill[]): boolean {
  return plans.some((plan) => plan.blocks.some((block) => block.items.some((item) => item.type === 'exercise' && item.combinationId === id)))
    || sessions.some((session) => (session.source === 'plan' && session.stepResults.some((step) => step.combinationId === id))
      || (session.source !== 'quickTimer' && session.focusRatings.some((rating) => skills.some((skill) => skill.id === rating.focusSkillId && skill.exerciseId === id))))
}

export function archiveExercise(exercise: PersonalExercise, at: string): PersonalExercise {
  return { ...exercise, archivedAt: at, updatedAt: at }
}

export function restoreExercise(exercise: PersonalExercise, at: string): PersonalExercise {
  return { ...exercise, archivedAt: null, updatedAt: at }
}
