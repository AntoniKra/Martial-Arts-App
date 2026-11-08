import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { setLogLevel } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const ownerId = 'athlete-one'
const documentId = '21a507bc-7f90-4b9f-a890-2ba3a53ee67a'
const instant = '2026-11-08T09:00:00.000Z'
type Document = Record<string, unknown>

function workoutPlan(): Document {
  return {
    schemaVersion: 1,
    id: documentId,
    disciplineKey: 'boxing',
    customName: null,
    nameSnapshot: 'Boxing workout',
    mainGoal: null,
    createdAt: instant,
    updatedAt: instant,
    blocks: [{
      id: 'block-one',
      blockType: 'sparring',
      sparringIntensity: null,
      items: [{
        id: 'exercise-one',
        type: 'exercise',
        combinationId: null,
        exerciseNameSnapshot: 'Sparring',
        instruction: null,
        focusSkillId: null,
        configuration: { mode: 'rounds', roundCount: 1, roundDurationSeconds: 180, restBetweenRoundsSeconds: 60 },
      }],
    }],
  }
}

function workoutSession(source: 'plan' | 'quickTimer' | 'manual'): Document {
  const common: Document = {
    schemaVersion: 1,
    id: documentId,
    source,
    status: 'completed',
    disciplineKey: 'boxing',
    category: 'sparring',
    workoutDate: '2026-11-08',
    timezone: 'Europe/Warsaw',
    durationSeconds: 180.5,
    workSeconds: source === 'manual' ? null : 180,
    sparringSeconds: source === 'manual' ? null : 180,
    completion: source === 'manual' ? null : { completed: 1, planned: 1, unit: source === 'plan' ? 'exercise' : 'round' },
    note: null,
    rpe: null,
    rpeRecordedAt: null,
    sparring: [{ blockId: source === 'plan' ? 'block-one' : null, intensity: null, rounds: 1 }],
    createdAt: instant,
    updatedAt: instant,
  }
  if (source === 'manual') return common

  const timed = {
    ...common,
    startedAt: instant,
    completedAt: '2026-11-08T09:03:00.500Z',
    stepResults: [{
      playbackStepId: 'step-one',
      workoutItemId: 'exercise-one',
      blockId: 'block-one',
      blockType: 'sparring',
      kind: 'exercise',
      nameSnapshot: 'Sparring',
      roundNumber: 1,
      roundCount: 1,
      plannedDurationSeconds: 180,
      performedDurationSeconds: 180,
      outcome: 'completed',
    }],
  }
  return source === 'quickTimer' ? timed : {
    ...timed,
    workoutPlanId: 'bc20f2ae-f7d7-4f74-b73c-4e045c36202a',
    workoutPlanNameSnapshot: 'Boxing workout',
    focusRatings: [],
    exerciseRatings: [],
  }
}

const scenarios = [
  { name: 'workout plan', collection: 'workoutPlans', create: workoutPlan },
  { name: 'plan session', collection: 'workoutSessions', create: () => workoutSession('plan') },
  { name: 'quick timer session', collection: 'workoutSessions', create: () => workoutSession('quickTimer') },
  { name: 'manual session', collection: 'workoutSessions', create: () => workoutSession('manual') },
]

let environment: RulesTestEnvironment

beforeAll(async () => {
  // Refuse standalone runs or a remote emulator; the project ID is never read from .firebaserc.
  if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080') {
    throw new Error('Run npm run test:rules with the demo Firestore emulator on 127.0.0.1:8080.')
  }
  // Permission errors are expected and asserted below; keep unexpected test failures visible.
  setLogLevel('silent')
  environment = await initializeTestEnvironment({
    projectId: 'demo-combat-training',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
    },
  })
})

beforeEach(async () => {
  await environment.clearFirestore()
})

afterAll(async () => {
  await environment?.cleanup()
})

function ownerDatabase() {
  return environment.authenticatedContext(ownerId, { email_verified: true }).firestore()
}

