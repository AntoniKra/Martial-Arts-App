import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import { resolveWorkoutPlanDisplayName } from '@/domain/workout/workoutPlanDisplayName'
import type {
  ExerciseConfiguration,
  WorkoutBlock,
  WorkoutExercise,
  WorkoutPlanDraft,
} from '@/domain/workout/workout.types'

const ROUND_COUNT_MIN = 1
const ROUND_COUNT_MAX = 99

export type WorkoutPlanValidationIssueCode =
  | 'missing_discipline'
  | 'invalid_display_name'
  | 'no_blocks'
  | 'no_exercises'
  | 'block_without_exercises'
  | 'break_first_in_block'
  | 'consecutive_breaks'
  | 'empty_exercise_name'
  | 'invalid_exercise_configuration'
  | 'invalid_break_duration'

export interface WorkoutPlanValidationIssue {
  code: WorkoutPlanValidationIssueCode
  messagePl: string
  blockId?: string
  itemId?: string
}

export interface WorkoutPlanValidationResult {
  isValid: boolean
  issues: WorkoutPlanValidationIssue[]
}

function isPositiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0
}

function isNonNegativeSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0
}

function formatBlockSubject(blockNumber: number, blockLabel: string): string {
  return `Blok ${blockNumber} — ${blockLabel}`
}

function formatBlockLocation(blockNumber: number, blockLabel: string): string {
  return `w bloku ${blockNumber} — ${blockLabel}`
}

function formatItemPosition(itemIndex: number): number {
  return itemIndex + 1
}

function countExercisesInBlock(block: WorkoutBlock): number {
  return block.items.reduce((count, item) => (item.type === 'exercise' ? count + 1 : count), 0)
}

function validateExerciseConfiguration(configuration: ExerciseConfiguration): boolean {
  if (configuration.mode === 'rounds') {
    return (
      isPositiveSafeInteger(configuration.roundCount) &&
      configuration.roundCount >= ROUND_COUNT_MIN &&
      configuration.roundCount <= ROUND_COUNT_MAX &&
      isPositiveSafeInteger(configuration.roundDurationSeconds) &&
      isNonNegativeSafeInteger(configuration.restBetweenRoundsSeconds)
    )
  }

  if (configuration.mode === 'continuous') {
    return isPositiveSafeInteger(configuration.durationSeconds)
  }

  return false
}

function validateExercise(
  exercise: WorkoutExercise,
  blockId: string,
  blockNumber: number,
  blockLabel: string,
  itemIndex: number,
  issues: WorkoutPlanValidationIssue[],
): void {
  const itemPosition = formatItemPosition(itemIndex)
  const blockLocation = formatBlockLocation(blockNumber, blockLabel)
  const trimmedName = exercise.exerciseNameSnapshot.trim()

  if (trimmedName.length === 0) {
    issues.push({
      code: 'empty_exercise_name',
      messagePl: `Ćwiczenie na pozycji ${itemPosition} ${blockLocation} musi mieć nazwę.`,
      blockId,
      itemId: exercise.id,
    })
  }

  if (!validateExerciseConfiguration(exercise.configuration)) {
    const messagePl =
      trimmedName.length > 0
        ? `Sprawdź konfigurację ćwiczenia „${trimmedName}” na pozycji ${itemPosition} ${blockLocation}.`
        : `Sprawdź konfigurację ćwiczenia na pozycji ${itemPosition} ${blockLocation}.`

    issues.push({
      code: 'invalid_exercise_configuration',
      messagePl,
      blockId,
      itemId: exercise.id,
    })
  }
}

function validateBreakDuration(
  durationSeconds: number,
  breakItemId: string,
  blockId: string,
  blockNumber: number,
  blockLabel: string,
  itemIndex: number,
  issues: WorkoutPlanValidationIssue[],
): void {
  if (!isPositiveSafeInteger(durationSeconds)) {
    const itemPosition = formatItemPosition(itemIndex)
    const blockLocation = formatBlockLocation(blockNumber, blockLabel)

    issues.push({
      code: 'invalid_break_duration',
      messagePl: `Przerwa na pozycji ${itemPosition} ${blockLocation} musi mieć dodatni czas trwania.`,
      blockId,
      itemId: breakItemId,
    })
  }
}

function validateBlockStructure(
  block: WorkoutBlock,
  blockNumber: number,
  issues: WorkoutPlanValidationIssue[],
): void {
  const blockLabel = getWorkoutBlockLabelPl(block.blockType)
  const blockSubject = formatBlockSubject(blockNumber, blockLabel)
  const blockLocation = formatBlockLocation(blockNumber, blockLabel)
  const exerciseCount = countExercisesInBlock(block)

  if (exerciseCount === 0) {
    issues.push({
      code: 'block_without_exercises',
      messagePl: `${blockSubject} musi zawierać co najmniej jedno ćwiczenie.`,
      blockId: block.id,
    })
  }

  if (block.items.length === 0) {
    return
  }

  const firstItem = block.items[0]

  if (firstItem.type === 'break') {
    issues.push({
      code: 'break_first_in_block',
      messagePl: `Przerwa nie może być pierwszym elementem ${blockLocation}.`,
      blockId: block.id,
      itemId: firstItem.id,
    })
  }

  for (let itemIndex = 0; itemIndex < block.items.length; itemIndex += 1) {
    const item = block.items[itemIndex]

    if (item.type === 'break') {
      validateBreakDuration(
        item.durationSeconds,
        item.id,
        block.id,
        blockNumber,
        blockLabel,
        itemIndex,
        issues,
      )

      const nextItem = block.items[itemIndex + 1]

      if (nextItem?.type === 'break') {
        const laterBreakPosition = formatItemPosition(itemIndex + 1)

        issues.push({
          code: 'consecutive_breaks',
          messagePl: `Przerwa na pozycji ${laterBreakPosition} ${blockLocation} następuje bezpośrednio po innej przerwie. Połącz je lub usuń jedną z nich.`,
          blockId: block.id,
          itemId: nextItem.id,
        })
      }

      continue
    }

    validateExercise(item, block.id, blockNumber, blockLabel, itemIndex, issues)
  }
}

export function validateWorkoutPlanDraft(draft: WorkoutPlanDraft): WorkoutPlanValidationResult {
  const issues: WorkoutPlanValidationIssue[] = []

  if (draft.disciplineKey === null) {
    issues.push({
      code: 'missing_discipline',
      messagePl: 'Najpierw wybierz dyscyplinę.',
    })
  }

  if (resolveWorkoutPlanDisplayName(draft).trim().length === 0) {
    issues.push({
      code: 'invalid_display_name',
      messagePl: 'Plan musi mieć poprawną nazwę wynikową.',
    })
  }

  if (draft.blocks.length === 0) {
    issues.push({
      code: 'no_blocks',
      messagePl: 'Dodaj co najmniej jeden blok treningowy.',
    })

    return {
      isValid: false,
      issues,
    }
  }

  const totalExerciseCount = draft.blocks.reduce(
    (count, block) => count + countExercisesInBlock(block),
    0,
  )

  if (totalExerciseCount === 0) {
    issues.push({
      code: 'no_exercises',
      messagePl: 'Dodaj co najmniej jedno ćwiczenie.',
    })
  }

  draft.blocks.forEach((block, blockIndex) => {
    validateBlockStructure(block, blockIndex + 1, issues)
  })

  return {
    isValid: issues.length === 0,
    issues,
  }
}
