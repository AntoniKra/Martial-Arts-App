import type { ActiveWorkout, WorkoutSessionRecording } from '@/application/workout/activeWorkoutRepository'
import { createQuickTimerPlan, defaultQuickTimerDraft, type QuickTimerConfig } from '@/domain/quick-timer/quickTimer'
import { createWorkoutPlaybackTimeline } from '@/domain/workout-playback/createWorkoutPlaybackTimeline'

export const quickTimerStart = Date.parse('2026-11-13T10:00:00.000Z')
export function quickTimerConfig(overrides: Partial<QuickTimerConfig> = {}): QuickTimerConfig {
  return { ...defaultQuickTimerDraft(), category: 'bag', disciplineKey: 'boxing', ...overrides }
}
export function quickTimerPlan(overrides: Partial<QuickTimerConfig> = {}) {
  return createQuickTimerPlan(quickTimerConfig(overrides), { planId: 'timer', blockId: 'block', exerciseId: 'exercise', now: new Date(quickTimerStart).toISOString() })
}
export function quickTimerRecording(plan = quickTimerPlan(), completedSteps = 5): WorkoutSessionRecording {
  const steps = createWorkoutPlaybackTimeline(plan).steps.slice(0, completedSteps)
  return { timezone: 'Europe/Warsaw', sessionId: 'session', startedAt: new Date(quickTimerStart).toISOString(),
    completedAt: null, endedEarly: false, exerciseRatings: [], focusRatings: [],
    stepResults: steps.map((step, stepIndex) => ({ stepIndex, playbackStepId: step.id, plannedDurationSeconds: step.durationSeconds, performedDurationSeconds: step.durationSeconds, outcome: 'completed' })),
    attempts: steps.map((step) => ({ kind: step.kind, blockType: step.blockType, performedDurationMs: step.durationSeconds * 1000, outcome: 'completed' })),
  }
}
export function activeQuickTimer(): ActiveWorkout {
  const plan = quickTimerPlan()
  return { schemaVersion: 1, source: 'quickTimer', plan, playback: { status: 'running', currentStepIndex: 2, remainingSeconds: 90, stepRevision: 3 },
    deadlineMs: quickTimerStart + 510_000, pausedRemainingMs: null, lastSeenAt: quickTimerStart + 420_000,
    recorder: quickTimerRecording(plan, 2) }
}