describe.each(scenarios)('$name', ({ collection, create }) => {
  const path = `users/${ownerId}/${collection}/${documentId}`

  it('allows the verified owner to create, read, list, update and delete', async () => {
    const database = ownerDatabase()
    const reference = database.doc(path)
    const original = create()
    await assertSucceeds(reference.set(original))
    expect((await assertSucceeds(reference.get())).data()).toEqual(original)
    expect((await assertSucceeds(database.collection(`users/${ownerId}/${collection}`).get())).size).toBe(1)
    const patch = collection === 'workoutPlans' ? { customName: 'Updated workout' } : { note: 'Updated note' }
    await assertSucceeds(reference.update(patch))
    expect((await assertSucceeds(reference.get())).data()).toMatchObject(patch)
    await assertSucceeds(reference.delete())
    expect((await assertSucceeds(reference.get())).exists).toBe(false)
  })

  it.each(['second account', 'signed out', 'unverified owner', 'missing verification claim'])(
    'denies every operation for %s',
    async (actor) => {
      await assertSucceeds(ownerDatabase().doc(path).set(create()))
      const context = actor === 'signed out' ? environment.unauthenticatedContext()
        : actor === 'second account' ? environment.authenticatedContext('athlete-two', { email_verified: true })
          : actor === 'unverified owner' ? environment.authenticatedContext(ownerId, { email_verified: false })
            : environment.authenticatedContext(ownerId)
      const database = context.firestore()
      const reference = database.doc(path)
      const newId = '8c96e427-aa39-4fe9-b566-67e9fd359c34'
      await assertFails(database.doc(`users/${ownerId}/${collection}/${newId}`).set({ ...create(), id: newId }))
      await assertFails(reference.get())
      await assertFails(database.collection(`users/${ownerId}/${collection}`).get())
      await assertFails(reference.update({ updatedAt: instant }))
      await assertFails(reference.delete())
    },
  )

  const invalidCommonFields: [string, unknown][] = [
    ['schemaVersion', 2], ['schemaVersion', '1'],
    ['id', 'another-document'], ['id', 42],
    ['disciplineKey', 'wrestling'], ['disciplineKey', null],
    ['createdAt', new Date(instant)], ['createdAt', '2026-11-08'],
    ['updatedAt', null], ['updatedAt', 42],
    ['unexpectedField', true],
  ]
  const invalidPlanFields: [string, unknown][] = [
    ['customName', 42], ['mainGoal', false], ['nameSnapshot', ''], ['nameSnapshot', null],
    ['blocks', {}], ['blocks', null],
  ]
  const invalidSessionFields: [string, unknown][] = [
    ['source', 'unknown'], ['status', 'in_progress'], ['category', 'warmup'], ['category', 'unknown'],
    ['workoutDate', '08.11.2026'], ['workoutDate', 42], ['timezone', null], ['timezone', '+01:00'],
    ['durationSeconds', 0], ['durationSeconds', -1], ['durationSeconds', '180'],
    ['workSeconds', -1], ['workSeconds', 1.5], ['sparringSeconds', '180'], ['sparringSeconds', -1],
    ['note', 'n'.repeat(1001)], ['note', 42],
    ['rpe', -1], ['rpe', 11], ['rpe', 5.5], ['rpe', '5'],
    ['rpeRecordedAt', 'yesterday'], ['rpeRecordedAt', new Date(instant)],
    ['sparring', {}], ['sparring', null],
  ]

  it.each([...invalidCommonFields, ...(collection === 'workoutPlans' ? invalidPlanFields : invalidSessionFields)])(
    'denies create and update with invalid %s (%j)',
    async (field, value) => {
      const reference = ownerDatabase().doc(path)
      const invalid = { ...create(), [field]: value }
      await assertFails(reference.set(invalid))
      await assertSucceeds(reference.set(create()))
      await assertFails(reference.update({ [field]: value }))
    },
  )

  it.each(Object.keys(create()))('denies create and replacement without required %s', async (field) => {
    const reference = ownerDatabase().doc(path)
    const incomplete = create()
    delete incomplete[field]
    await assertFails(reference.set(incomplete))
    await assertSucceeds(reference.set(create()))
    await assertFails(reference.set(incomplete))
  })

  it('allows the owner to delete even an invalid legacy document', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await assertSucceeds(context.firestore().doc(path).set({ schemaVersion: 0 }))
    })
    await assertSucceeds(ownerDatabase().doc(path).delete())
  })
})

