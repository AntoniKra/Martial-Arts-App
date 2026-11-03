export interface WorkoutDocument {
  workoutId: string
  discipline: string
  completedRounds: number
  completedAtIso: string
}

export interface CacheObservation {
  exists: boolean
  hasPendingWrites: boolean
  fromCache: boolean
  data: Record<string, unknown> | null
  errorCode?: string
}

export interface SpikeApi {
  mode: 'persistent' | 'memory'
  writeWorkout: (workout: WorkoutDocument) => void
  readCache: (id: string) => Promise<CacheObservation>
  readServer: (id: string) => Promise<CacheObservation>
  writeState: () => { state: string; error: string | null }
}

declare global {
  interface Window {
    firestoreSpike: SpikeApi
  }
}
