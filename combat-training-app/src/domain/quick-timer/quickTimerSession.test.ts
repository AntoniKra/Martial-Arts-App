import { expect, it } from 'vitest'
import { quickTimerPlan, quickTimerRecording, quickTimerStart, activeQuickTimer } from '@/test/quickTimerBuilders'
import { createWorkoutPlaybackTimeline } from '@/domain/workout-playback/createWorkoutPlaybackTimeline'
import { buildRecordedWorkoutSession } from '@/features/workout-player/utils/workoutSessionRecording'
import { resolveActiveWorkout } from '@/features/workout-player/utils/resolveActiveWorkout'
import { workoutSessionDocumentSchema } from '@/infrastructure/firebase/workoutDocumentSchemas'

function recorded(category: 'bag' | 'sparring' = 'bag', completedSteps = 5, endedEarly = false) {
  const plan = quickTimerPlan({ category })
  const recording = quickTimerRecording(plan, completedSteps)
  if (endedEarly) recording.attempts.push({ kind: 'exercise', blockType: category, outcome: 'skipped', performedDurationMs: 90_375 })
  return buildRecordedWorkoutSession(plan, createWorkoutPlaybackTimeline(plan).steps, recording, quickTimerStart + 660_000, endedEarly, 'quickTimer')
}
it('records a full quick timer in rounds, without a persisted plan reference or exercise ratings', () => {
  const result = recorded()
  expect(result).toMatchObject({ kind: 'save', session: { source: 'quickTimer', status: 'completed', category: 'bag', durationSeconds: 660, workSeconds: 540,
    completion: { completed: 3, planned: 3, unit: 'round' }, sparring: [], sparringSeconds: 0 } })
  if (result.kind !== 'save') throw new Error('Missing entry')
  expect(result.session).not.toHaveProperty('workoutPlanId')
  expect(result.session).not.toHaveProperty('focusRatings')
  expect(result.session).not.toHaveProperty('exerciseRatings')
  expect(workoutSessionDocumentSchema.safeParse({ ...result.session, schemaVersion: 1 }).success).toBe(true)
})
it('records a half-finished round only in duration and keeps completed rounds as completion', () => {
  expect(recorded('bag', 2, true)).toMatchObject({ kind: 'save', session: { status: 'partial', durationSeconds: 330.375, workSeconds: 180,
    completion: { completed: 1, planned: 3, unit: 'round' }, stepResults: [{ outcome: 'completed' }, { outcome: 'completed' }, { outcome: 'skipped', performedDurationSeconds: 0 }, { outcome: 'skipped' }, { outcome: 'skipped' }] } })
})
it('records sparring with null block ID and intensity and the completed round count', () => {
  expect(recorded('sparring', 2, true)).toMatchObject({ kind: 'save', session: { category: 'sparring', sparringSeconds: 180,
    sparring: [{ blockId: null, intensity: null, rounds: 1 }] } })
})
it('does not save a quick timer with no completed work', () => {
  expect(recorded('bag', 0, true)).toEqual({ kind: 'noWork' })
})
it.each([700_000, 13 * 60 * 60_000])('recovers an interrupted quick timer at lastSeenAt after %s ms', (absence) => {
  const active = activeQuickTimer()
  expect(resolveActiveWorkout(active, active.lastSeenAt + absence)).toMatchObject({ kind: 'interrupted', session: { source: 'quickTimer', status: 'partial',
    durationSeconds: 330, workSeconds: 180, completion: { completed: 1, planned: 3, unit: 'round' } } })
})
it('rebuilds a finalized unsaved quick timer through the same source-aware function as the recorder', () => {
  const active = activeQuickTimer()
  active.playback = { ...active.playback, status: 'completed', currentStepIndex: 4, remainingSeconds: 0 }
  active.deadlineMs = null
  active.recorder = { ...quickTimerRecording(active.plan), completedAt: quickTimerStart + 660_000 }
  const recovery = resolveActiveWorkout(active, quickTimerStart + 900_000)
  expect(recovery.kind).toBe('resume')
  const entry = buildRecordedWorkoutSession(active.plan, createWorkoutPlaybackTimeline(active.plan).steps, active.recorder, active.recorder.completedAt!, false, active.source)
  expect(entry).toMatchObject({ kind: 'save', session: { source: 'quickTimer', completion: { completed: 3, planned: 3, unit: 'round' } } })
})
