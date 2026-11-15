import type { PersonalExercise } from '@/domain/exercise/exercise'
import { EXERCISE_TYPES } from '@/domain/exercise/exercise'
import { DISCIPLINE_LABELS_PL } from '@/domain/discipline/disciplineLabels'
import { WORKOUT_BLOCK_TYPES } from '@/domain/workout/workoutBlockLabels'
import { exerciseLabels as labels } from './exerciseLabels'

export type ExerciseDefinition = Pick<PersonalExercise, 'namePl' | 'type' | 'disciplines' | 'blockTypes' | 'defaultConfiguration'>

export function validateExerciseDefinition(value: ExerciseDefinition): string[] {
  const errors: string[] = []
  if (!value.namePl.trim() || value.namePl.trim().length > 100) errors.push(labels.invalidName)
  if (!EXERCISE_TYPES.includes(value.type) || value.disciplines.length === 0 || value.blockTypes.length === 0
    || value.disciplines.some((key) => !(key in DISCIPLINE_LABELS_PL)) || value.blockTypes.some((key) => !WORKOUT_BLOCK_TYPES.includes(key))
    || new Set(value.disciplines).size !== value.disciplines.length || new Set(value.blockTypes).size !== value.blockTypes.length) errors.push(labels.invalidSelection)
  const positive = (number: number) => Number.isSafeInteger(number) && number >= 1 && number <= 86400
  const config = value.defaultConfiguration
  if (config.mode === 'rounds' ? !Number.isSafeInteger(config.roundCount) || config.roundCount < 1 || config.roundCount > 99
      || !positive(config.roundDurationSeconds) || !Number.isSafeInteger(config.restBetweenRoundsSeconds)
      || config.restBetweenRoundsSeconds < 0 || config.restBetweenRoundsSeconds > 86400
    : !positive(config.durationSeconds)) errors.push(labels.invalidConfiguration)
  return errors
}