describe.each(['plan', 'quickTimer'] as const)('%s timed session', (source) => {
  const path = `users/${ownerId}/workoutSessions/${documentId}`
  const invalidFields: [string, unknown][] = [
    ['startedAt', null], ['completedAt', '2026-11-08T08:59:59.000Z'],
    ['stepResults', {}], ['stepResults', Array.from({ length: 501 }, () => ({}))],
    ['workSeconds', null], ['sparringSeconds', null],
    ['completion', null], ['completion', []],
    ['completion', { completed: 2, planned: 1, unit: source === 'plan' ? 'exercise' : 'round' }],
    ['completion', { completed: 1, planned: 1, unit: source === 'plan' ? 'round' : 'exercise' }],
    ['completion', { completed: 1, planned: 1 }],
    ['completion', { completed: -1, planned: 1, unit: 'exercise' }],
    ['completion', { completed: 0.5, planned: 1, unit: 'round' }],
    ['completion', { completed: 1, planned: 1, unit: 'exercise', extra: true }],
    ...(source === 'plan' ? [
      ['workoutPlanId', null], ['workoutPlanNameSnapshot', ''],
      ['focusRatings', {}], ['focusRatings', Array.from({ length: 4 }, () => ({}))],
      ['exerciseRatings', null],
    ] as [string, unknown][] : [
      ['workoutPlanId', 'another-plan'], ['workoutPlanNameSnapshot', 'Not allowed'],
      ['focusRatings', []], ['exerciseRatings', []],
    ] as [string, unknown][]),
  ]

  it.each(invalidFields)('denies create and update with invalid %s (%j)', async (field, value) => {
    const reference = ownerDatabase().doc(path)
    await assertFails(reference.set({ ...workoutSession(source), [field]: value }))
    await assertSucceeds(reference.set(workoutSession(source)))
    await assertFails(reference.update({ [field]: value }))
  })

  it('allows documented boundaries and partial status without deep list validation', async () => {
    const reference = ownerDatabase().doc(path)
    const boundary = {
      ...workoutSession(source),
      status: 'partial',
      note: 'n'.repeat(1000),
      rpe: 0,
      rpeRecordedAt: instant,
      workSeconds: 0,
      sparringSeconds: 0,
      stepResults: Array.from({ length: 500 }, () => ({})),
      ...(source === 'plan' ? { focusRatings: [{}, {}, {}] } : {}),
    }
    await assertSucceeds(reference.set(boundary))
    await assertSucceeds(reference.update({ rpe: 10, stepResults: [] }))
  })
})

describe('manual session', () => {
  const path = `users/${ownerId}/workoutSessions/${documentId}`
  it.each([
    ['startedAt', instant], ['completedAt', instant], ['stepResults', []],
    ['workoutPlanId', 'another-plan'], ['workoutPlanNameSnapshot', 'Not allowed'],
    ['focusRatings', []], ['exerciseRatings', []], ['status', 'partial'],
    ['completion', { completed: 1, planned: 1, unit: 'exercise' }],
  ])('denies create and update with forbidden %s', async (field, value) => {
    const reference = ownerDatabase().doc(path)
    await assertFails(reference.set({ ...workoutSession('manual'), [field as string]: value }))
    await assertSucceeds(reference.set(workoutSession('manual')))
    await assertFails(reference.update({ [field as string]: value }))
  })

  it('allows known work and sparring times as well as unknown times', async () => {
    const reference = ownerDatabase().doc(path)
    await assertSucceeds(reference.set(workoutSession('manual')))
    await assertSucceeds(reference.update({ workSeconds: 120, sparringSeconds: 60, rpe: 10, rpeRecordedAt: instant }))
  })
})

describe('default denial', () => {
  it.each([
    `users/${ownerId}`,
    `users/${ownerId}/inne/${documentId}`,
    ...['focusSkills', 'weekPlans', 'readiness', 'bodyWeights', 'controlTests', 'controlTestResults']
      .map((collection) => `users/${ownerId}/${collection}/${documentId}`),
    `users/${ownerId}/workoutPlans/${documentId}/nested/${documentId}`,
    `users/${ownerId}/workoutSessions/${documentId}/nested/${documentId}`,
    `workoutPlans/${documentId}`,
    `workoutSessions/${documentId}`,
  ])('denies all operations outside the two allowed collections: %s', async (path) => {
    const reference = ownerDatabase().doc(path)
    await assertFails(reference.set({ id: documentId }))
    await environment.withSecurityRulesDisabled(async (context) => {
      await assertSucceeds(context.firestore().doc(path).set({ id: documentId }))
    })
    await assertFails(reference.get())
    await assertFails(reference.update({ schemaVersion: 1 }))
    await assertFails(reference.delete())
  })

  it('denies queries across users', async () => {
    await assertFails(ownerDatabase().collectionGroup('workoutPlans').get())
    await assertFails(ownerDatabase().collectionGroup('workoutSessions').get())
  })
})
