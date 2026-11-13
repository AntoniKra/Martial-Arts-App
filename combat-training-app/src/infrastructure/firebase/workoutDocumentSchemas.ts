import * as z from 'zod/mini'

export const instantSchema = z.iso.datetime({ precision: 3 })
const id = z.string().check(z.minLength(1), z.refine((value) => !value.includes('/')))
const text = z.string().check(z.minLength(1))
const integer = z.number().check(z.int(), z.minimum(0), z.maximum(Number.MAX_SAFE_INTEGER))
const positiveInteger = z.number().check(z.int(), z.minimum(1), z.maximum(Number.MAX_SAFE_INTEGER))
const discipline = z.enum(['boxing', 'kickboxing', 'muay_thai', 'k1', 'mma_striking'])
const blockType = z.enum(['warmup', 'technique', 'pads', 'bag', 'sparring', 'conditioning', 'strengthAndConditioning', 'cooldown'])
const category = z.enum(['technique', 'pads', 'bag', 'sparring', 'conditioning', 'strengthAndConditioning', 'mixed'])
const intensity = z.nullable(z.enum(['light', 'technical', 'hard']))
const rating = z.number().check(z.int(), z.minimum(1), z.maximum(5))
const configuration = z.discriminatedUnion('mode', [
  z.strictObject({ mode: z.literal('rounds'), roundCount: positiveInteger,
    roundDurationSeconds: positiveInteger, restBetweenRoundsSeconds: integer }),
  z.strictObject({ mode: z.literal('continuous'), durationSeconds: positiveInteger }),
])
const exercise = z.strictObject({ id, type: z.literal('exercise'), combinationId: z.nullable(id),
  focusSkillId: z.nullable(id), exerciseNameSnapshot: text, instruction: z.nullable(z.string()), configuration })
const breakItem = z.strictObject({ id, type: z.literal('break'), durationSeconds: positiveInteger, instruction: z.nullable(z.string()) })
const items = z.array(z.discriminatedUnion('type', [exercise, breakItem]))
const block = z.union([
  z.strictObject({ id, blockType: z.literal('sparring'), sparringIntensity: intensity, items }),
  z.strictObject({ id, blockType: z.enum(['warmup', 'technique', 'pads', 'bag', 'conditioning', 'strengthAndConditioning', 'cooldown']), items }),
])
const identity = { schemaVersion: z.literal(1), id, createdAt: instantSchema, updatedAt: instantSchema }

export const workoutPlanDocumentSchema = z.strictObject({
  ...identity, disciplineKey: discipline, customName: z.nullable(z.string()),
  nameSnapshot: text, mainGoal: z.nullable(z.string()), blocks: z.array(block),
}).check(z.refine((plan) => {
  const allItems = plan.blocks.flatMap((value) => value.items)
  return new Set(plan.blocks.map((value) => value.id)).size === plan.blocks.length
    && new Set(allItems.map((value) => value.id)).size === allItems.length
    && allItems.filter((value) => value.type === 'exercise' && value.focusSkillId !== null).length <= 3
}))

export const sessionStepSchema = z.strictObject({
  playbackStepId: id, workoutItemId: id, blockId: id, blockType,
  kind: z.enum(['exercise', 'roundRest', 'break']), nameSnapshot: text,
  roundNumber: z.nullable(positiveInteger), roundCount: z.nullable(positiveInteger),
  plannedDurationSeconds: positiveInteger, performedDurationSeconds: integer,
  outcome: z.enum(['completed', 'partial', 'skipped']),
}).check(z.refine((step) => {
  const performed = step.performedDurationSeconds
  const planned = step.plannedDurationSeconds
  const validOutcome = step.outcome === 'completed' ? performed === planned
    : step.outcome === 'skipped' ? performed === 0 : performed > 0 && performed < planned
  const validRound = step.roundNumber === null ? step.roundCount === null
    : step.kind === 'exercise' && step.roundCount !== null && step.roundNumber <= step.roundCount
  return validOutcome && validRound
}))

