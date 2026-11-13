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
  plannedExerciseCount: number
  completedExerciseCount: number
  exerciseCompletionPercent: number
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
  const stepResults = session.source === 'manual' ? [] : session.stepResults

  let completedStepCount = 0
  let partialStepCount = 0
  let skippedStepCount = 0
  let plannedExerciseStepCount = 0
  let completedExerciseStepCount = 0
  let partialExerciseStepCount = 0
  let skippedExerciseStepCount = 0
  let plannedRoundCount = 0
  let completedRoundCount = 0
  const activeDurationSeconds = session.durationSeconds
  const exerciseCompletion = new Map<string, boolean>()

  for (const step of stepResults) {
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
      exerciseCompletion.set(
        step.workoutItemId,
        (exerciseCompletion.get(step.workoutItemId) ?? true) && step.outcome === 'completed',
      )

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

  const plannedExerciseCount = session.source === 'quickTimer' ? 0 : exerciseCompletion.size
  const completedExerciseCount = session.source === 'quickTimer' ? 0 : [...exerciseCompletion.values()].filter(Boolean).length
  const completion = session.source === 'quickTimer' ? session.completion
    : { completed: completedExerciseCount, planned: plannedExerciseCount }

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
    plannedExerciseCount,
    completedExerciseCount,
    exerciseCompletionPercent:
      completion.planned > 0 ? Math.round((completion.completed / completion.planned) * 100) : 0,
    plannedRoundCount,
    completedRoundCount,
  }
}
