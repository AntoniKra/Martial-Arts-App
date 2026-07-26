import type { WorkoutSession, WorkoutSessionStepResult } from '@/domain/workout-session/workoutSession.types'

export interface WorkoutSessionSummary {
  activeDurationSeconds: number
  plannedStepCount: number
  completedStepCount: number
  partialStepCount: number
  skippedStepCount: number
  plannedExerciseStepCount: number
  completedExerciseStepCount: number
  partialExerciseStepCount: number
  skippedExerciseStepCount: number
  plannedRoundCount: number
  completedRoundCount: number
}

function isExerciseStep(step: WorkoutSessionStepResult): boolean {
  return step.kind === 'exercise'
}

function isPlannedRound(step: WorkoutSessionStepResult): boolean {
  return isExerciseStep(step) && step.roundNumber !== null
}

function isCompletedRound(step: WorkoutSessionStepResult): boolean {
  return isPlannedRound(step) && step.outcome === 'completed'
}

export function calculateWorkoutSessionSummary(session: WorkoutSession): WorkoutSessionSummary {
  const stepResults = session.stepResults

  let completedStepCount = 0
  let partialStepCount = 0
  let skippedStepCount = 0
  let plannedExerciseStepCount = 0
  let completedExerciseStepCount = 0
  let partialExerciseStepCount = 0
  let skippedExerciseStepCount = 0
  let plannedRoundCount = 0
  let completedRoundCount = 0
  let activeDurationSeconds = 0

  for (const step of stepResults) {
    activeDurationSeconds += step.performedDurationSeconds

    switch (step.outcome) {
      case 'completed':
        completedStepCount += 1
        break
      case 'partial':
        partialStepCount += 1
        break
      case 'skipped':
        skippedStepCount += 1
        break
    }

    if (isExerciseStep(step)) {
      plannedExerciseStepCount += 1

      switch (step.outcome) {
        case 'completed':
          completedExerciseStepCount += 1
          break
        case 'partial':
          partialExerciseStepCount += 1
          break
        case 'skipped':
          skippedExerciseStepCount += 1
          break
      }
    }

    if (isPlannedRound(step)) {
      plannedRoundCount += 1
    }

    if (isCompletedRound(step)) {
      completedRoundCount += 1
    }
  }

  return {
    activeDurationSeconds,
    plannedStepCount: stepResults.length,
    completedStepCount,
    partialStepCount,
    skippedStepCount,
    plannedExerciseStepCount,
    completedExerciseStepCount,
    partialExerciseStepCount,
    skippedExerciseStepCount,
    plannedRoundCount,
    completedRoundCount,
  }
}