const sparring = z.array(z.strictObject({ blockId: z.nullable(id), intensity, rounds: z.nullable(integer) }))
const completionFields = { completed: integer, planned: integer }
const common = {
  ...identity, disciplineKey: discipline, category, workoutDate: z.iso.date(),
  timezone: z.string().check(z.regex(/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)*$/), z.refine((value) => {
    try { new Intl.DateTimeFormat('en', { timeZone: value }); return true } catch { return false }
  })),
  durationSeconds: z.number().check(z.gt(0)),
  note: z.nullable(z.string().check(z.maxLength(1000))),
  rpe: z.nullable(z.number().check(z.int(), z.minimum(0), z.maximum(10))),
  rpeRecordedAt: z.nullable(instantSchema), sparring,
}
const timed = {
  startedAt: instantSchema, completedAt: instantSchema, status: z.enum(['completed', 'partial']),
  workSeconds: integer, sparringSeconds: integer,
  stepResults: z.array(sessionStepSchema).check(z.maxLength(500)),
}
const correctionText = z.string().check(z.minLength(1), z.maxLength(200))
const focusRating = z.strictObject({
  workoutItemId: id, focusSkillId: id, skillNameSnapshot: text, criterionSnapshot: text, blockType,
  assessment: z.nullable(z.union([rating, z.literal('unableToRate')])),
  correction: z.nullable(z.strictObject({ problem: correctionText, fix: correctionText })),
  previousCorrectionCheck: z.nullable(z.enum(['better', 'same', 'notChecked'])),
})
const manualFocusRating = z.strictObject({
  ...focusRating.shape, workoutItemId: z.null(),
  blockType: z.enum(['technique', 'pads', 'bag', 'sparring', 'conditioning', 'strengthAndConditioning']),
  assessment: z.union([rating, z.literal('unableToRate')]),
})
export const workoutSessionDocumentSchema = z.discriminatedUnion('source', [
  z.strictObject({ ...common, ...timed, source: z.literal('plan'), workoutPlanId: id,
    workoutPlanNameSnapshot: text, completion: z.strictObject({ ...completionFields, unit: z.literal('exercise') }),
    focusRatings: z.array(focusRating).check(z.maxLength(3)),
    exerciseRatings: z.array(z.strictObject({ workoutItemId: id, nameSnapshot: text, blockType, rating })),
  }),
  z.strictObject({ ...common, ...timed, source: z.literal('quickTimer'),
    completion: z.strictObject({ ...completionFields, unit: z.literal('round') }),
  }),
  z.strictObject({ ...common, source: z.literal('manual'), status: z.literal('completed'),
    workSeconds: z.null(), sparringSeconds: z.null(), completion: z.null(),
    durationSeconds: z.number().check(z.int(), z.minimum(60), z.maximum(28800)),
    rpe: z.number().check(z.int(), z.minimum(0), z.maximum(10)), rpeRecordedAt: instantSchema,
    focusRatings: z.array(manualFocusRating).check(z.maxLength(3)),
    sparring: z.array(z.strictObject({ blockId: z.null(), intensity: z.enum(['light', 'technical', 'hard']),
      rounds: z.nullable(z.number().check(z.int(), z.minimum(1), z.maximum(50))) })).check(z.maxLength(1)),
  }),
]).check(z.refine((session) => {
  if ((session.rpe === null) !== (session.rpeRecordedAt === null)) return false
  if (session.source === 'manual') return new Set(session.focusRatings.map((value) => value.focusSkillId)).size === session.focusRatings.length
    && (session.category !== 'sparring' || session.sparring.length === 1)
  return session.completedAt >= session.startedAt
    && session.sparringSeconds <= session.workSeconds && session.workSeconds <= session.durationSeconds
    && session.completion.completed <= session.completion.planned
    && new Set(session.stepResults.map((step) => step.playbackStepId)).size === session.stepResults.length
}))
