import { expect, it } from 'vitest'
import { quickTimerPlan, quickTimerRecording, quickTimerStart } from '@/test/quickTimerBuilders'
import { createWorkoutPlaybackTimeline } from '@/domain/workout-playback/createWorkoutPlaybackTimeline'
import { buildRecordedWorkoutSession } from '@/features/workout-player/utils/workoutSessionRecording'
import { workoutSessionDocumentSchema } from '@/infrastructure/firebase/workoutDocumentSchemas'
import { prepareQuickTimerFeedback } from './quickTimerFeedback'

export function quickEntry() {
  const plan = quickTimerPlan()
  const result = buildRecordedWorkoutSession(plan, createWorkoutPlaybackTimeline(plan).steps, quickTimerRecording(plan, 2), quickTimerStart + 330_000, true, 'quickTimer')
  if (result.kind !== 'save' || result.session.source !== 'quickTimer') throw new Error('Missing quick timer entry')
  return result.session
}
it('changes bag to sparring, synchronizes step snapshots and preserves time, completion and RPE', () => {
  const session = quickEntry()
  const update = prepareQuickTimerFeedback(session, { category: 'sparring', intensity: 'technical', note: '  Notes  ' }, '2026-11-13T11:00:00.000Z')
  expect(update).toMatchObject({ category: 'sparring', note: 'Notes', updatedAt: '2026-11-13T11:00:00.000Z', sparringSeconds: 180,
    sparring: [{ blockId: null, intensity: 'technical', rounds: 1 }] })
  expect(update.stepResults.every((step) => step.blockType === 'sparring' && step.nameSnapshot === 'Sparing')).toBe(true)
  expect(workoutSessionDocumentSchema.safeParse({ ...session, ...update, schemaVersion: 1 }).success).toBe(true)
  expect(session.category).toBe('bag')
  expect(update).not.toHaveProperty('rpe')
  expect(update).not.toHaveProperty('completion')
})
it('removes sparring when changing to pads and keeps no optional note or intensity', () => {
  const session = quickEntry()
  const sparring = { ...session, ...prepareQuickTimerFeedback(session, { category: 'sparring', intensity: null, note: null }, session.updatedAt) }
  expect(sparring.sparring[0].intensity).toBeNull()
  const update = prepareQuickTimerFeedback(sparring, { category: 'pads', intensity: 'hard', note: '  ' }, '2026-11-13T11:00:00.000Z')
  expect(update).toMatchObject({ category: 'pads', sparring: [], sparringSeconds: 0, note: null })
  expect(update.stepResults.every((step) => step.blockType === 'pads' && step.nameSnapshot === 'Tarcze')).toBe(true)
  expect(workoutSessionDocumentSchema.safeParse({ ...session, ...update, schemaVersion: 1 }).success).toBe(true)
})
