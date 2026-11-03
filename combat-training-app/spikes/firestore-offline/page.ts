import { FirebaseError, initializeApp } from 'firebase/app'
import {
  connectFirestoreEmulator,
  doc,
  getDocFromCache,
  getDocFromServer,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
  type DocumentSnapshot,
} from 'firebase/firestore'
import type { CacheObservation, SpikeApi } from './api'

if (location.hostname !== '127.0.0.1') {
  throw new Error('This spike only runs on the local loopback address.')
}

const mode = new URLSearchParams(location.search).get('cache') ?? 'persistent'
if (mode !== 'persistent' && mode !== 'memory') throw new Error('Unknown cache mode.')

// No API key, Auth, production configuration, or environment variables.
const app = initializeApp({ projectId: 'demo-combat-training' })
const db = initializeFirestore(app, mode === 'persistent' ? {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
} : {})
connectFirestoreEmulator(db, '127.0.0.1', 8080)

const status = document.querySelector('#status')
let writeState = 'idle'
let writeError: string | null = null

function display(value: unknown) {
  if (status) status.textContent = JSON.stringify({ mode, value }, null, 2)
}

function observe(snapshot: DocumentSnapshot): CacheObservation {
  return {
    exists: snapshot.exists(),
    hasPendingWrites: snapshot.metadata.hasPendingWrites,
    fromCache: snapshot.metadata.fromCache,
    data: snapshot.data() ?? null,
  }
}

const api: SpikeApi = {
  mode,
  writeWorkout(workout) {
    writeState = 'pending'
    writeError = null
    // Deliberately do not await the server acknowledgement.
    void setDoc(doc(db, 'workouts', workout.workoutId), workout).then(() => {
      writeState = 'acknowledged'
      display({ writeState })
    }).catch((error: unknown) => {
      writeState = 'rejected'
      writeError = error instanceof Error ? error.message : String(error)
      display({ writeState, writeError })
    })
    display({ writeState, workout })
  },
  async readCache(id) {
    let observation: CacheObservation
    try {
      observation = observe(await getDocFromCache(doc(db, 'workouts', id)))
    } catch (error: unknown) {
      if (!(error instanceof FirebaseError) || error.code !== 'unavailable') throw error
      observation = {
        exists: false, hasPendingWrites: false, fromCache: true, data: null,
        errorCode: error.code,
      }
    }
    display(observation)
    return observation
  },
  async readServer(id) {
    const observation = observe(await getDocFromServer(doc(db, 'workouts', id)))
    display(observation)
    return observation
  },
  writeState: () => ({ state: writeState, error: writeError }),
}

window.firestoreSpike = api
display({ ready: true })
