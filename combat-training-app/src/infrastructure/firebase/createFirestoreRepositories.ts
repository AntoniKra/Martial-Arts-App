import { getApp } from 'firebase/app'
import { connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore'
import type { WorkoutPlanRepository } from '@/application/workout/workoutPlanRepository'
import type { WorkoutSessionRepository } from '@/application/workout-session/workoutSessionRepository'
import { readFirebaseConfig } from './firebaseConfig'
import { FirestoreWorkoutRepository } from './firestoreWorkoutRepository'
import { workoutPlanDocumentSchema, workoutSessionDocumentSchema } from './workoutDocumentSchemas'

let database: Firestore | undefined

export function createFirestoreRepositories(uid: string): { plans: WorkoutPlanRepository; sessions: WorkoutSessionRepository } {
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
  return { plans: { subscribe: plans.subscribe.bind(plans), save: plans.save.bind(plans),
    delete: async (id) => { await plans.delete(id) } }, sessions }
}
