import { collection, deleteDoc, doc, getDocsFromServer, onSnapshot, setDoc, writeBatch,
  type DocumentData, type Firestore } from 'firebase/firestore'
import type { RepositorySnapshot, SubscribableRepository } from '@/application/repositorySubscription'
import type { AthleteProfile, BodyWeight } from '@/domain/profile/profile.types'
import { createConsentWithdrawalBatches, hasValidHealthConsent, isMeasurementDate } from '@/domain/profile/bodyWeight'
import { calculateWorkoutDate } from '@/domain/workout-session/workoutSessionDefinitions'
import { parseBodyWeightDocument, parseProfileDocument } from './profileDocumentSchemas'

interface LocalWrite<T> {
  matches: (items: ReadonlyMap<string, T>) => boolean
  resolve: () => void
  reject: (error: unknown) => void
}
interface SnapshotDocument { id: string; data(): DocumentData; metadata: { hasPendingWrites: boolean } }

/** Profile and date-keyed weights share local confirmation and sticky write-error handling. */
class HealthRepository<T extends { createdAt: string; updatedAt: string }> implements SubscribableRepository<T> {
  private items = new Map<string, T>()
  private invalid = new Set<string>()
  private writes = new Set<LocalWrite<T>>()
  private reportError: ((error: unknown) => void) | null = null
  private complete = false
  private failed = false

  constructor(private db: Firestore, private uid: string, private kind: 'profile' | 'bodyWeights',
    private parse: (value: unknown) => T, private identity: (value: T) => string) {
    if (!uid || uid.includes('/')) throw new Error('Invalid user identity')
  }

  subscribe(onChange: (snapshot: RepositorySnapshot<T>) => void, onError: (error: unknown) => void): () => void {
    if (this.reportError) throw new Error('Repository already subscribed')
    this.reportError = onError
    this.failed = false
    let active = true
    const receive = (docs: SnapshotDocument[], metadata: { fromCache: boolean; hasPendingWrites: boolean }) => {
      if (!active) return
      const items = new Map<string, T>(), invalidDocumentIds: string[] = [], pendingIds = new Set<string>()
      for (const document of docs) {
        try {
          const value = this.parse(document.data())
          if (this.identity(value) !== document.id) throw new Error('Document identity mismatch')
          items.set(document.id, value)
          if (document.metadata.hasPendingWrites) pendingIds.add(document.id)
        } catch { invalidDocumentIds.push(document.id) }
      }
      this.items = items
      this.invalid = new Set(invalidDocumentIds)
      if (!metadata.fromCache) this.complete = true
      onChange({ items: [...items.values()], pendingIds, invalidDocumentIds, ...metadata })
      if (this.failed) onError(new Error('Health data write rejected; retry subscription'))
      for (const write of this.writes) {
        if (write.matches(items)) { this.writes.delete(write); write.resolve() }
      }
    }
    const stop = this.kind === 'profile'
      ? onSnapshot(doc(this.db, 'users', this.uid), { includeMetadataChanges: true },
        (snapshot) => receive(snapshot.exists() ? [snapshot] : [], snapshot.metadata), (error) => this.fail(error))
      : onSnapshot(collection(this.db, 'users', this.uid, 'bodyWeights'), { includeMetadataChanges: true },
        (snapshot) => receive(snapshot.docs, snapshot.metadata), (error) => this.fail(error))
    return () => {
      active = false
      stop()
      this.reportError = null
      this.items.clear()
      this.invalid.clear()
      this.complete = false
      this.rejectWrites(new Error('Repository subscription closed'))
    }
  }

  private rejectWrites(error: unknown) {
    for (const write of this.writes) write.reject(error)
    this.writes.clear()
  }

  private fail(error: unknown) {
    this.failed = true
    this.rejectWrites(error)
    this.reportError?.(error)
  }

