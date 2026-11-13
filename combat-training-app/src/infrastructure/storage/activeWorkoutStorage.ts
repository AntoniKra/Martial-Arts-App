import * as z from 'zod/mini'
import type { ActiveWorkout, ActiveWorkoutRepository } from '@/application/workout/activeWorkoutRepository'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import { workoutPlanDocumentSchema } from '@/infrastructure/firebase/workoutDocumentSchemas'
import { createWorkoutPlaybackTimeline } from '@/domain/workout-playback/createWorkoutPlaybackTimeline'

export const ACTIVE_WORKOUT_STORAGE_PREFIX = 'combat-training.activeWorkout.'
const integer = z.number().check(z.int(), z.minimum(0), z.maximum(Number.MAX_SAFE_INTEGER))
const timestamp = z.number().check(z.int(), z.minimum(0), z.maximum(8_640_000_000_000_000))
const text = z.string().check(z.minLength(1))
const outcome = z.enum(['completed', 'partial', 'skipped'])
const blockType = z.enum(['warmup', 'technique', 'pads', 'bag', 'sparring', 'conditioning', 'strengthAndConditioning', 'cooldown'])
const rating = z.number().check(z.int(), z.minimum(1), z.maximum(5))
const correctionText = z.string().check(z.minLength(1), z.maxLength(200))

const activeWorkoutSchema = z.strictObject({
  schemaVersion: z.literal(1),
  source: z.optional(z.enum(['plan', 'quickTimer'])),
  plan: z.custom<WorkoutPlan>((value) => typeof value === 'object' && value !== null
    && workoutPlanDocumentSchema.safeParse({ schemaVersion: 1, ...value }).success),
  playback: z.strictObject({ status: z.enum(['preparing', 'running', 'paused', 'completed']),
    currentStepIndex: integer, remainingSeconds: integer, stepRevision: integer }),
  deadlineMs: z.nullable(timestamp), pausedRemainingMs: z.nullable(integer), lastSeenAt: timestamp,
  stepDurations: z.optional(z.record(text, integer.check(z.minimum(1)))),
  recorder: z.strictObject({
    timezone: text.check(z.refine((value) => {
      try { new Intl.DateTimeFormat('en', { timeZone: value }); return true } catch { return false }
    })),
    sessionId: z.nullable(text), startedAt: z.nullable(z.iso.datetime({ precision: 3 })),
    completedAt: z.nullable(timestamp), endedEarly: z.boolean(),
    stepResults: z.array(z.strictObject({ stepIndex: integer, playbackStepId: text,
      plannedDurationSeconds: integer.check(z.minimum(1)), performedDurationSeconds: integer, outcome })),
    attempts: z.array(z.strictObject({ kind: z.enum(['exercise', 'roundRest', 'break']), blockType, performedDurationMs: integer, outcome })),
    exerciseRatings: z.array(z.strictObject({ workoutItemId: text, nameSnapshot: text, blockType, rating })),
    focusRatings: z.array(z.strictObject({ workoutItemId: text, focusSkillId: text, skillNameSnapshot: text, criterionSnapshot: text,
      blockType, assessment: z.nullable(z.union([rating, z.literal('unableToRate')])),
      correction: z.nullable(z.strictObject({ problem: correctionText, fix: correctionText })),
      previousCorrectionCheck: z.nullable(z.enum(['better', 'same', 'notChecked'])),
    })).check(z.maxLength(3)),
  }),
}).check(z.refine((workout) => {
  // Bound expansion before building a timeline from externally supplied round counts.
  const stepCount = workout.plan.blocks.flatMap((block) => block.items).reduce((count, item) => {
    if (item.type === 'break' || item.configuration.mode === 'continuous') return count + 1
    return count + item.configuration.roundCount * (item.configuration.restBetweenRoundsSeconds > 0 ? 2 : 1)
      - (item.configuration.restBetweenRoundsSeconds > 0 ? 1 : 0)
  }, 0)
  if (stepCount < 1 || stepCount > 500) return false
  const steps = createWorkoutPlaybackTimeline(workout.plan).steps
  const { playback, recorder } = workout
  if (Object.keys(workout.stepDurations ?? {}).some((id) => !steps.some((step) => step.id === id))) return false
  if (!steps[playback.currentStepIndex]) return false
  const timed = playback.status === 'running' || playback.status === 'preparing'
  if (timed !== (workout.deadlineMs !== null)) return false
  if (playback.status === 'paused' && (workout.pausedRemainingMs === null
    || Math.ceil(workout.pausedRemainingMs / 1000) !== playback.remainingSeconds)) return false
  if (playback.status === 'preparing' && (playback.currentStepIndex !== 0 || recorder.startedAt !== null)) return false
  if (playback.status !== 'preparing' && (!recorder.sessionId || !recorder.startedAt)) return false
  if (recorder.startedAt && Date.parse(recorder.startedAt) > workout.lastSeenAt) return false
  if ((playback.status === 'completed') !== (recorder.completedAt !== null)) return false
  return new Set(recorder.stepResults.map((result) => result.playbackStepId)).size === recorder.stepResults.length
    && recorder.stepResults.every((result) => {
      const step = steps[result.stepIndex]
      if (!step || step.id !== result.playbackStepId) return false
      // A best result can come from an earlier adjusted attempt; restarting resets only the live target.
      const target = result.plannedDurationSeconds
      const performed = result.performedDurationSeconds
      return result.outcome === 'completed' ? performed === target
        : result.outcome === 'skipped' ? performed === 0 : performed > 0 && performed < target
    })
}))

export function createActiveWorkoutRepository(uid: string): ActiveWorkoutRepository {
  const key = ACTIVE_WORKOUT_STORAGE_PREFIX + uid
  const clear = () => { try { localStorage.removeItem(key) } catch { /* Storage may be blocked. */ } }
  return {
    clear,
    read() {
      try {
        const raw = localStorage.getItem(key)
        if (raw === null) return null
        const result = activeWorkoutSchema.safeParse(JSON.parse(raw))
        if (result.success) return result.data
      } catch { /* Invalid or unreadable snapshots are silently discarded. */ }
      clear()
      return null
    },
    save(workout: ActiveWorkout) {
      try {
        const result = activeWorkoutSchema.safeParse(workout)
        if (result.success) localStorage.setItem(key, JSON.stringify(result.data))
      } catch { /* Persistence must never stop a running timer. */ }
    },
  }
}
