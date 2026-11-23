import { afterEach, expect, it, vi } from 'vitest'
import { quickTimerPlan, quickTimerRecording, quickTimerStart } from '@/test/quickTimerBuilders'
import { buildRecordedWorkoutSession } from '@/features/workout-player/utils/workoutSessionRecording'
import { createWorkoutPlaybackTimeline } from '@/domain/workout-playback/createWorkoutPlaybackTimeline'
import { mapWorkoutSessionToHistoryListItem } from './workoutSessionHistoryListItemMapper'
import { workoutSession } from '@/test/workoutSessionBuilders'
import { manualWorkoutSession } from '@/test/manualWorkoutBuilder'

afterEach(() => vi.useRealTimers())

it.each([
  ['2026-03-29T00:30:00Z', '2026-03-29T01:30:00Z', '2026-03-29', '29 mar', '03:30', 'CEST'],
  ['2026-10-24T23:30:00Z', '2026-10-25T02:30:00Z', '2026-10-25', '25 paź', '03:30', 'CET'],
  ['2026-11-22T22:50:00Z', '2026-11-22T23:10:00Z', '2026-11-22', '22 lis', '00:10', 'CET'],
])('keeps the workout day and labels the session zone only when it differs at %s', (startedAt, completedAt, workoutDate, dateLabelPl, timeLabelPl, zoneLabel) => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(completedAt))
  const session = workoutSession({ startedAt, completedAt: new Date().toISOString(), workoutDate })
  const expected = { workoutDate, dateLabelPl, completedAt: new Date().toISOString() }
  expect(mapWorkoutSessionToHistoryListItem(session, false, 'Europe/Warsaw')).toMatchObject({ ...expected, timeLabelPl })
  expect(mapWorkoutSessionToHistoryListItem(session, false, 'Asia/Tokyo')).toMatchObject({ ...expected, timeLabelPl: `${timeLabelPl} ${zoneLabel}` })
})

it('has no completion time for a manual workout', () => {
  expect(mapWorkoutSessionToHistoryListItem(manualWorkoutSession())).toMatchObject({ workoutDate: '2026-11-12', dateLabelPl: '12 lis', timeLabelPl: '' })
})

it('links a quick timer to its feedback and shows rounds without an exercise counter', () => {
  const plan = quickTimerPlan()
  const result = buildRecordedWorkoutSession(plan, createWorkoutPlaybackTimeline(plan).steps, quickTimerRecording(plan), quickTimerStart + 660_000, false, 'quickTimer')
  if (result.kind !== 'save') throw new Error('Missing entry')
  expect(mapWorkoutSessionToHistoryListItem(result.session, true)).toMatchObject({ name: 'Szybki stoper', feedbackPath: '/workout-sessions/session/feedback',
    completedRounds: 3, plannedRounds: 3, plannedExercises: 0, completedExercises: 0, hasPendingWrites: true })
})
