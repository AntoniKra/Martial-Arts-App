import { expect, it } from 'vitest'
import { quickTimerPlan, quickTimerRecording, quickTimerStart } from '@/test/quickTimerBuilders'
import { buildRecordedWorkoutSession } from '@/features/workout-player/utils/workoutSessionRecording'
import { createWorkoutPlaybackTimeline } from '@/domain/workout-playback/createWorkoutPlaybackTimeline'
import { mapWorkoutSessionToHistoryListItem } from './workoutSessionHistoryListItemMapper'

it('links a quick timer to its feedback and shows rounds without an exercise counter', () => {
  const plan = quickTimerPlan()
  const result = buildRecordedWorkoutSession(plan, createWorkoutPlaybackTimeline(plan).steps, quickTimerRecording(plan), quickTimerStart + 660_000, false, 'quickTimer')
  if (result.kind !== 'save') throw new Error('Missing entry')
  expect(mapWorkoutSessionToHistoryListItem(result.session, true)).toMatchObject({ name: 'Szybki stoper', feedbackPath: '/workout-sessions/session/feedback',
    completedRounds: 3, plannedRounds: 3, plannedExercises: 0, completedExercises: 0, hasPendingWrites: true })
})
