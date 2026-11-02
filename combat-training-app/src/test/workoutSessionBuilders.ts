import type {
  WorkoutSession,
  WorkoutSessionStepResult,
} from '@/domain/workout-session/workoutSession.types'

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

export function workoutSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 'session-1',
    workoutPlanId: 'plan-1',
    workoutPlanNameSnapshot: 'Workout',
    disciplineKey: 'boxing',
    startedAt: '2026-11-02T09:00:00.000Z',
    completedAt: '2026-11-02T10:00:00.000Z',
    stepResults: [],
    note: null,
    ...overrides,
  }
}
