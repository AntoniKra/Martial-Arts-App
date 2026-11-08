import { getApp } from 'firebase/app'
import { clearIndexedDbPersistence, collection, doc, connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, terminate, writeBatch, type Firestore } from 'firebase/firestore'
import type { SubscribableRepository } from '@/application/repositorySubscription'
import type { WorkoutRepositories } from '@/application/deferredWorkoutRepositories'
import { readFirebaseConfig } from './firebaseConfig'
import { FirestoreWorkoutRepository } from './firestoreWorkoutRepository'
import { workoutPlanDocumentSchema, workoutSessionDocumentSchema } from './workoutDocumentSchemas'
import { focusSkillDocumentSchema } from './focusSkillDocumentSchema'

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

export async function clearFirestoreCache(): Promise<void> {
  if (!database) return
  const current = database
  for (const stop of subscriptions) stop()
  try {
    await terminate(current)
    await clearIndexedDbPersistence(current)
  } finally {
    // The next signed-in account needs a fresh instance, including its memory cache.
    database = undefined
  }
}

export function createFirestoreRepositories(uid: string): WorkoutRepositories {
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
  return {
    plans: {
      subscribe: trackedSubscribe(plans), save: plans.save.bind(plans),
      delete: async (id) => { await plans.delete(id) },
    },
    sessions: {
      subscribe: trackedSubscribe(sessions), save: sessions.save.bind(sessions),
      updateNote: sessions.updateNote.bind(sessions), delete: sessions.delete.bind(sessions),
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
    },
  }
}
