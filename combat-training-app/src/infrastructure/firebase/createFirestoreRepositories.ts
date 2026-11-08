import { getApp } from 'firebase/app'
import { clearIndexedDbPersistence, connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, terminate, type Firestore } from 'firebase/firestore'
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
  return {
    plans: {
      subscribe: trackedSubscribe(plans), save: plans.save.bind(plans),
      delete: async (id) => { await plans.delete(id) },
    },
    sessions: {
      subscribe: trackedSubscribe(sessions), save: sessions.save.bind(sessions),
      updateNote: sessions.updateNote.bind(sessions), delete: sessions.delete.bind(sessions),
    },
    focusSkills: {
      subscribe: trackedSubscribe(focusSkills), save: focusSkills.save.bind(focusSkills),
    },
  }
}
