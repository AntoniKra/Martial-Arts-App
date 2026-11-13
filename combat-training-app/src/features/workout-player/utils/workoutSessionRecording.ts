import type { TrackedStepResult } from '@/domain/workout-playback/workoutPlayback.types'
import type { WorkoutSessionRecording } from '@/application/workout/activeWorkoutRepository'
import type { WorkoutPlaybackStep } from '@/domain/workout-playback/workoutPlayback.types'
import type { WorkoutPlaybackEvent } from '../types/workoutPlaybackEvents.types'
import { mergeTrackedStepResult } from './mergeTrackedStepResult'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import { calculateWorkoutSessionDurations, createPlanWorkoutSession, defineQuickTimerWorkoutSession, type RecordedWorkoutSessionResult } from '@/domain/workout-session/workoutSessionDefinitions'
import { isQuickTimerCategory } from '@/domain/quick-timer/quickTimer'
import { mapPlaybackStepToSessionStepResult } from '../mappers/mapPlaybackStepToSessionStepResult'

type ActiveWorkoutSource = 'plan' | 'quickTimer'

export function buildRecordedWorkoutSession(
  plan: WorkoutPlan, steps: readonly WorkoutPlaybackStep[], recording: WorkoutSessionRecording,
  completedAtMs: number, endedEarly: boolean,
  // Required on purpose: a missing source would silently save a quick timer as a plan entry.
  source: ActiveWorkoutSource,
): RecordedWorkoutSessionResult {
  if (!recording.sessionId || !recording.startedAt) return { kind: 'noWork' }
  const fields = {
    id: recording.sessionId, workoutPlanId: plan.id, workoutPlanNameSnapshot: plan.nameSnapshot,
    disciplineKey: plan.disciplineKey, startedAt: recording.startedAt, completedAt: new Date(completedAtMs).toISOString(),
    stepResults: steps.map((step) => {
      const tracked = recording.stepResults.find((value) => value.playbackStepId === step.id)
      return mapPlaybackStepToSessionStepResult({ ...step, durationSeconds: tracked?.plannedDurationSeconds ?? step.durationSeconds }, tracked?.performedDurationSeconds ?? 0, tracked?.outcome ?? 'skipped')
    }), note: null,
  }
  const options = {
    timezone: recording.timezone,
    blockTypes: plan.blocks.map((block) => block.blockType), blocks: plan.blocks, endedEarly,
    focusRatings: recording.focusRatings,
    durations: calculateWorkoutSessionDurations(recording.attempts),
  }
  if (source === 'quickTimer') {
    if (options.durations.workSeconds === 0) return { kind: 'noWork' }
    const category = plan.blocks[0]?.blockType
    const exercise = plan.blocks[0]?.items[0]
    if (!category || category === 'warmup' || category === 'cooldown' || !isQuickTimerCategory(category)
      || exercise?.type !== 'exercise' || exercise.configuration.mode !== 'rounds') throw new Error('Invalid quick timer plan')
    const { workoutPlanId: _planId, workoutPlanNameSnapshot: _name, ...quickFields } = fields
    return { kind: 'save', session: defineQuickTimerWorkoutSession(quickFields, { ...options, category, roundCount: exercise.configuration.roundCount }) }
  }
  const result = createPlanWorkoutSession(fields, options)
  if (result.kind === 'save') {
    result.session.exerciseRatings = recording.exerciseRatings
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
    stepIndex: event.stepIndex, playbackStepId: step.id, plannedDurationSeconds: event.plannedDurationSeconds ?? step.durationSeconds,
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
