import type { ActiveWorkout } from '@/application/workout/activeWorkoutRepository'
import type { PlanWorkoutSession, QuickTimerWorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { createWorkoutPlaybackTimeline } from '@/domain/workout-playback/createWorkoutPlaybackTimeline'
import { resolveRunningPlaybackAtTime } from './resolveRunningPlaybackAtTime'
import { buildRecordedWorkoutSession, recordFinalizedStep } from './workoutSessionRecording'
import { resolveWorkoutPreparation } from './resolveWorkoutPreparation'
import { finalizePlaybackSteps } from './finishPlaybackSteps'
import { applyStepDurations } from './adjustPlaybackTime'

export type ActiveWorkoutRecovery =
  | { kind: 'none' }
  | { kind: 'resume'; workout: ActiveWorkout }
  | { kind: 'interrupted'; workout: ActiveWorkout; session: PlanWorkoutSession | QuickTimerWorkoutSession }

function advanceTo(saved: ActiveWorkout, nowMs: number): ActiveWorkout {
  const timeline = createWorkoutPlaybackTimeline(saved.plan)
  timeline.steps = applyStepDurations(timeline.steps, saved.stepDurations)
  if (saved.playback.status === 'paused' || saved.deadlineMs === null) return saved
  if (saved.playback.status === 'preparing') {
    const resolved = resolveWorkoutPreparation(saved.playback, saved.deadlineMs, nowMs, timeline.steps)
    if (resolved.startedAtMs !== null) {
      return advanceTo({
        ...saved,
        playback: { ...saved.playback, status: 'running', currentStepIndex: 0, remainingSeconds: timeline.steps[0].durationSeconds },
        deadlineMs: resolved.startedAtMs + timeline.steps[0].durationSeconds * 1000,
        recorder: { ...saved.recorder, sessionId: saved.recorder.sessionId ?? `${saved.plan.id}-${resolved.startedAtMs}`,
          startedAt: new Date(resolved.startedAtMs).toISOString() },
      }, nowMs)
    }
    return { ...saved, playback: resolved.playback, deadlineMs: resolved.deadlineMs }
  }
  const resolved = resolveRunningPlaybackAtTime(saved.playback, saved.deadlineMs, nowMs, timeline.steps)
  let recorder = saved.recorder
  const end = resolved.playback.currentStepIndex + (resolved.playback.status === 'completed' ? 1 : 0)
  for (let index = saved.playback.currentStepIndex; index < end; index += 1) {
    const step = timeline.steps[index]
    recorder = recordFinalizedStep(recorder, timeline.steps, {
      type: 'stepFinalized', stepIndex: index, playbackStepId: step.id,
      plannedDurationSeconds: step.durationSeconds,
      performedDurationSeconds: step.durationSeconds, performedDurationMs: step.durationSeconds * 1000,
      outcome: 'completed', reason: 'elapsed',
    })
  }
  return { ...saved, ...resolved, recorder }
}

export function resolveActiveWorkout(saved: ActiveWorkout | null, nowMs: number): ActiveWorkoutRecovery {
  if (!saved) return { kind: 'none' }
  if (saved.playback.status === 'completed' && saved.recorder.completedAt !== null) return { kind: 'resume', workout: saved }
  const current = advanceTo(saved, nowMs)
  if (current.playback.status !== 'completed' && nowMs - saved.lastSeenAt <= 12 * 60 * 60 * 1000) {
    return { kind: 'resume', workout: current }
  }

  // Never count work performed while absent when the entire plan would already be over.
  const cutoff = advanceTo(saved, saved.lastSeenAt)
  const steps = applyStepDurations(createWorkoutPlaybackTimeline(saved.plan).steps, saved.stepDurations)
  let recording = cutoff.recorder
  if (cutoff.playback.status === 'running' || cutoff.playback.status === 'paused') {
    const remainingMs = cutoff.deadlineMs === null
      ? cutoff.pausedRemainingMs ?? cutoff.playback.remainingSeconds * 1000
      : Math.max(0, cutoff.deadlineMs - saved.lastSeenAt)
    const elapsedMs = Math.max(0, steps[cutoff.playback.currentStepIndex].durationSeconds * 1000 - remainingMs)
    for (const event of finalizePlaybackSteps(steps, cutoff.playback.currentStepIndex, steps.length,
      cutoff.playback.remainingSeconds, elapsedMs, 'endEarly')) {
      if (event.type === 'stepFinalized') recording = recordFinalizedStep(recording, steps, event)
    }
  }
  const result = buildRecordedWorkoutSession(saved.plan, steps, recording, saved.lastSeenAt, true, saved.source)
  return result.kind === 'noWork' ? { kind: 'none' } : { kind: 'interrupted', workout: saved, session: result.session }
}