  current(id: string): T | undefined {
    if (!this.reportError || this.failed || this.invalid.size || (!this.items.has(id) && !this.complete)) {
      throw new Error('Health data is not safely available')
    }
    return this.items.get(id)
  }

  private write(action: () => Promise<void>, matches: LocalWrite<T>['matches']): Promise<void> {
    return new Promise((resolve, reject) => {
      const pending = { matches, resolve, reject }
      this.writes.add(pending)
      try {
        void action().then(() => { this.writes.delete(pending); resolve() }, (error: unknown) => {
          this.writes.delete(pending); reject(error); this.fail(error)
        })
        if (matches(this.items)) { this.writes.delete(pending); resolve() }
      } catch (error) { this.writes.delete(pending); reject(error); this.fail(error) }
    })
  }

  async save(value: T): Promise<void> {
    const parsed = this.parse({ ...value, schemaVersion: 1 }), id = this.identity(parsed)
    const previous = this.current(id)
    if (previous && previous.createdAt !== parsed.createdAt) throw new Error('Creation time must be preserved')
    const reference = this.kind === 'profile' ? doc(this.db, 'users', this.uid) : doc(this.db, 'users', this.uid, 'bodyWeights', id)
    await this.write(() => setDoc(reference, { ...parsed, schemaVersion: 1 }),
      (items) => JSON.stringify(items.get(id)) === JSON.stringify(parsed))
  }

  async delete(id: string): Promise<void> {
    if (!this.current(id)) return
    await this.write(() => deleteDoc(doc(this.db, 'users', this.uid, 'bodyWeights', id)), (items) => !items.has(id))
  }
}

export function createFirestoreHealthRepositories(db: Firestore, uid: string) {
  const profile = new HealthRepository<AthleteProfile>(db, uid, 'profile', parseProfileDocument, () => uid)
  const weights = new HealthRepository<BodyWeight>(db, uid, 'bodyWeights', parseBodyWeightDocument, (value) => value.date)
  let withdrawing = false
  return {
    profile: {
      subscribe: profile.subscribe.bind(profile),
      save: async (value: AthleteProfile) => {
        if (withdrawing) throw new Error('Consent withdrawal in progress')
        const previous = profile.current(uid)
        if (previous?.healthDataConsent && value.healthDataConsent
          && JSON.stringify(previous.healthDataConsent) !== JSON.stringify(value.healthDataConsent)) throw new Error('Withdraw consent before replacing it')
        await profile.save(value)
      },
      withdrawConsent: async () => {
        if (withdrawing) throw new Error('Consent withdrawal in progress')
        profile.current(uid)
        withdrawing = true
        try {
          // A server read is mandatory: cached data must never stand in for the complete collection.
          const snapshot = await getDocsFromServer(collection(db, 'users', uid, 'bodyWeights'))
          for (const part of createConsentWithdrawalBatches(snapshot.docs.map((entry) => entry.id))) {
            const batch = writeBatch(db)
            for (const id of part.ids) batch.delete(doc(db, 'users', uid, 'bodyWeights', id))
            if (part.withdrawConsent) batch.update(doc(db, 'users', uid), {
              healthDataConsent: null, weightClassLabel: null, updatedAt: new Date().toISOString(),
            })
            await batch.commit()
          }
        } finally { withdrawing = false }
      },
    },
    bodyWeights: {
      subscribe: weights.subscribe.bind(weights),
      save: async (value: BodyWeight) => {
        if (withdrawing || !hasValidHealthConsent(profile.current(uid))) throw new Error('Current health consent required')
        const today = calculateWorkoutDate(new Date().toISOString(), Intl.DateTimeFormat().resolvedOptions().timeZone)
        if (!isMeasurementDate(value.date, today)) throw new Error('Invalid measurement date')
        await weights.save(value)
      },
      delete: (date: string) => {
        if (withdrawing) return Promise.reject(new Error('Consent withdrawal in progress'))
        return weights.delete(date)
      },
    },
  }
}
