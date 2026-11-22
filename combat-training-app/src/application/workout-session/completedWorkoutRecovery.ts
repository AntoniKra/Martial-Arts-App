import type { RepositorySnapshot } from '@/application/repositorySubscription'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import type { RecordedWorkoutSession, WorkoutSessionRepository } from './workoutSessionRepository'

export interface CompletedWorkoutStorage {
  readAll(): RecordedWorkoutSession[]
  save(session: RecordedWorkoutSession): void
  remove(id: string): void
}

interface SaveAttempt {
  local: Promise<void> | null
  rejected: boolean
}

export class CompletedWorkoutRecovery {
  private copies
  private attempts = new Map<string, SaveAttempt>()
  private listeners = new Set<() => void>()
  private snapshot: RepositorySnapshot<WorkoutSession> | null = null
  private readFailed = false
  private retries: readonly RecordedWorkoutSession[] = []

  constructor(private storage: CompletedWorkoutStorage) {
    this.copies = new Map(storage.readAll().map((session) => [session.id, session]))
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  getRetries = () => this.retries

  observe(snapshot: RepositorySnapshot<WorkoutSession>) {
    this.snapshot = snapshot
    this.readFailed = false
    if (!snapshot.fromCache) {
      for (const session of this.copies.values()) {
        if (!snapshot.pendingIds.has(session.id) && this.hasLocalSession(session)) this.remove(session.id)
      }
    }
    this.publish()
  }

  observeReadFailure() {
    this.readFailed = true
    this.publish()
  }

  async save(session: RecordedWorkoutSession, repository: Pick<WorkoutSessionRepository, 'saveRecorded'>): Promise<void> {
    const { id } = session
    const previous = this.attempts.get(id)
    if (previous?.local) return previous.local

    const copy = this.copies.get(id) ?? session
    if (!previous?.rejected && this.hasLocalSession(copy)) {
      if (this.snapshot?.fromCache || this.snapshot?.pendingIds.has(id)) this.retain(copy)
      return
    }

    this.retain(copy)
    const attempt: SaveAttempt = { local: null, rejected: false }
    const reject = () => {
      if (this.attempts.get(id) !== attempt) return
      attempt.rejected = true
      this.publish()
    }
    const local = Promise.resolve().then(() => repository.saveRecorded(copy, reject)).catch((error: unknown) => {
      reject()
      throw error
    }).finally(() => {
      attempt.local = null
      this.publish()
    })
    attempt.local = local
    this.attempts.set(id, attempt)
    this.publish()
    return local
  }

  discard(id: string) {
    this.remove(id)
    this.publish()
  }

  private retain(session: RecordedWorkoutSession) {
    if (this.copies.has(session.id)) return
    this.storage.save(session)
    this.copies.set(session.id, session)
  }

  private remove(id: string) {
    if (!this.copies.has(id)) return
    this.storage.remove(id)
    this.copies.delete(id)
    this.attempts.delete(id)
  }

  private hasLocalSession(session: RecordedWorkoutSession) {
    return this.snapshot?.items.some((item) => item.id === session.id && item.source !== 'manual' && item.source === session.source
      && item.createdAt === session.createdAt && item.startedAt === session.startedAt && item.completedAt === session.completedAt)
  }

  private publish() {
    this.retries = [...this.copies.values()].filter((session) => {
      const attempt = this.attempts.get(session.id)
      return !attempt?.local && (attempt?.rejected || ((this.snapshot || this.readFailed)
        && !this.snapshot?.pendingIds.has(session.id) && !this.hasLocalSession(session)))
    })
    for (const listener of this.listeners) listener()
  }
}
