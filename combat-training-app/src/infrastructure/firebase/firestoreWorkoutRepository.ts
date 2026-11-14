import { collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc, type Firestore } from 'firebase/firestore'
import type { RepositorySnapshot, SubscribableRepository } from '@/application/repositorySubscription'
import { hasPerformanceObserver, reportPerformanceEvent } from '@/application/performance/performanceEvents'

interface PendingWrite<T> {
  matches: (items: ReadonlyMap<string, T>) => boolean
  resolve: () => void
  reject: (error: unknown) => void
}

/** A single collection listener confirms local writes; SDK promises confirm only the server. */
export class FirestoreWorkoutRepository<T extends { id: string; updatedAt: string }> implements SubscribableRepository<T> {
  private items = new Map<string, T>()
  private writes = new Set<PendingWrite<T>>()
  private reportError: ((error: unknown) => void) | null = null
  private readable = false
  private readonly path

  constructor(db: Firestore, uid: string, private collectionName: 'workoutPlans' | 'workoutSessions' | 'focusSkills', private parse: (value: unknown) => T) {
    if (!uid || uid.includes('/')) throw new Error('Invalid user identity')
    this.path = collection(db, 'users', uid, collectionName)
  }

  subscribe(onChange: (snapshot: RepositorySnapshot<T>) => void, onError: (error: unknown) => void): () => void {
    if (this.reportError) throw new Error('Repository already subscribed')
    this.reportError = onError
    const stop = onSnapshot(this.path, { includeMetadataChanges: true }, (snapshot) => {
      const items = new Map<string, T>()
      const pendingIds = new Set<string>()
      const invalidDocumentIds: string[] = []
      for (const document of snapshot.docs) {
        try {
          const item = this.parse(document.data())
          if (item.id !== document.id) throw new Error('Document identity mismatch')
          items.set(item.id, item)
          if (document.metadata.hasPendingWrites) pendingIds.add(item.id)
        } catch { invalidDocumentIds.push(document.id) }
      }
      this.items = items
      this.readable = invalidDocumentIds.length === 0
      if (this.collectionName === 'workoutSessions' && hasPerformanceObserver()) reportPerformanceEvent({ type: 'snapshot', at: performance.now(),
        ids: new Set(items.keys()), pendingIds, hasPendingWrites: snapshot.metadata.hasPendingWrites, fromCache: snapshot.metadata.fromCache })
      onChange({ items: [...items.values()], pendingIds, hasPendingWrites: snapshot.metadata.hasPendingWrites,
        fromCache: snapshot.metadata.fromCache, invalidDocumentIds })
      for (const write of this.writes) {
        if (write.matches(items)) { this.writes.delete(write); write.resolve() }
      }
    }, (error) => {
      this.readable = false
      this.rejectWrites(error)
      onError(error)
    })
    return () => {
      if (this.collectionName === 'workoutSessions') reportPerformanceEvent({ type: 'unsubscribe' })
      stop()
      this.reportError = null
      this.items.clear()
      this.readable = false
      this.rejectWrites(new Error('Repository subscription closed'))
    }
  }

  private rejectWrites(error: unknown) {
    for (const write of this.writes) write.reject(error)
    this.writes.clear()
  }

  private write(action: () => Promise<void>, matches: PendingWrite<T>['matches']): Promise<void> {
    if (!this.reportError) return Promise.reject(new Error('Repository is not subscribed'))
    return new Promise((resolve, reject) => {
      const pending = { matches, resolve, reject }
      this.writes.add(pending)
      try {
        void action().then(() => {
          // Also handles a no-op write that produces no new local snapshot.
          this.writes.delete(pending)
          resolve()
        }, (error: unknown) => {
          this.writes.delete(pending)
          reject(error)
          this.reportError?.(error)
        })
        // An identical document is already durable locally, even if its server write is still queued.
        if (matches(this.items)) { this.writes.delete(pending); resolve() }
      } catch (error) { this.writes.delete(pending); reject(error) }
    })
  }

  async save(value: T, action?: () => Promise<void>): Promise<void> {
    const item = this.parse({ ...value, schemaVersion: 1 })
    const expected = JSON.stringify(item)
    if (this.collectionName === 'workoutSessions' && hasPerformanceObserver() && !this.items.has(item.id) && 'source' in item && item.source === 'manual') {
      reportPerformanceEvent({ type: 'save', id: item.id, at: performance.now() })
    }
    try {
      await this.write(action ?? (() => setDoc(doc(this.path, item.id), { ...item, schemaVersion: 1 })),
        (items) => JSON.stringify(items.get(item.id)) === expected)
    } catch (error) {
      if (this.collectionName === 'workoutSessions') reportPerformanceEvent({ type: 'save-error', id: item.id })
      throw error
    }
  }

  getItems(): readonly T[] {
    if (!this.reportError || !this.readable) throw new Error('Collection is not completely available')
    return [...this.items.values()]
  }

  async delete(id: string, action: () => Promise<void> = () => deleteDoc(doc(this.path, id))): Promise<boolean> {
    if (!this.items.has(id)) return false
    await this.write(action, (items) => !items.has(id))
    return true
  }

  async updateNote(id: string, note: string | null): Promise<boolean> {
    const current = this.items.get(id)
    if (!current) return false
    // Validate the complete resulting document, but update only the changed fields.
    const item = this.parse({ ...current, note, updatedAt: new Date().toISOString(), schemaVersion: 1 })
    await this.write(() => updateDoc(doc(this.path, id), { note, updatedAt: item.updatedAt }),
      (items) => JSON.stringify(items.get(id)) === JSON.stringify(item))
    return true
  }

  validateUpdate(id: string, fields: Partial<T>): T {
    const current = this.items.get(id)
    if (!current) throw new Error('Document is no longer available')
    return this.parse({ ...current, ...fields, schemaVersion: 1 })
  }

  async updateFields(id: string, fields: Partial<T>, action: () => Promise<void>): Promise<boolean> {
    if (!this.items.has(id)) return false
    this.validateUpdate(id, fields)
    await this.write(action, (items) => {
      const item = items.get(id)
      return !!item && (Object.keys(fields) as (keyof T)[]).every((key) => JSON.stringify(item[key]) === JSON.stringify(fields[key]))
    })
    return true
  }
}
