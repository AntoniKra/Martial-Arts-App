import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { setLogLevel } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { personalExercise } from '../src/test/exerciseBuilders'

const ownerId = 'athlete-one'
const documentId = '21a507bc-7f90-4b9f-a890-2ba3a53ee67a'
const instant = '2026-11-08T09:00:00.000Z'
type Document = Record<string, unknown>

describe('personal exercise library', () => {
  const path = `users/${ownerId}/exercises/${documentId}`
  const create = (): Document => ({ ...personalExercise({ id: documentId }), schemaVersion: 1 })
  it('allows verified owner CRUD, copying, favorite, archive and restore with exact defaults', async () => {
    const ref = ownerDatabase().doc(path)
    await assertSucceeds(ref.set({ ...create(), copiedFromId: 'combo-jab-cross' }))
    await assertSucceeds(ref.get())
    await assertSucceeds(ownerDatabase().collection(`users/${ownerId}/exercises`).get())
    await assertSucceeds(ref.update({ namePl: 'Updated', favorite: true, lastUsedAt: instant, archivedAt: instant }))
    await assertSucceeds(ref.update({ archivedAt: null, defaultConfiguration: { mode: 'continuous', durationSeconds: 86400 } }))
    await assertSucceeds(ref.delete())
  })
  it.each(['other', 'signedOut', 'unverified', 'missingVerification'])('denies all library operations for %s', async (actor) => {
    await ownerDatabase().doc(path).set(create())
    const context = actor === 'signedOut' ? environment.unauthenticatedContext()
      : environment.authenticatedContext(actor === 'other' ? 'athlete-two' : ownerId,
        actor === 'missingVerification' ? {} : { email_verified: actor !== 'unverified' })
    const db = context.firestore(), ref = db.doc(path)
    await assertFails(ref.get()); await assertFails(ref.update({ namePl: 'Forbidden' })); await assertFails(ref.delete())
    await assertFails(db.collection(`users/${ownerId}/exercises`).get())
    await assertFails(db.doc(`users/${ownerId}/exercises/new`).set({ ...create(), id: 'new' }))
  })
  it.each([
    { schemaVersion: 2 }, { id: 'different' }, { namePl: '' }, { namePl: 'x'.repeat(101) }, { type: 'strength' },
    { disciplines: [] }, { disciplines: ['boxing', 'boxing'] }, { disciplines: ['wrestling'] }, { disciplines: 'boxing' },
    { blockTypes: [] }, { blockTypes: ['bag', 'bag'] }, { blockTypes: ['unknown'] }, { blockTypes: 'bag' },
    { favorite: 1 }, { lastUsedAt: 'yesterday' }, { archivedAt: false }, { copiedFromId: 'bad/id' }, { createdAt: 'invalid' }, { extra: true },
    ...[0, -1, 1.5, 86401, '60'].map((durationSeconds) => ({ defaultConfiguration: { mode: 'continuous', durationSeconds } })),
    ...[0, 100, 1.5].map((roundCount) => ({ defaultConfiguration: { mode: 'rounds', roundCount, roundDurationSeconds: 60, restBetweenRoundsSeconds: 0 } })),
    { defaultConfiguration: { mode: 'rounds', roundCount: 3, roundDurationSeconds: 0, restBetweenRoundsSeconds: 0 } },
    { defaultConfiguration: { mode: 'rounds', roundCount: 3, roundDurationSeconds: 60, restBetweenRoundsSeconds: -1 } },
    { defaultConfiguration: { mode: 'rounds', roundCount: 3, roundDurationSeconds: 60, restBetweenRoundsSeconds: 86401 } },
    { defaultConfiguration: { mode: 'continuous', durationSeconds: 60, extra: true } },
  ])('rejects invalid library fields on create and update: %j', async (patch) => {
    const ref = ownerDatabase().doc(path)
    await assertFails(ref.set({ ...create(), ...patch }))
    await assertSucceeds(ref.set(create()))
    await assertFails(ref.update(patch))
  })
  it.each(Object.keys(personalExercise()).concat('schemaVersion'))('rejects missing required %s', async (key) => {
    const value = create(); delete value[key]
    await assertFails(ownerDatabase().doc(path).set(value))
  })
  it('protects immutable type, provenance and creation time; a type change requires a new ID', async () => {
    const ref = ownerDatabase().doc(path)
    await ref.set({ ...create(), copiedFromId: 'builtin' })
    await assertFails(ref.update({ type: 'combination' }))
    await assertFails(ref.update({ copiedFromId: 'other' }))
    await assertFails(ref.update({ createdAt: '2026-11-02T10:00:00.000Z' }))
    await assertSucceeds(ownerDatabase().doc(`users/${ownerId}/exercises/new`).set({ ...create(), id: 'new', type: 'combination' }))
  })
  it('accepts optional focus-skill links in v2 while leaving existing v1 data unchanged', async () => {
    const ref = ownerDatabase().doc(`users/${ownerId}/focusSkills/${documentId}`)
    await assertSucceeds(ref.set(focusSkill()))
    await assertSucceeds(ref.update({ exerciseId: 'personal-guard', schemaVersion: 2 }))
    await assertFails(ref.update({ exerciseId: 'bad/id' }))
    await assertFails(ref.update({ exerciseId: 1 }))
    await assertFails(ref.update({ schemaVersion: 1 }))
    await assertSucceeds(ref.update({ exerciseId: null }))
  })
  it('accepts v2 plan sessions with new snapshot links', async () => {
    const value = workoutSession('plan')
    await assertSucceeds(ownerDatabase().doc(`users/${ownerId}/workoutSessions/${documentId}`).set({ ...value, schemaVersion: 2,
      stepResults: (value.stepResults as Document[]).map((step) => ({ ...step, combinationId: 'personal-guard' })) }))
  })
})

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

