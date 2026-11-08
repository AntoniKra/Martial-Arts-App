import type {
  PlanWorkoutSession,
  WorkoutSessionStepResult,
} from '@/domain/workout-session/workoutSession.types'
import { definePlanWorkoutSession, calculateWorkoutSessionDurations } from '@/domain/workout-session/workoutSessionDefinitions'

export function sessionStep(overrides: Partial<WorkoutSessionStepResult> = {}): WorkoutSessionStepResult {
  return {
    playbackStepId: 'step-1',
    workoutItemId: 'exercise-1',
    blockId: 'block-1',
    blockType: 'technique',
    kind: 'exercise',
    nameSnapshot: 'Exercise',
    roundNumber: null,
    roundCount: null,
    plannedDurationSeconds: 60,
    performedDurationSeconds: 60,
    outcome: 'completed',
    ...overrides,
  }
}

export function workoutSession(overrides: Partial<PlanWorkoutSession> = {}): PlanWorkoutSession {
  const stepResults = overrides.stepResults ?? []
  return {
    ...definePlanWorkoutSession({
      id: 'session-1',
      workoutPlanId: 'plan-1',
      workoutPlanNameSnapshot: 'Workout',
      disciplineKey: 'boxing',
      startedAt: '2026-11-02T09:00:00.000Z',
      completedAt: '2026-11-02T10:00:00.000Z',
      stepResults,
      note: null,
    }, {
      timezone: 'Europe/Warsaw',
      blockTypes: stepResults.map((step) => step.blockType),
      endedEarly: false,
      durations: calculateWorkoutSessionDurations(stepResults.map((step) => ({
        ...step, performedDurationMs: step.performedDurationSeconds * 1000,
      }))),
    }),
    ...overrides,
  }
}
