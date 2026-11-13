import { getApp } from 'firebase/app'
import { clearIndexedDbPersistence, collection, doc, connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, terminate, updateDoc, waitForPendingWrites, writeBatch, type Firestore } from 'firebase/firestore'
import type { SubscribableRepository } from '@/application/repositorySubscription'
import type { WorkoutRepositories } from '@/application/deferredWorkoutRepositories'
import { readFirebaseConfig } from './firebaseConfig'
import { FirestoreWorkoutRepository } from './firestoreWorkoutRepository'
import { workoutPlanDocumentSchema, workoutSessionDocumentSchema } from './workoutDocumentSchemas'
import { focusSkillDocumentSchema } from './focusSkillDocumentSchema'
import { FirestoreWeekPlanRepository } from './firestoreWeekPlanRepository'
import { createFirestoreHealthRepositories } from './firestoreHealthRepository'
import { detachFocusSkill, hasFocusSkillEntries, selectFocusSkillPlans } from '@/domain/focus-skill/focusSkillProgress'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'

let database: Firestore | undefined
const subscriptions = new Set<() => void>()

function trackedSubscribe<T>(repository: SubscribableRepository<T>): SubscribableRepository<T>['subscribe'] {
  return (onChange, onError) => {
    const unsubscribe = repository.subscribe(onChange, onError)
    const stop = () => {
      // React's later effect cleanup must not close the same listener twice.
      if (subscriptions.delete(stop)) unsubscribe()
    }
    subscriptions.add(stop)
    return stop
  }
}

export async function hasUnsentWrites(): Promise<boolean> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const timedOut = new Promise<boolean>((resolve) => { timeout = setTimeout(() => resolve(true), 1000) })
  try {
    const current = getAccountDatabase()
    return await Promise.race([
      waitForPendingWrites(current).then(() => false, () => true),
      timedOut,
    ])
  } catch {
    return true
  } finally {
    clearTimeout(timeout)
  }
}

export async function clearFirestoreCache(): Promise<void> {
  const current = getAccountDatabase()
  for (const stop of subscriptions) stop()
  try {
    await terminate(current)
    await clearIndexedDbPersistence(current)
  } finally {
    // The next signed-in account needs a fresh instance, including its memory cache.
    database = undefined
  }
}

