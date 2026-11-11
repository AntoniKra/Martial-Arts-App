import { collection, doc, onSnapshot, query, setDoc, where, type Firestore } from 'firebase/firestore'
import type { WeekPlanRepository, WeekPlanSnapshot } from '@/application/week-plan/weekPlanRepository'
import type { WeekPlan } from '@/domain/week-plan/weekPlan.types'
import { WEEK_PLAN_HISTORY_WEEKS } from '@/domain/week-plan/weekPlan.types'
import { currentWeekStart, isMonday, shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import { parseWeekPlanDocument } from './weekPlanDocumentSchema'

interface LocalWrite { expected: string; weekStart: string; resolve: () => void; reject: (error: unknown) => void }

/** Date-keyed documents have their own repository, with explicit query coverage. */
export class FirestoreWeekPlanRepository implements WeekPlanRepository {
  private readonly path
  private items = new Map<string, WeekPlan>()
  private invalidIds = new Set<string>()
  private complete = false
  private rangeStart = ''
  private failed = false
  private writes = new Set<LocalWrite>()
  private reportError: ((error: unknown) => void) | null = null

  constructor(db: Firestore, uid: string) {
    if (!uid || uid.includes('/')) throw new Error('Invalid user identity')
    this.path = collection(db, 'users', uid, 'weekPlans')
  }

  subscribe(currentWeek: string, onChange: (snapshot: WeekPlanSnapshot) => void, onError: (error: unknown) => void): () => void {
    if (!isMonday(currentWeek)) throw new Error('Invalid current week')
    if (this.reportError) throw new Error('Repository already subscribed')
    this.reportError = onError
    this.failed = false
    this.complete = false
    this.rangeStart = shiftCalendarDate(currentWeek, -7 * WEEK_PLAN_HISTORY_WEEKS)
    let active = true
    const stop = onSnapshot(query(this.path, where('weekStart', '>=', this.rangeStart)), { includeMetadataChanges: true }, (snapshot) => {
      if (!active) return
      const items = new Map<string, WeekPlan>()
      const invalidDocumentIds: string[] = []
      const pendingIds = new Set<string>()
      for (const document of snapshot.docs) {
        try {
          const plan = parseWeekPlanDocument(document.data())
          if (plan.weekStart !== document.id || plan.weekStart < this.rangeStart) throw new Error('Document identity mismatch')
          items.set(plan.weekStart, plan)
          if (document.metadata.hasPendingWrites) pendingIds.add(plan.weekStart)
        } catch { invalidDocumentIds.push(document.id) }
      }
      this.items = items
      this.invalidIds = new Set(invalidDocumentIds)
      if (!snapshot.metadata.fromCache) this.complete = true
      onChange({ items: [...items.values()], pendingIds, invalidDocumentIds, complete: this.complete, rangeStart: this.rangeStart,
        hasPendingWrites: snapshot.metadata.hasPendingWrites, fromCache: snapshot.metadata.fromCache })
      if (this.failed) onError(new Error('Week plan write rejected; retry subscription'))
      for (const write of this.writes) {
        if (JSON.stringify(items.get(write.weekStart)) === write.expected) { this.writes.delete(write); write.resolve() }
      }
    }, (error) => { if (active) this.fail(error) })
    return () => {
      active = false
      stop()
      this.reportError = null
      this.items.clear()
      this.invalidIds.clear()
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

  async save(value: WeekPlan): Promise<void> {
    const plan = parseWeekPlanDocument({ ...value, schemaVersion: 1 })
    const previous = this.items.get(plan.weekStart)
    if (!this.reportError || this.failed || plan.weekStart < this.rangeStart || this.invalidIds.has(plan.weekStart)
      || (!previous && !this.complete)) throw new Error('Week plan is not safely available')
    if (previous && (previous.createdAt !== plan.createdAt || previous.editedAfterWeekEnd && !plan.editedAfterWeekEnd)) {
      throw new Error('Week plan history must be preserved')
    }
    if (plan.weekStart < currentWeekStart() && !plan.editedAfterWeekEnd) throw new Error('Historical edit must be marked')
    const expected = JSON.stringify(plan)
    return new Promise<void>((resolve, reject) => {
      const write = { expected, weekStart: plan.weekStart, resolve, reject }
      this.writes.add(write)
      try {
        void setDoc(doc(this.path, plan.weekStart), { ...plan, schemaVersion: 1 }).then(() => {
          this.writes.delete(write)
          resolve()
        }, (error: unknown) => { this.writes.delete(write); reject(error); this.fail(error) })
        if (JSON.stringify(previous) === expected) { this.writes.delete(write); resolve() }
      } catch (error) { this.writes.delete(write); reject(error); this.fail(error) }
    })
  }
}
