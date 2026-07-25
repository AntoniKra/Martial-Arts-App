import type { WorkoutBlockType } from '@/domain/workout/workout.types'

export const WORKOUT_BLOCK_LABELS_PL: Record<WorkoutBlockType, string> = {
  warmup: 'Rozgrzewka',
  technique: 'Technika',
  pads: 'Tarcze',
  bag: 'Worek',
  sparring: 'Sparing',
  conditioning: 'Kondycja',
  strengthAndConditioning: 'Siła i motoryka',
}

export const WORKOUT_BLOCK_TYPES = [
  'warmup',
  'technique',
  'pads',
  'bag',
  'sparring',
  'conditioning',
  'strengthAndConditioning',
] as const satisfies readonly WorkoutBlockType[]

export function getWorkoutBlockLabelPl(blockType: WorkoutBlockType): string {
  return WORKOUT_BLOCK_LABELS_PL[blockType]
}