export function getAccountDatabase(): Firestore {
  if (!database) {
    const config = readFirebaseConfig(import.meta.env)
    if (config.projectId.startsWith('demo-') && !config.firestoreEmulatorHost) throw new Error('Demo project requires a Firestore emulator')
    database = initializeFirestore(getApp(), {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
    if (config.firestoreEmulatorHost) {
      const [host, port] = config.firestoreEmulatorHost.split(':')
      connectFirestoreEmulator(database, host, Number(port))
    }
  }
  return database
}

export function createFirestoreRepositories(uid: string): WorkoutRepositories {
  const database = getAccountDatabase()
  const plans = new FirestoreWorkoutRepository(database, uid, 'workoutPlans', (value) => {
    const { schemaVersion: _version, ...plan } = workoutPlanDocumentSchema.parse(value)
    return plan
  })
  const sessions = new FirestoreWorkoutRepository(database, uid, 'workoutSessions', (value) => {
    const { schemaVersion: _version, ...session } = workoutSessionDocumentSchema.parse(value)
    return session
  })
  const focusSkills = new FirestoreWorkoutRepository(database, uid, 'focusSkills', (value) => {
    const { schemaVersion: _version, ...skill } = focusSkillDocumentSchema.parse(value)
    return skill
  })
  const db = database
  const weekPlans = new FirestoreWeekPlanRepository(db, uid)
  const health = createFirestoreHealthRepositories(db, uid)
  async function changeFocusSkill(id: string, updatedAt: string, action: 'archive' | 'delete' | 'restore') {
    if (!focusSkills.getItems().some((skill) => skill.id === id)) throw new Error('Focus skill no longer available')
    if (action === 'delete' && hasFocusSkillEntries(id, sessions.getItems())) throw new Error('Focus skill has session entries')
    const affected = action === 'restore' ? [] : selectFocusSkillPlans(id, plans.getItems())
    if (affected.length > 499) throw new Error('Too many plans for one batch')
    const changedPlans = affected.map((plan) => {
      const detached = detachFocusSkill(plan, id, updatedAt)
      const fields = { blocks: detached.blocks, updatedAt }
      plans.validateUpdate(plan.id, fields)
      return { id: plan.id, fields }
    })
    const fields = { archivedAt: action === 'archive' ? updatedAt : null, updatedAt }
    // Validate timestamps even for a deletion, before constructing any write.
    focusSkills.validateUpdate(id, fields)
    const batch = writeBatch(db)
    const skillRef = doc(collection(db, 'users', uid, 'focusSkills'), id)
    if (action === 'delete') batch.delete(skillRef)
    else batch.update(skillRef, fields)
    for (const plan of changedPlans) batch.update(doc(collection(db, 'users', uid, 'workoutPlans'), plan.id), plan.fields)
    let resolveServer!: () => void
    let rejectServer!: (error: unknown) => void
    const server = new Promise<void>((resolve, reject) => { resolveServer = resolve; rejectServer = reject })
    // Observe every local change before commit; the server may be offline indefinitely.
    const localWrites = [action === 'delete' ? focusSkills.delete(id, () => server) : focusSkills.updateFields(id, fields, () => server),
      ...changedPlans.map((plan) => plans.updateFields(plan.id, plan.fields, () => server))]
    try { void batch.commit().then(resolveServer, rejectServer) } catch (error) { rejectServer(error) }
    if (!(await Promise.all(localWrites)).every(Boolean)) throw new Error('Focus skill change was not applied')
  }
  return {
    profile: { ...health.profile, subscribe: trackedSubscribe(health.profile) },
    bodyWeights: { ...health.bodyWeights, subscribe: trackedSubscribe(health.bodyWeights) },
    weekPlans: {
      subscribe: (currentWeek, onChange, onError) => {
        const unsubscribe = weekPlans.subscribe(currentWeek, onChange, onError)
        const stop = () => { if (subscriptions.delete(stop)) unsubscribe() }
        subscriptions.add(stop)
        return stop
      },
      save: weekPlans.save.bind(weekPlans),
    },
    plans: {
      subscribe: trackedSubscribe(plans), save: plans.save.bind(plans),
      delete: async (id) => { await plans.delete(id) },
    },
    sessions: {
      subscribe: trackedSubscribe(sessions), save: sessions.save.bind(sessions),
      saveManual: async (session, correctionUpdates) => {
        const parsed = workoutSessionDocumentSchema.parse({ ...session, schemaVersion: 1 })
        const skillFields = correctionUpdates.map((update) => {
          const changes = { openCorrection: update.openCorrection, updatedAt: session.updatedAt }
          focusSkills.validateUpdate(update.focusSkillId, changes)
          return { id: update.focusSkillId, changes }
        })
        const batch = writeBatch(db)
        batch.set(doc(collection(db, 'users', uid, 'workoutSessions'), session.id), parsed)
        for (const skill of skillFields) batch.update(doc(collection(db, 'users', uid, 'focusSkills'), skill.id), skill.changes)
        let resolveServer!: () => void
        let rejectServer!: (error: unknown) => void
        const server = new Promise<void>((resolve, reject) => { resolveServer = resolve; rejectServer = reject })
        const localWrites = [sessions.save(session, () => server),
          ...skillFields.map((skill) => focusSkills.updateFields(skill.id, skill.changes, () => server))]
        try { void batch.commit().then(resolveServer, rejectServer) } catch (error) { rejectServer(error) }
        await Promise.all(localWrites)
      },
      updateNote: sessions.updateNote.bind(sessions),
      delete: async (id) => {
        // Preserve deletion when a collection is unavailable, without additional reads.
        let availableSkills: readonly FocusSkill[]
        try {
          if (!sessions.getItems().some((session) => session.id === id)) return false
          availableSkills = focusSkills.getItems()
        } catch { return sessions.delete(id) }
        const updatedAt = new Date().toISOString()
        const skillFields = availableSkills.filter((skill) => skill.openCorrection?.sessionId === id).map((skill) => {
          const changes = { openCorrection: null, updatedAt }
          focusSkills.validateUpdate(skill.id, changes)
          return { id: skill.id, changes }
        })
        const batch = writeBatch(db)
        batch.delete(doc(collection(db, 'users', uid, 'workoutSessions'), id))
        for (const skill of skillFields) batch.update(doc(collection(db, 'users', uid, 'focusSkills'), skill.id), skill.changes)
        let resolveServer!: () => void
        let rejectServer!: (error: unknown) => void
        const server = new Promise<void>((resolve, reject) => { resolveServer = resolve; rejectServer = reject })
        // Register both collection observers before commit, so deletion also completes offline.
        const localWrites = [sessions.delete(id, () => server),
          ...skillFields.map((skill) => focusSkills.updateFields(skill.id, skill.changes, () => server))]
        try { void batch.commit().then(resolveServer, rejectServer) } catch (error) { rejectServer(error) }
        return (await Promise.all(localWrites)).every(Boolean)
      },
      saveQuickTimerFeedback: async (id, feedback) => {
        const current = sessions.getItems().find((session) => session.id === id)
        if (!current) return false
        if (current.source !== 'quickTimer') throw new Error('Expected a quick timer entry')
        return sessions.updateFields(id, feedback, () => updateDoc(doc(collection(db, 'users', uid, 'workoutSessions'), id), feedback))
      },
      saveRpe: async (id, rpe, recordedAt) => {
        const fields = { rpe, rpeRecordedAt: recordedAt, updatedAt: recordedAt }
        return sessions.updateFields(id, fields, () => updateDoc(doc(collection(db, 'users', uid, 'workoutSessions'), id), fields))
      },
      saveFeedback: async (id, feedback) => {
        const { correctionUpdates, ...fields } = feedback
        // Validate every resulting document before committing the single offline-capable batch.
        sessions.validateUpdate(id, fields)
        const skillFields = correctionUpdates.map((update) => {
          const changes = { openCorrection: update.openCorrection, updatedAt: feedback.updatedAt }
          focusSkills.validateUpdate(update.focusSkillId, changes)
          return { id: update.focusSkillId, changes }
        })
        const batch = writeBatch(db)
        batch.update(doc(collection(db, 'users', uid, 'workoutSessions'), id), fields)
        for (const skill of skillFields) batch.update(doc(collection(db, 'users', uid, 'focusSkills'), skill.id), skill.changes)
        let resolveServer!: () => void
        let rejectServer!: (error: unknown) => void
        const server = new Promise<void>((resolve, reject) => { resolveServer = resolve; rejectServer = reject })
        // Register both collection observers before committing, including a no-op session update.
        const localWrites = [sessions.updateFields(id, fields, () => server),
          ...skillFields.map((skill) => focusSkills.updateFields(skill.id, skill.changes, () => server))]
        try { void batch.commit().then(resolveServer, rejectServer) } catch (error) { rejectServer(error) }
        return (await Promise.all(localWrites)).every(Boolean)
      },
    },
    focusSkills: {
      subscribe: trackedSubscribe(focusSkills), save: focusSkills.save.bind(focusSkills),
      archive: (id, updatedAt) => changeFocusSkill(id, updatedAt, 'archive'),
      deleteUnused: (id, updatedAt) => changeFocusSkill(id, updatedAt, 'delete'),
      restore: (id, updatedAt) => changeFocusSkill(id, updatedAt, 'restore'),
    },
  }
}