function focusSkill(): Document {
  return { schemaVersion: 1, id: documentId, name: 'Guard return', criterion: 'Hand returns to the chin',
    openCorrection: null, archivedAt: null, createdAt: instant, updatedAt: instant }
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
  if (source === 'manual') return { ...common, durationSeconds: 180, rpe: 0, rpeRecordedAt: instant,
    focusRatings: [], sparring: [{ blockId: null, intensity: 'hard', rounds: 1 }] }

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
  { name: 'focus skill', collection: 'focusSkills', create: focusSkill },
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

const consent = { grantedAt: instant, noticeVersion: '2026-11', adultConfirmed: true }
const profilePath = `users/${ownerId}`
const weightDate = '2026-11-13'
const weightPath = `${profilePath}/bodyWeights/${weightDate}`
const profileDocument = (): Document => ({ schemaVersion: 1, healthDataConsent: consent,
  weightClassLabel: null, createdAt: instant, updatedAt: instant })
const weightDocument = (): Document => ({ schemaVersion: 1, date: weightDate, weightKg: 76.4,
  createdAt: instant, updatedAt: instant })

describe('health consent and body weights', () => {
  it('allows owner profile lifecycle, protects consent identity and permits fresh consent after withdrawal', async () => {
    const ref = ownerDatabase().doc(profilePath)
    await assertSucceeds(ref.set(profileDocument()))
    expect((await assertSucceeds(ref.get())).data()?.healthDataConsent).toEqual(consent)
    await assertSucceeds(ref.update({ weightClassLabel: '−77 kg' }))
    await assertFails(ref.update({ healthDataConsent: { ...consent, grantedAt: '2026-11-13T09:00:00.000Z' } }))
    await assertFails(ref.update({ healthDataConsent: { ...consent, noticeVersion: '2026-12' } }))
    await assertFails(ref.update({ createdAt: '2026-11-13T09:00:00.000Z' }))
    await assertFails(ref.update({ healthDataConsent: null, weightClassLabel: null }))
    await assertSucceeds(ref.update({ bodyWeightWithdrawal: { generation: 1, pending: true } }))
    await assertSucceeds(ref.update({ healthDataConsent: null, weightClassLabel: null, bodyWeightWithdrawal: { generation: 1, pending: false } }))
    await assertSucceeds(ref.update({ healthDataConsent: { ...consent, grantedAt: '2026-11-13T09:00:00.000Z' } }))
    expect((await ref.get()).data()?.bodyWeightWithdrawal).toEqual({ generation: 1, pending: false })
    await assertSucceeds(ref.delete())
  })

  it.each([
    ['healthDataConsent', { ...consent, adultConfirmed: false }],
    ['healthDataConsent', { grantedAt: instant, noticeVersion: '2026-11' }],
    ['healthDataConsent', { ...consent, adultConfirmed: 1 }],
    ['healthDataConsent', { ...consent, extra: true }],
    ['healthDataConsent', { ...consent, noticeVersion: '2026-1' }],
    ['healthDataConsent', { ...consent, grantedAt: '2026-11-08' }],
    ['healthDataConsent', []], ['weightClassLabel', 'x'.repeat(21)], ['weightClassLabel', ''],
    ['weightClassLabel', 77], ['extra', true], ['schemaVersion', 2], ['updatedAt', null],
  ] as [string, unknown][])('denies invalid profile %s on create and update (%j)', async (field, value) => {
    const ref = ownerDatabase().doc(profilePath)
    await assertFails(ref.set({ ...profileDocument(), [field]: value }))
    await assertSucceeds(ref.set(profileDocument()))
    await assertFails(ref.update({ [field]: value }))
  })

  it('rejects a category without consent on creation and withdrawal', async () => {
    const ref = ownerDatabase().doc(profilePath)
    await assertFails(ref.set({ ...profileDocument(), healthDataConsent: null, weightClassLabel: '−77 kg' }))
    await assertSucceeds(ref.set({ ...profileDocument(), weightClassLabel: 'x'.repeat(20) }))
    await ref.update({ bodyWeightWithdrawal: { generation: 1, pending: true } })
    await assertFails(ref.update({ healthDataConsent: null, bodyWeightWithdrawal: { generation: 1, pending: false } }))
  })

  it('requires consent for writes, but permits reads and deletion after withdrawal', async () => {
    const db = ownerDatabase(), ref = db.doc(weightPath)
    await assertFails(ref.set(weightDocument()))
    await db.doc(profilePath).set({ ...profileDocument(), healthDataConsent: null })
    await assertFails(ref.set(weightDocument()))
    await db.doc(profilePath).update({ healthDataConsent: consent })
    await assertSucceeds(ref.set(weightDocument()))
    await assertSucceeds(ref.update({ weightKg: 30 }))
    await assertSucceeds(ref.update({ weightKg: 250 }))
    await assertFails(ref.update({ createdAt: '2026-11-13T09:00:00.000Z' }))
    await db.doc(profilePath).update({ bodyWeightWithdrawal: { generation: 1, pending: true } })
    await db.doc(profilePath).update({ healthDataConsent: null, bodyWeightWithdrawal: { generation: 1, pending: false } })
    await assertFails(ref.update({ weightKg: 77 }))
    await assertSucceeds(ref.get())
    expect((await assertSucceeds(db.collection(`${profilePath}/bodyWeights`).get())).size).toBe(1)
    await assertSucceeds(ref.delete())
  })

  it('blocks measurement writes in both owner contexts during withdrawal and lets the second finish it', async () => {
    const first = ownerDatabase(), second = ownerDatabase()
    const profile = first.doc(profilePath)
    const weights = `${profilePath}/bodyWeights`, lateDate = '2026-11-14'
    await profile.set({ ...profileDocument(), bodyWeightWithdrawal: null, wellbeingConsent: consent })
    await first.doc(weightPath).set(weightDocument())
    await assertSucceeds(profile.update({ bodyWeightWithdrawal: { generation: 1, pending: true } }))

    const snapshot = await assertSucceeds(second.collection(weights).get())
    expect(snapshot.docs.map((document) => document.ref.path)).toEqual([weightPath])
    for (const db of [first, second]) {
      await assertFails(db.doc(`${weights}/${lateDate}`).set({ ...weightDocument(), date: lateDate }))
      await assertFails(db.doc(weightPath).update({ weightKg: 77 }))
    }
    const batch = second.batch()
    for (const document of snapshot.docs) batch.delete(document.ref)
    batch.update(second.doc(profilePath), {
      healthDataConsent: null, weightClassLabel: null, bodyWeightWithdrawal: { generation: 1, pending: false },
    })
    await assertSucceeds(batch.commit())
    expect((await second.collection(weights).get()).size).toBe(0)
    expect((await profile.get()).data()).toMatchObject({
      healthDataConsent: null, bodyWeightWithdrawal: { generation: 1, pending: false }, wellbeingConsent: consent,
    })
  })

  it('only permits starting the next generation and finishing the current generation', async () => {
    const profile = ownerDatabase().doc(profilePath)
    const pending = { generation: 1, pending: true }
    await assertFails(profile.set({ ...profileDocument(), bodyWeightWithdrawal: pending }))
    await profile.set(profileDocument())
    for (const generation of [0, 1.5, 2, Number.MAX_SAFE_INTEGER + 1]) {
      await assertFails(profile.update({ bodyWeightWithdrawal: { generation, pending: true } }))
    }
    await assertSucceeds(profile.update({ bodyWeightWithdrawal: pending }))
    await assertFails(profile.update({ healthDataConsent: null }))
    await assertFails(profile.update({ bodyWeightWithdrawal: null }))
    await assertFails(profile.update({ bodyWeightWithdrawal: { ...pending, pending: false } }))
    await assertFails(profile.update({ healthDataConsent: null, bodyWeightWithdrawal: { generation: 2, pending: false } }))
    await assertSucceeds(profile.update({ healthDataConsent: null, bodyWeightWithdrawal: { ...pending, pending: false } }))
    await assertFails(profile.update({ bodyWeightWithdrawal: null }))
  })

  it('rejects an old deletion batch atomically after a later withdrawal and new consent', async () => {
    const first = ownerDatabase(), second = ownerDatabase(), profile = second.doc(profilePath)
    await profile.set(profileDocument())
    await first.doc(weightPath).set(weightDocument())
    await profile.update({ bodyWeightWithdrawal: { generation: 1, pending: true } })
    const delayed = first.batch()
    delayed.delete(first.doc(weightPath))
    delayed.update(first.doc(profilePath), { bodyWeightWithdrawal: { generation: 1, pending: true } })

    const finish = second.batch()
    finish.delete(second.doc(weightPath))
    finish.update(profile, { healthDataConsent: null, bodyWeightWithdrawal: { generation: 1, pending: false } })
    await assertSucceeds(finish.commit())
    await profile.update({ healthDataConsent: consent })
    await profile.update({ bodyWeightWithdrawal: { generation: 2, pending: true } })
    await profile.update({ healthDataConsent: null, bodyWeightWithdrawal: { generation: 2, pending: false } })
    await profile.update({ healthDataConsent: consent })
    const fresh = { ...weightDocument(), weightKg: 81 }
    await second.doc(weightPath).set(fresh)

    await assertFails(delayed.commit())
    expect((await second.doc(weightPath).get()).data()).toEqual(fresh)
    expect((await profile.get()).data()).toMatchObject({
      healthDataConsent: consent, bodyWeightWithdrawal: { generation: 2, pending: false },
    })
  })

  it('rejects granting consent and creating a body weight in the same batch without changing either document', async () => {
    const db = ownerDatabase()
    const profile = db.doc(profilePath), weight = db.doc(weightPath)
    await assertSucceeds(profile.set({ ...profileDocument(), healthDataConsent: null }))
    const batch = db.batch()
    batch.update(profile, { healthDataConsent: consent })
    batch.set(weight, weightDocument())
    await assertFails(batch.commit())
    expect((await assertSucceeds(profile.get())).data()?.healthDataConsent).toBeNull()
    expect((await assertSucceeds(weight.get())).exists).toBe(false)
  })

  it.each([
    ['weightKg', 29.9], ['weightKg', 250.1], ['weightKg', '76.4'],
    ['date', '2026-11-12'], ['date', '13.11.2026'], ['extra', true],
    ['schemaVersion', 2], ['createdAt', null], ['updatedAt', '2026-11-08'],
  ] as [string, unknown][])('denies invalid weight %s on create and update (%j)', async (field, value) => {
    const db = ownerDatabase(), ref = db.doc(weightPath)
    await db.doc(profilePath).set(profileDocument())
    await assertFails(ref.set({ ...weightDocument(), [field]: value }))
    await assertSucceeds(ref.set(weightDocument()))
    await assertFails(ref.update({ [field]: value }))
  })

  it.each(['profile', 'weight'] as const)('requires every field on %s', async (kind) => {
    const db = ownerDatabase()
    if (kind === 'weight') await db.doc(profilePath).set(profileDocument())
    const original = kind === 'profile' ? profileDocument() : weightDocument()
    const ref = db.doc(kind === 'profile' ? profilePath : weightPath)
    for (const field of Object.keys(original)) {
      const incomplete = { ...original }
      delete incomplete[field]
      await assertFails(ref.set(incomplete))
    }
  })

  describe.each(['other', 'signedOut', 'unverified', 'missingClaim'])('rejects %s', (actor) => {
    it.each(['profile', 'weight'])('denies all operations on %s', async (kind) => {
      const owner = ownerDatabase()
      await owner.doc(profilePath).set(profileDocument())
      await owner.doc(weightPath).set(weightDocument())
      const context = actor === 'signedOut' ? environment.unauthenticatedContext()
        : actor === 'other' ? environment.authenticatedContext('athlete-two', { email_verified: true })
          : actor === 'unverified' ? environment.authenticatedContext(ownerId, { email_verified: false })
            : environment.authenticatedContext(ownerId)
      const db = context.firestore(), ref = db.doc(kind === 'profile' ? profilePath : weightPath)
      await assertFails(ref.get())
      await assertFails(ref.set(kind === 'profile' ? profileDocument() : weightDocument()))
      await assertFails(ref.update({ updatedAt: instant }))
      await assertFails(ref.delete())
      // Creation is distinct from replacement of the existing document.
      await owner.doc(kind === 'profile' ? profilePath : weightPath).delete()
      await assertFails(ref.set(kind === 'profile' ? profileDocument() : weightDocument()))
      if (kind === 'weight') await assertFails(db.collection(`${profilePath}/bodyWeights`).get())
    })
  })
})

describe.each(scenarios)('$name', ({ collection, create }) => {
  const path = `users/${ownerId}/${collection}/${documentId}`

  it('allows the verified owner to create, read, list, update and delete', async () => {
    const database = ownerDatabase()
    const reference = database.doc(path)
    const original = create()
    await assertSucceeds(reference.set(original))
    expect((await assertSucceeds(reference.get())).data()).toEqual(original)
    expect((await assertSucceeds(database.collection(`users/${ownerId}/${collection}`).get())).size).toBe(1)
    const patch = collection === 'focusSkills' ? { name: 'Updated skill', criterion: 'Updated criterion' }
      : collection === 'workoutPlans' ? { customName: 'Updated workout' } : { note: 'Updated note' }
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
    ['schemaVersion', collection === 'workoutSessions' && create().source === 'plan' ? 3 : 2], ['schemaVersion', '1'],
    ['id', 'another-document'], ['id', 42],
    ['createdAt', new Date(instant)], ['createdAt', '2026-11-08'],
    ['updatedAt', null], ['updatedAt', 42],
    ['unexpectedField', true],
  ]
  const invalidPlanFields: [string, unknown][] = [
    ['disciplineKey', 'wrestling'], ['disciplineKey', null],
    ['customName', 42], ['mainGoal', false], ['nameSnapshot', ''], ['nameSnapshot', null],
    ['blocks', {}], ['blocks', null],
  ]
  const invalidSessionFields: [string, unknown][] = [
    ['disciplineKey', 'wrestling'], ['disciplineKey', null],
    ['source', 'unknown'], ['status', 'in_progress'], ['category', 'warmup'], ['category', 'unknown'],
    ['workoutDate', '08.11.2026'], ['workoutDate', 42], ['timezone', null], ['timezone', '+01:00'],
    ['durationSeconds', 0], ['durationSeconds', -1], ['durationSeconds', '180'],
    ['workSeconds', -1], ['workSeconds', 1.5], ['sparringSeconds', '180'], ['sparringSeconds', -1],
    ['note', 'n'.repeat(1001)], ['note', 42],
    ['rpe', -1], ['rpe', 11], ['rpe', 5.5], ['rpe', '5'],
    ['rpeRecordedAt', 'yesterday'], ['rpeRecordedAt', new Date(instant)],
    ['sparring', {}], ['sparring', null],
  ]

  const correction = { problem: 'Dropping guard', fix: 'Touch the chin', sessionId: documentId, workoutDate: '2026-11-08' }
  const invalidFocusFields: [string, unknown][] = [
    ['name', ''], ['name', 'n'.repeat(81)], ['name', 42],
    ['criterion', ''], ['criterion', 'c'.repeat(201)], ['criterion', null],
    ['archivedAt', 'yesterday'], ['archivedAt', new Date(instant)],
    ['openCorrection', []], ['openCorrection', {}],
    ...[
      { ...correction, problem: '' }, { ...correction, problem: 'p'.repeat(201) },
      { ...correction, fix: '' }, { ...correction, fix: 'f'.repeat(201) },
      { ...correction, sessionId: '' }, { ...correction, workoutDate: '08.11.2026' },
      { ...correction, extra: true },
      ...Object.keys(correction).map((field) => {
        const incomplete: Document = { ...correction }
        delete incomplete[field]
        return incomplete
      }),
    ].map((value): [string, unknown] => ['openCorrection', value]),
  ]

  it.each([...invalidCommonFields, ...(collection === 'focusSkills' ? invalidFocusFields
    : collection === 'workoutPlans' ? invalidPlanFields : invalidSessionFields)])(
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

describe('focus skill boundaries', () => {
  it('allows bounded text, an exact correction object and an archive instant', async () => {
    const reference = ownerDatabase().doc(`users/${ownerId}/focusSkills/${documentId}`)
    await assertSucceeds(reference.set({ ...focusSkill(), name: 'n'.repeat(80), criterion: 'c'.repeat(200),
      openCorrection: { problem: 'p'.repeat(200), fix: 'f'.repeat(200), sessionId: documentId, workoutDate: '2026-11-08' },
      archivedAt: instant }))
    await assertSucceeds(reference.update({ openCorrection: null, archivedAt: null }))
  })
})

describe('post-workout feedback batch', () => {
  const sessionPath = `users/${ownerId}/workoutSessions/${documentId}`
  const skillPath = `users/${ownerId}/focusSkills/${documentId}`
  const correction = { problem: 'Dropped guard', fix: 'Touch chin', sessionId: documentId, workoutDate: '2026-11-08' }
  const feedback = {
    focusRatings: [{ workoutItemId: 'exercise-one', focusSkillId: documentId, skillNameSnapshot: 'Guard',
      criterionSnapshot: 'Hand returns', blockType: 'sparring', assessment: 4,
      correction: { problem: correction.problem, fix: correction.fix }, previousCorrectionCheck: null }],
    exerciseRatings: [], note: 'Workout note', updatedAt: '2026-11-08T10:00:00.000Z',
  }

  beforeEach(async () => {
    await ownerDatabase().doc(sessionPath).set(workoutSession('plan'))
    await ownerDatabase().doc(skillPath).set(focusSkill())
  })

  it('allows the owner to save feedback and replace or close the open correction atomically', async () => {
    const db = ownerDatabase()
    const batch = db.batch()
    batch.update(db.doc(sessionPath), feedback)
    batch.update(db.doc(skillPath), { openCorrection: correction, updatedAt: feedback.updatedAt })
    await assertSucceeds(batch.commit())
    expect((await db.doc(sessionPath).get()).data()?.note).toBe('Workout note')
    expect((await db.doc(skillPath).get()).data()?.openCorrection).toEqual(correction)
    const closing = db.batch()
    closing.update(db.doc(sessionPath), { focusRatings: [{ ...feedback.focusRatings[0], previousCorrectionCheck: 'better' }] })
    closing.update(db.doc(skillPath), { openCorrection: null })
    await assertSucceeds(closing.commit())
  })

  it.each(['other', 'signedOut', 'unverified', 'invalidNote', 'fourRatings', 'invalidCorrection'] as const)(
    'rejects the entire batch for %s', async (scenario) => {
      const db = scenario === 'other' ? environment.authenticatedContext('athlete-two', { email_verified: true }).firestore()
        : scenario === 'signedOut' ? environment.unauthenticatedContext().firestore()
          : scenario === 'unverified' ? environment.authenticatedContext(ownerId, { email_verified: false }).firestore() : ownerDatabase()
      const batch = db.batch()
      batch.update(db.doc(sessionPath), { ...feedback,
        ...(scenario === 'invalidNote' ? { note: 'x'.repeat(1001) } : {}),
        ...(scenario === 'fourRatings' ? { focusRatings: Array.from({ length: 4 }, () => feedback.focusRatings[0]) } : {}),
      })
      batch.update(db.doc(skillPath), { openCorrection: scenario === 'invalidCorrection' ? { ...correction, fix: '' } : correction })
      await assertFails(batch.commit())
      expect((await ownerDatabase().doc(sessionPath).get()).data()?.note).toBeNull()
      expect((await ownerDatabase().doc(skillPath).get()).data()?.openCorrection).toBeNull()
    },
  )
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
  const multi = () => ({ ...workoutSession('manual'), schemaVersion: 2, category: 'mixed', parts: ['technique', 'pads', 'sparring'] })
  it('accepts v2 lists from one to six parts and keeps v1 entries readable without rewriting', async () => {
    const ref = ownerDatabase().doc(path)
    await assertSucceeds(ref.set(multi()))
    await assertSucceeds(ref.update({ parts: ['technique', 'pads', 'bag', 'sparring', 'conditioning', 'other'] }))
    await assertSucceeds(ref.set({ ...multi(), category: 'pads', parts: ['pads'], sparring: [] }))
    await assertSucceeds(ref.set({ ...multi(), parts: ['other'], sparring: [] }))
    await assertSucceeds(ref.set({ ...workoutSession('manual'), category: 'mixed' }))
    expect((await ref.get()).data()?.schemaVersion).toBe(1)
    expect((await ref.get()).data()).not.toHaveProperty('parts')
  })
  it.each([[], ['pads', 'pads'], ['unknown'], ['technique', 'pads', 'bag', 'sparring', 'conditioning', 'other', 'pads'], null, 'pads']
    .map((parts) => ({ parts })))('rejects invalid parts on create and update: %j', async ({ parts }) => {
    const ref = ownerDatabase().doc(path)
    await assertFails(ref.set({ ...multi(), parts }))
    await assertSucceeds(ref.set(multi()))
    await assertFails(ref.update({ parts }))
  })
  it.each([{ parts: undefined }, { category: 'pads' }, { sparring: [] }, { schemaVersion: 1 }, { schemaVersion: 3 }])('rejects missing parts or inconsistent version/category/sparring: %j', async (patch) => {
    const value: Document = { ...multi(), ...patch }
    if (value.parts === undefined) delete value.parts
    await assertFails(ownerDatabase().doc(path).set(value))
  })
  it.each(['other', 'signedOut', 'unverified'])('rejects v2 access by %s', async (actor) => {
    await ownerDatabase().doc(path).set(multi())
    const context = actor === 'signedOut' ? environment.unauthenticatedContext()
      : environment.authenticatedContext(actor === 'other' ? 'athlete-two' : ownerId, { email_verified: actor !== 'unverified' })
    const ref = context.firestore().doc(path)
    await assertFails(ref.get()); await assertFails(ref.set(multi())); await assertFails(ref.update({ note: 'Forbidden' })); await assertFails(ref.delete())
  })
  it.each([
    ['startedAt', instant], ['completedAt', instant], ['stepResults', []],
    ['workoutPlanId', 'another-plan'], ['workoutPlanNameSnapshot', 'Not allowed'],
    ['exerciseRatings', []], ['status', 'partial'],
    ['completion', { completed: 1, planned: 1, unit: 'exercise' }],
    ['focusRatings', [{}, {}, {}, {}]], ['rpe', null], ['rpeRecordedAt', null],
    ['workSeconds', 120], ['sparringSeconds', 60], ['durationSeconds', 30],
    ['durationSeconds', 28801], ['durationSeconds', 180.5], ['sparring', [{}, {}]],
  ])('denies create and update with forbidden %s', async (field, value) => {
    const reference = ownerDatabase().doc(path)
    await assertFails(reference.set({ ...workoutSession('manual'), [field as string]: value }))
    await assertSucceeds(reference.set(workoutSession('manual')))
    await assertFails(reference.update({ [field as string]: value }))
  })

  it('allows zero or three ratings and bounded duration without checking list entries or date age', async () => {
    const reference = ownerDatabase().doc(path)
    await assertSucceeds(reference.set(workoutSession('manual')))
    await assertSucceeds(reference.update({ focusRatings: [{}, {}, {}], durationSeconds: 28800, rpe: 10, workoutDate: '2025-01-01' }))
    await assertSucceeds(reference.update({ focusRatings: [], durationSeconds: 60 }))
  })
})

describe('wellbeing consent and daily entries', () => {
  const path = `${profilePath}/readiness/${weightDate}`
  const entry = (): Document => ({ schemaVersion: 1, questionsVersion: 1, date: weightDate, sleep: 1, energy: 5, soreness: 3, stress: 3,
    note: null, createdAt: instant, updatedAt: instant })
  const enabled = () => ({ ...profileDocument(), wellbeingConsent: consent })
  const withdrawalGeneration = 1
  const laterGeneration = 2
  it('keeps old profiles valid, requires separate consent and preserves existing consent identity', async () => {
    const db = ownerDatabase(), profile = db.doc(profilePath), ref = db.doc(path)
    await assertFails(ref.set(entry()))
    await assertSucceeds(profile.set(profileDocument()))
    await assertFails(ref.set(entry()))
    await assertSucceeds(profile.update({ wellbeingConsent: consent }))
    await assertSucceeds(ref.set(entry()))
    await assertSucceeds(ref.get())
    await assertSucceeds(db.collection(`${profilePath}/readiness`).get())
    await assertSucceeds(ref.update({ sleep: 5, energy: 1, note: 'x'.repeat(300) }))
    await assertFails(ref.update({ createdAt: '2026-11-13T09:00:00.000Z' }))
    await assertFails(profile.update({ wellbeingConsent: { ...consent, grantedAt: '2026-11-13T09:00:00.000Z' } }))
    await assertFails(profile.update({ wellbeingConsent: null }))
    await assertSucceeds(profile.update({ wellbeingWithdrawal: { generation: withdrawalGeneration, pending: true } }))
    await assertSucceeds(profile.update({ wellbeingConsent: null, wellbeingWithdrawal: { generation: withdrawalGeneration, pending: false } }))
    await assertFails(ref.update({ sleep: 2 }))
    await assertSucceeds(ref.get())
    await assertSucceeds(ref.delete())
    expect((await profile.get()).data()?.healthDataConsent).toEqual(consent)
    await assertSucceeds(profile.update({ wellbeingConsent: consent }))
  })
  it.each([false, null, 1])('rejects invalid adult confirmation %s', async (adultConfirmed) => {
    await assertFails(ownerDatabase().doc(profilePath).set({ ...enabled(), wellbeingConsent: { ...consent, adultConfirmed } }))
  })
  it('blocks writes from another session before taking the deletion snapshot, leaving no late document', async () => {
    const deleting = ownerDatabase(), writing = environment.authenticatedContext(ownerId, { email_verified: true }).firestore()
    await deleting.doc(profilePath).set(enabled())
    await writing.doc(path).set(entry())
    await deleting.doc(profilePath).update({ wellbeingWithdrawal: { generation: withdrawalGeneration, pending: true } })
    const snapshot = await deleting.collection(`${profilePath}/readiness`).get()
    const batch = deleting.batch()
    for (const document of snapshot.docs) batch.delete(document.ref)
    batch.update(deleting.doc(profilePath), { wellbeingConsent: null, wellbeingWithdrawal: { generation: withdrawalGeneration, pending: false } })
    const latePath = `${profilePath}/readiness/2026-11-14`
    await Promise.all([
      assertFails(writing.doc(latePath).set({ ...entry(), date: '2026-11-14' })),
      assertFails(writing.doc(path).update({ sleep: 4 })),
      assertSucceeds(batch.commit()),
    ])
    expect((await deleting.collection(`${profilePath}/readiness`).get()).size).toBe(0)
    expect((await deleting.doc(profilePath).get()).data()?.wellbeingConsent).toBeNull()
  })
  it('prevents unlocking, dropping or replacing an active marker without completing that generation', async () => {
    const ref = ownerDatabase().doc(profilePath)
    await ref.set(enabled())
    await ref.update({ wellbeingWithdrawal: { generation: withdrawalGeneration, pending: true } })
    for (const wellbeingWithdrawal of [null, { generation: withdrawalGeneration, pending: false }, { generation: laterGeneration, pending: true }]) {
      await assertFails(ref.update({ wellbeingWithdrawal }))
    }
    await assertFails(ref.set(enabled()))
    await assertFails(ref.update({ wellbeingConsent: { ...consent, grantedAt: '2026-11-13T09:00:00.000Z' } }))
    await assertSucceeds(ref.update({ wellbeingWithdrawal: { generation: withdrawalGeneration, pending: false }, wellbeingConsent: null }))
    await ref.update({ wellbeingConsent: consent })
    await assertSucceeds(ownerDatabase().doc(path).set(entry()))
  })
  it.each([null, false, 1, {}, { pending: true },
    ...['bad', 0, -1, 1.5, 9007199254740992].map((generation) => ({ generation, pending: true })),
    { generation: withdrawalGeneration, pending: 'true' }, { generation: withdrawalGeneration, pending: true, extra: true }])(
    'rejects an invalid start marker %j', async (wellbeingWithdrawal) => {
      const ref = ownerDatabase().doc(profilePath)
      await ref.set(enabled())
      if (wellbeingWithdrawal === null) {
        await ref.update({ wellbeingWithdrawal: { generation: withdrawalGeneration, pending: true } })
      }
      await assertFails(ref.update({ wellbeingWithdrawal }))
    })
  it.each([undefined, null])('starts old profiles with marker %s at generation one and requires each exact successor', async (marker) => {
    const ref = ownerDatabase().doc(profilePath)
    await ref.set({ ...enabled(), ...(marker === undefined ? {} : { wellbeingWithdrawal: marker }) })
    await assertFails(ref.update({ wellbeingWithdrawal: { generation: 2, pending: true } }))
    for (const generation of [1, 2, 3]) {
      await assertFails(ref.update({ wellbeingWithdrawal: { generation, pending: false }, wellbeingConsent: null }))
      await assertSucceeds(ref.update({ wellbeingWithdrawal: { generation, pending: true } }))
      await assertSucceeds(ref.update({ wellbeingWithdrawal: { generation, pending: true } }))
      await assertFails(ref.update({ wellbeingWithdrawal: { generation: generation + 1, pending: false }, wellbeingConsent: null }))
      await assertSucceeds(ref.update({ wellbeingWithdrawal: { generation, pending: false }, wellbeingConsent: null }))
      await assertFails(ref.update({ wellbeingWithdrawal: null }))
      await assertFails(ref.set(enabled()))
      await assertFails(ref.update({ wellbeingWithdrawal: { generation: generation + 1, pending: false } }))
      await assertSucceeds(ref.update({ wellbeingConsent: consent }))
      expect((await ref.get()).data()?.wellbeingWithdrawal).toEqual({ generation, pending: false })
      for (const invalid of [generation, generation - 1, generation + 2]) {
        await assertFails(ref.update({ wellbeingWithdrawal: { generation: invalid, pending: true } }))
      }
    }
  })
  it('rejects late intermediate and final batches after a regrant, also during a later withdrawal', async () => {
    const db = ownerDatabase(), profile = db.doc(profilePath), ref = db.doc(path)
    await profile.set(enabled())
    await profile.update({ wellbeingWithdrawal: { generation: withdrawalGeneration, pending: true } })
    await profile.update({ wellbeingWithdrawal: { generation: withdrawalGeneration, pending: false }, wellbeingConsent: null })
    await profile.update({ wellbeingConsent: consent })
    await ref.set(entry())
    for (const startNext of [false, true]) {
      if (startNext) await profile.update({ wellbeingWithdrawal: { generation: laterGeneration, pending: true } })
      for (const pending of [true, false]) {
        const queued = db.batch()
        queued.delete(ref)
        queued.update(profile, { wellbeingWithdrawal: { generation: withdrawalGeneration, pending }, ...(pending ? {} : { wellbeingConsent: null }) })
        await assertFails(queued.commit())
        expect((await ref.get()).exists).toBe(true)
        expect((await profile.get()).data()?.wellbeingConsent).toEqual(consent)
      }
    }
  })
  it('rejects the entire delayed intermediate A batch after B finishes and consent is regranted again', async () => {
    const first = ownerDatabase(), second = environment.authenticatedContext(ownerId, { email_verified: true }).firestore()
    const profile = first.doc(profilePath), today = '2026-11-14'
    const collection = first.collection(`${profilePath}/readiness`)
    await profile.set(enabled())
    const seed = first.batch()
    for (let offset = 0; offset < 498; offset++) {
      const date = new Date(Date.UTC(2026, 10, 14 - offset)).toISOString().slice(0, 10)
      seed.set(collection.doc(date), { ...entry(), date })
    }
    await seed.commit()
    await profile.update({ wellbeingWithdrawal: { generation: withdrawalGeneration, pending: true } })
    const snapshot = await collection.get()
    expect(snapshot.size).toBe(498)
    // Hold A's full intermediate batch until both generations have finished.
    const delayedA = first.batch()
    for (const document of snapshot.docs) delayedA.delete(document.ref)
    delayedA.update(profile, { wellbeingWithdrawal: { generation: withdrawalGeneration, pending: true } })

    const finishA = second.batch()
    for (const document of snapshot.docs) finishA.delete(second.doc(document.ref.path))
    finishA.update(second.doc(profilePath), { wellbeingWithdrawal: { generation: withdrawalGeneration, pending: true } })
    await finishA.commit()
    await second.doc(profilePath).update({ wellbeingWithdrawal: { generation: withdrawalGeneration, pending: false }, wellbeingConsent: null })
    await second.doc(profilePath).update({ wellbeingConsent: consent })
    await second.doc(profilePath).update({ wellbeingWithdrawal: { generation: laterGeneration, pending: true } })
    await second.doc(profilePath).update({ wellbeingWithdrawal: { generation: laterGeneration, pending: false }, wellbeingConsent: null })
    const regranted = { ...consent, grantedAt: '2026-11-14T10:00:00.000Z' }
    await second.doc(profilePath).update({ wellbeingConsent: regranted })
    const fresh = { ...entry(), date: today, note: 'New entry after B' }
    await second.doc(`${profilePath}/readiness/${today}`).set(fresh)
    const profileBefore = (await second.doc(profilePath).get()).data()

    await assertFails(delayedA.commit())
    expect((await second.doc(`${profilePath}/readiness/${today}`).get()).data()).toEqual(fresh)
    expect((await collection.get()).size).toBe(1)
    expect((await second.doc(profilePath).get()).data()).toEqual(profileBefore)
  })
  it.each(['other', 'signedOut', 'unverified'])('denies starting or finishing withdrawal as %s', async (actor) => {
    const owner = ownerDatabase()
    await owner.doc(profilePath).set(enabled()); await owner.doc(path).set(entry())
    const context = actor === 'signedOut' ? environment.unauthenticatedContext()
      : environment.authenticatedContext(actor === 'other' ? 'athlete-two' : ownerId, { email_verified: actor !== 'unverified' })
    const db = context.firestore()
    await assertFails(db.doc(profilePath).update({ wellbeingWithdrawal: { generation: withdrawalGeneration, pending: true } }))
    await owner.doc(profilePath).update({ wellbeingWithdrawal: { generation: withdrawalGeneration, pending: true } })
    const batch = db.batch(); batch.delete(db.doc(path))
    batch.update(db.doc(profilePath), { wellbeingConsent: null, wellbeingWithdrawal: { generation: withdrawalGeneration, pending: false } })
    await assertFails(batch.commit())
    expect((await owner.doc(path).get()).exists).toBe(true)
  })
  it('rejects granting consent and writing an entry in the same batch with no partial writes', async () => {
    const db = ownerDatabase(), profile = db.doc(profilePath), ref = db.doc(path)
    await profile.set({ ...profileDocument(), wellbeingConsent: null })
    const batch = db.batch(); batch.update(profile, { wellbeingConsent: consent }); batch.set(ref, entry())
    await assertFails(batch.commit())
    expect((await profile.get()).data()?.wellbeingConsent).toBeNull()
    expect((await ref.get()).exists).toBe(false)
  })
  it('rejects consent plus entry when the profile does not exist yet', async () => {
    const db = ownerDatabase(), batch = db.batch()
    batch.set(db.doc(profilePath), enabled()); batch.set(db.doc(path), entry())
    await assertFails(batch.commit())
    expect((await db.doc(profilePath).get()).exists).toBe(false)
  })
  it.each([
    ['sleep', 0], ['sleep', 6], ['energy', 2.5], ['soreness', '3'], ['stress', null], ['note', 'x'.repeat(301)], ['note', 3],
    ['date', '2026-11-12'], ['date', 'yesterday'], ['schemaVersion', 2], ['questionsVersion', 2], ['createdAt', null], ['updatedAt', 'today'], ['extra', true],
  ] as [string, unknown][])('rejects invalid %s on create and update (%j)', async (field, value) => {
    const db = ownerDatabase(), ref = db.doc(path)
    await db.doc(profilePath).set(enabled())
    await assertFails(ref.set({ ...entry(), [field]: value }))
    await ref.set(entry())
    await assertFails(ref.update({ [field]: value }))
  })
  it('requires exactly all daily entry fields', async () => {
    const db = ownerDatabase(), ref = db.doc(path)
    await db.doc(profilePath).set(enabled())
    for (const field of Object.keys(entry())) {
      const partial = entry(); delete partial[field]
      await assertFails(ref.set(partial))
    }
  })
  it.each(['other', 'signedOut', 'unverified', 'missingClaim'])('denies all operations for %s', async (actor) => {
    const owner = ownerDatabase()
    await owner.doc(profilePath).set(enabled()); await owner.doc(path).set(entry())
    const context = actor === 'signedOut' ? environment.unauthenticatedContext()
      : environment.authenticatedContext(actor === 'other' ? 'athlete-two' : ownerId, actor === 'missingClaim' ? {} : { email_verified: actor !== 'unverified' })
    const db = context.firestore(), ref = db.doc(path)
    await assertFails(ref.get()); await assertFails(db.collection(`${profilePath}/readiness`).get())
    await assertFails(ref.set(entry())); await assertFails(ref.update({ sleep: 2 })); await assertFails(ref.delete())
    await owner.doc(path).delete(); await assertFails(ref.set(entry()))
  })
})

describe('default denial', () => {
  it.each([
    `users/${ownerId}/inne/${documentId}`,
    ...['controlTests', 'controlTestResults']
      .map((collection) => `users/${ownerId}/${collection}/${documentId}`),
    `users/${ownerId}/workoutPlans/${documentId}/nested/${documentId}`,
    `users/${ownerId}/workoutSessions/${documentId}/nested/${documentId}`,
    `users/${ownerId}/focusSkills/${documentId}/nested/${documentId}`,
    `users/${ownerId}/weekPlans/2026-11-09/nested/${documentId}`,
    `${weightPath}/nested/${documentId}`,
    `workoutPlans/${documentId}`,
    `workoutSessions/${documentId}`,
    `focusSkills/${documentId}`,
    `weekPlans/2026-11-09`,
  ])('denies all operations outside the allowed collections: %s', async (path) => {
    const reference = ownerDatabase().doc(path)
    await assertFails(reference.set({ id: documentId }))
    await environment.withSecurityRulesDisabled(async (context) => {
      await assertSucceeds(context.firestore().doc(path).set({ id: documentId }))
    })
    await assertFails(reference.get())
    await assertFails(reference.update({ schemaVersion: 1 }))
    await assertFails(reference.delete())
  })

  it('denies listing the users collection', async () => {
    await assertFails(ownerDatabase().collection('users').get())
  })

  it('denies queries across users', async () => {
    await assertFails(ownerDatabase().collectionGroup('workoutPlans').get())
    await assertFails(ownerDatabase().collectionGroup('workoutSessions').get())
    await assertFails(ownerDatabase().collectionGroup('focusSkills').get())
    await assertFails(ownerDatabase().collectionGroup('weekPlans').get())
    await assertFails(ownerDatabase().collectionGroup('bodyWeights').get())
  })
})

describe('recurring and dated week plans', () => {
  const club = { id: 'club', kind: 'club', day: 1, disciplineKey: 'muay_thai', startTime: '19:00', endTime: '20:30', parts: ['technique', 'pads'], clubName: null }
  const recurring = () => ({ schemaVersion: 1, id: 'default', itemCount: 1, revision: 1, createdAt: instant, updatedAt: instant })
  const scheduled = () => ({ schemaVersion: 2, weekStart: '2026-11-09', items: [], scheduleSize: 1, targetCount: 3, revision: 1, appliedRecurringRevision: 0, appliedRecurringIds: [], createdAt: instant, updatedAt: instant, editedAfterWeekEnd: false })
  const recurringEntry = (position = 0) => ({ schemaVersion: 1, id: `item-${position}`, position, activity: { ...club, id: String(position) }, createdAt: instant, updatedAt: instant })
  const scheduledEntry = (position = 0) => ({ schemaVersion: 2, weekStart: '2026-11-09', position, activity: { ...club, id: String(position), omitted: false }, createdAt: instant, updatedAt: instant })
  const cases = [
    { collection: 'recurringWeeks', id: 'default', create: recurring },
    { collection: 'weekPlans', id: '2026-11-09', create: scheduled },
    { collection: 'recurringWeeks', id: 'item-0', create: recurringEntry },
    { collection: 'weekPlans', id: '2026-11-09~0', create: scheduledEntry },
  ]
  for (const { collection, id, create } of cases.filter(({ id }) => id === 'default' || id === '2026-11-09')) {
    it(`requires the next revision for ${collection}, including legacy headers and denied actors`, async () => {
      const ref = ownerDatabase().doc(`users/${ownerId}/${collection}/${id}`)
      for (const revision of [0, -1, 2, 1.5, '1']) await assertFails(ref.set({ ...create(), revision }))
      const missing: Document = create(); delete missing.revision
      await assertFails(ref.set(missing))
      await environment.withSecurityRulesDisabled(async (context) => { await context.firestore().doc(ref.path).set(missing) })
      await assertSucceeds(ref.get())
      await assertSucceeds(ref.set({ ...create(), revision: 1 }))
      await assertSucceeds(ref.update({ revision: 2 }))
      for (const revision of [0, 1, 2, 4, 2.5, '3']) await assertFails(ref.update({ revision }))
      await assertFails(ref.set(missing))
      for (const context of [environment.unauthenticatedContext(), environment.authenticatedContext('other-account', { email_verified: true })]) {
        await assertFails(context.firestore().doc(ref.path).update({ revision: 3 }))
      }
      await assertSucceeds(ref.update({ revision: 3 }))
    })
  }
  for (const { collection, id, create } of cases) {
    const path = `users/${ownerId}/${collection}/${id}`
    it(`allows owner CRUD for ${collection} and protects creation time`, async () => {
      const ref = ownerDatabase().doc(path)
      await assertSucceeds(ref.set(create())); await assertSucceeds(ref.get())
      await assertSucceeds(ownerDatabase().collection(`users/${ownerId}/${collection}`).get())
      await assertSucceeds(ref.update({ updatedAt: '2026-11-10T10:00:00.000Z', ...(!id.includes('~') && !id.startsWith('item-') ? { revision: 2 } : {}) }))
      await assertFails(ref.update({ createdAt: '2026-11-10T10:00:00.000Z' }))
      await assertSucceeds(ref.delete())
    })
    it.each(['other', 'signedOut', 'unverified'])(`denies every ${collection} operation for %s`, async (actor) => {
      await ownerDatabase().doc(path).set(create())
      const db = (actor === 'signedOut' ? environment.unauthenticatedContext() : environment.authenticatedContext(actor === 'other' ? 'athlete-two' : ownerId, { email_verified: actor !== 'unverified' })).firestore()
      await assertFails(db.doc(path).get()); await assertFails(db.collection(`users/${ownerId}/${collection}`).get())
      await assertFails(db.doc(path).set(create())); await assertFails(db.doc(path).update({ updatedAt: instant })); await assertFails(db.doc(path).delete())
    })
    it.each([{ schemaVersion: 99 }, { extra: true }, { createdAt: 'yesterday' }])(`rejects malformed ${collection} documents %j`, async (fields) => {
      await assertFails(ownerDatabase().doc(path).set({ ...create(), ...fields }))
    })
    if (id.includes('~') || id.startsWith('item-')) it.each([{ day: 7 }, { day: null }, { day: 1.5 }, { startTime: '24:00' }, { endTime: '18:00' }, { disciplineKey: 'judo' },
      { parts: ['technique', 'technique'] }, { parts: ['mixed'] }, { extra: true }])(`rejects invalid ${collection} activity fields %j`, async (fields) => {
      const item = collection === 'weekPlans' ? { ...club, omitted: false } : club
      await assertFails(ownerDatabase().doc(path).set({ ...create(), activity: { ...item, ...fields } }))
    })
    it(`requires every ${collection}/${id} field`, async () => {
      for (const key of Object.keys(create())) {
        const value: Document = create(); delete value[key]
        await assertFails(ownerDatabase().doc(path).set(value))
      }
    })
  }
  for (const collection of ['recurringWeeks', 'weekPlans']) it(`accepts all fourteen ${collection} entries atomically and rejects an invalid last entry`, async () => {
    const db = ownerDatabase(), batch = db.batch()
    const id = (index: number) => collection === 'recurringWeeks' ? `item-${index}` : `2026-11-09~${index}`
    const entry = collection === 'recurringWeeks' ? recurringEntry : scheduledEntry
    const header = db.doc(`users/${ownerId}/${collection}/${collection === 'recurringWeeks' ? 'default' : '2026-11-09'}`)
    batch.set(header, collection === 'recurringWeeks' ? { ...recurring(), itemCount: 14 } : { ...scheduled(), scheduleSize: 14 })
    for (let index = 0; index < 14; index++) batch.set(db.doc(`users/${ownerId}/${collection}/${id(index)}`), entry(index))
    await assertSucceeds(batch.commit())
    expect((await db.collection(`users/${ownerId}/${collection}`).get()).size).toBe(15)
    const invalid = db.batch()
    invalid.update(header, { updatedAt: '2026-11-10T10:00:00.000Z', revision: 2 })
    invalid.set(db.doc(`users/${ownerId}/${collection}/${id(13)}`), { ...entry(13), activity: { ...entry(13).activity, day: 7 } })
    await assertFails(invalid.commit())
    expect((await header.get()).data()?.updatedAt).toBe(instant)
    await assertFails(db.doc(`users/${ownerId}/${collection}/${id(14)}`).set(entry(14)))
  })
  for (const collection of ['recurringWeeks', 'weekPlans']) it.each([0, 1])(`accepts a full ${collection} batch with %i entries and deletion of nonexistent slots`, async (count) => {
    const db = ownerDatabase(), batch = db.batch(), path = `users/${ownerId}/${collection}`
    const id = (position: number) => collection === 'recurringWeeks' ? `item-${position}` : `2026-11-09~${position}`
    batch.set(db.doc(`${path}/${collection === 'recurringWeeks' ? 'default' : '2026-11-09'}`),
      collection === 'recurringWeeks' ? { ...recurring(), itemCount: count } : { ...scheduled(), scheduleSize: count })
    for (let position = 0; position < count; position++) batch.set(db.doc(`${path}/${id(position)}`), collection === 'recurringWeeks' ? recurringEntry(position) : scheduledEntry(position))
    for (let position = count; position < 14; position++) batch.delete(db.doc(`${path}/${id(position)}`))
    await assertSucceeds(batch.commit())
    expect((await db.collection(path).get()).size).toBe(count + 1)
  })
  it('rejects another singleton, invalid target, missing fields and a sticky history reset', async () => {
    await assertFails(ownerDatabase().doc(`users/${ownerId}/recurringWeeks/other`).set({ ...recurring(), id: 'other' }))
    const ref = ownerDatabase().doc(`users/${ownerId}/weekPlans/2026-11-09`)
    for (const targetCount of [-1, 1.5, 15, '3']) await assertFails(ref.set({ ...scheduled(), targetCount }))
    for (const key of Object.keys(scheduled())) {
      const value: Document = scheduled(); delete value[key]
      await assertFails(ref.set(value))
    }
    await assertSucceeds(ref.set({ ...scheduled(), editedAfterWeekEnd: true }))
    await assertFails(ref.update({ editedAfterWeekEnd: false }))
  })
})

describe('week plan ownership and shallow validation', () => {
  const weekStart = '2026-11-09'
  const path = `users/${ownerId}/weekPlans/${weekStart}`
  const create = (): Document => ({ schemaVersion: 1, weekStart, revision: 1,
    items: [{ id: 'one', kind: 'plan', workoutPlanId: documentId, planNameSnapshot: 'Bag' }],
    createdAt: instant, updatedAt: instant, editedAfterWeekEnd: false })

  it('allows owner create, read, bounded query, update and delete with preserved history', async () => {
    const db = ownerDatabase(), reference = db.doc(path)
    await assertSucceeds(reference.set(create()))
    expect((await assertSucceeds(reference.get())).data()).toEqual(create())
    expect((await assertSucceeds(db.collection(`users/${ownerId}/weekPlans`).where('weekStart', '>=', '2026-08-17').get())).size).toBe(1)
    await assertSucceeds(reference.update({ items: [], updatedAt: '2026-11-10T10:00:00.000Z', editedAfterWeekEnd: true, revision: 2 }))
    await assertFails(reference.update({ editedAfterWeekEnd: false }))
    await assertFails(reference.update({ createdAt: '2026-11-10T10:00:00.000Z' }))
    await assertSucceeds(reference.delete())
    expect((await reference.get()).exists).toBe(false)
  })

  it.each(['other', 'signedOut', 'unverified', 'missingClaim'])('denies every operation for %s', async (actor) => {
    await ownerDatabase().doc(path).set(create())
    const context = actor === 'signedOut' ? environment.unauthenticatedContext()
      : actor === 'other' ? environment.authenticatedContext('athlete-two', { email_verified: true })
        : actor === 'unverified' ? environment.authenticatedContext(ownerId, { email_verified: false })
          : environment.authenticatedContext(ownerId)
    const db = context.firestore(), reference = db.doc(path)
    await assertFails(db.doc(`users/${ownerId}/weekPlans/2026-11-16`).set({ ...create(), weekStart: '2026-11-16' }))
    await assertFails(reference.get())
    await assertFails(db.collection(`users/${ownerId}/weekPlans`).where('weekStart', '>=', '2026-08-17').get())
    await assertFails(reference.update({ items: [] }))
    await assertFails(reference.delete())
  })

  it.each([
    ['schemaVersion', 2], ['schemaVersion', '1'], ['weekStart', '2026-11-16'], ['weekStart', 42],
    ['weekStart', '09.11.2026'], ['createdAt', new Date(instant)], ['createdAt', '2026-11-08'],
    ['updatedAt', null], ['updatedAt', 42], ['editedAfterWeekEnd', 'true'], ['editedAfterWeekEnd', null],
    ['items', {}], ['items', null], ['items', Array.from({ length: 15 }, () => ({}))], ['extra', true],
  ] as [string, unknown][])('rejects invalid %s (%j) on create and update', async (field, value) => {
    const reference = ownerDatabase().doc(path)
    await assertFails(reference.set({ ...create(), [field]: value }))
    await assertSucceeds(reference.set(create()))
    await assertFails(reference.update({ [field]: value }))
  })

  it.each(Object.keys(create()))('requires %s on creation and replacement', async (field) => {
    const reference = ownerDatabase().doc(path), incomplete = create()
    delete incomplete[field]
    await assertFails(reference.set(incomplete))
    await assertSucceeds(reference.set(create()))
    await assertFails(reference.set(incomplete))
  })

  it('checks the document key date format, but leaves actual Monday and list entries to the app schema', async () => {
    const db = ownerDatabase()
    await assertFails(db.doc(`users/${ownerId}/weekPlans/not-a-date`).set({ ...create(), weekStart: 'not-a-date' }))
    const reference = db.doc(path)
    await assertSucceeds(reference.set({ ...create(), items: Array.from({ length: 14 }, () => ({})) }))
    await assertSucceeds(reference.update({ items: [], revision: 2 }))
  })
})

describe('quick timer feedback', () => {
  it('allows the owner to change the discipline of a quick timer session', async () => {
    const reference = ownerDatabase().doc(`users/${ownerId}/workoutSessions/${documentId}`)
    await assertSucceeds(reference.set(workoutSession('quickTimer')))
    await assertSucceeds(reference.update({ disciplineKey: 'kickboxing' }))
    expect((await reference.get()).data()?.disciplineKey).toBe('kickboxing')
  })

  it.each([null, 'light', 'technical', 'hard'])('allows owner sparring with intensity %s, round completion and later category changes', async (intensity) => {
    const reference = ownerDatabase().doc(`users/${ownerId}/workoutSessions/${documentId}`)
    const session = workoutSession('quickTimer')
    await assertSucceeds(reference.set(session))
    await assertSucceeds(reference.update({ sparring: [{ blockId: null, intensity, rounds: 1 }], updatedAt: '2026-11-13T10:00:00.000Z' }))
    const steps = session.stepResults as Document[]
    await assertSucceeds(reference.update({ category: 'pads', sparring: [], sparringSeconds: 0,
      stepResults: steps.map((step) => ({ ...step, blockType: 'pads', nameSnapshot: 'Tarcze' })) }))
    expect((await reference.get()).data()).toMatchObject({ source: 'quickTimer', category: 'pads', sparring: [], completion: { unit: 'round' } })
  })
})
