import type { WorkoutSessionRecording } from '@/application/workout/activeWorkoutRepository'
import type { WorkoutPlaybackStep } from '../types/workoutPlayback.types'
import type { WorkoutPlaybackEvent } from '../types/workoutPlaybackEvents.types'
import { mergeTrackedStepResult, type TrackedStepResult } from './mergeTrackedStepResult'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import { calculateWorkoutSessionDurations, createPlanWorkoutSession, type PlanWorkoutSessionResult } from '@/domain/workout-session/workoutSessionDefinitions'
import { mapPlaybackStepToSessionStepResult } from '../mappers/mapPlaybackStepToSessionStepResult'

export function buildRecordedWorkoutSession(
  plan: WorkoutPlan, steps: readonly WorkoutPlaybackStep[], recording: WorkoutSessionRecording,
  completedAtMs: number, endedEarly: boolean,
): PlanWorkoutSessionResult {
  if (!recording.sessionId || !recording.startedAt) return { kind: 'noWork' }
  const result = createPlanWorkoutSession({
    id: recording.sessionId, workoutPlanId: plan.id, workoutPlanNameSnapshot: plan.nameSnapshot,
    disciplineKey: plan.disciplineKey, startedAt: recording.startedAt, completedAt: new Date(completedAtMs).toISOString(),
    stepResults: steps.map((step) => {
      const tracked = recording.stepResults.find((value) => value.playbackStepId === step.id)
      return mapPlaybackStepToSessionStepResult(step, tracked?.performedDurationSeconds ?? 0, tracked?.outcome ?? 'skipped')
    }), note: null,
  }, {
    timezone: recording.timezone,
    blockTypes: plan.blocks.map((block) => block.blockType), blocks: plan.blocks, endedEarly,
    durations: calculateWorkoutSessionDurations(recording.attempts),
  })
  if (result.kind === 'save') {
    result.session.exerciseRatings = recording.exerciseRatings
    result.session.focusRatings = recording.focusRatings
  }
  return result
}

export function recordFinalizedStep(
  recording: WorkoutSessionRecording,
  steps: readonly WorkoutPlaybackStep[],
  event: Extract<WorkoutPlaybackEvent, { type: 'stepFinalized' }>,
): WorkoutSessionRecording {
  const step = steps[event.stepIndex]
  if (!step || step.id !== event.playbackStepId) return recording
  const incoming: TrackedStepResult = {
    stepIndex: event.stepIndex, playbackStepId: step.id, plannedDurationSeconds: step.durationSeconds,
    performedDurationSeconds: event.performedDurationSeconds, outcome: event.outcome,
  }
  const existing = recording.stepResults.find((result) => result.playbackStepId === step.id)
  return {
    ...recording,
    attempts: [...recording.attempts, {
      kind: step.kind, blockType: step.blockType, performedDurationMs: event.performedDurationMs, outcome: event.outcome,
    }],
    stepResults: [...recording.stepResults.filter((result) => result.playbackStepId !== step.id), mergeTrackedStepResult(existing, incoming)],
  }
}
