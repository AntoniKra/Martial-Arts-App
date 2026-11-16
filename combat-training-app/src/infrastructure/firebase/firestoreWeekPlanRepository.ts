import { collection, doc, onSnapshot, query, setDoc, where, writeBatch, type Firestore } from 'firebase/firestore'
import type { WeekPlanRepository, WeekPlanSnapshot } from '@/application/week-plan/weekPlanRepository'
import type { RecurringWeek, WeekPlan } from '@/domain/week-plan/weekPlan.types'
import { WEEK_PLAN_HISTORY_WEEKS, WEEK_PLAN_ITEM_LIMIT } from '@/domain/week-plan/weekPlan.types'
import { currentWeekStart, isMonday, shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import { combineWeekPlanDocuments, parseWeekPlanDocument, storedWeekPlanDocuments } from './weekPlanDocumentSchema'
import { recurringWeekRecords } from './recurringWeekDocumentSchema'

interface LocalWrite { expected: string; weekStart: string; additional?: { expected: string; weekStart: string }; resolve: () => void; reject: (error: unknown) => void }

/** Date-keyed documents have their own repository, with explicit query coverage. */
export class FirestoreWeekPlanRepository implements WeekPlanRepository {
  private readonly path
  private readonly recurringPath
  private items = new Map<string, WeekPlan>()
  private invalidIds = new Set<string>()
  private complete = false
  private rangeStart = ''
  private failed = false
  private writes = new Set<LocalWrite>()
  private reportError: ((error: unknown) => void) | null = null

  constructor(private db: Firestore, uid: string) {
    if (!uid || uid.includes('/')) throw new Error('Invalid user identity')
    this.path = collection(db, 'users', uid, 'weekPlans')
    this.recurringPath = collection(db, 'users', uid, 'recurringWeeks')
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
      const groups = new Map<string, typeof snapshot.docs[number][]>()
      for (const document of snapshot.docs) {
        const key = document.id.split('~')[0]
        const group = groups.get(key) ?? []
        group.push(document)
        groups.set(key, group)
      }
      for (const [key, documents] of groups) {
        try {
          const plan = combineWeekPlanDocuments(documents.map((document) => ({ id: document.id, data: document.data() })))
          if (plan.weekStart !== key || plan.weekStart < this.rangeStart) throw new Error('Document identity mismatch')
          items.set(plan.weekStart, plan)
          if (documents.some((document) => document.metadata.hasPendingWrites)) pendingIds.add(plan.weekStart)
        } catch { invalidDocumentIds.push(key) }
      }
      this.items = items
      this.invalidIds = new Set(invalidDocumentIds)
      if (!snapshot.metadata.fromCache) this.complete = true
      onChange({ items: [...items.values()], pendingIds, invalidDocumentIds, complete: this.complete, rangeStart: this.rangeStart,
        hasPendingWrites: snapshot.metadata.hasPendingWrites, fromCache: snapshot.metadata.fromCache })
      if (this.failed) onError(new Error('Week plan write rejected; retry subscription'))
      for (const write of this.writes) {
        if (JSON.stringify(items.get(write.weekStart)) === write.expected
          && (!write.additional || JSON.stringify(items.get(write.additional.weekStart)) === write.additional.expected)) { this.writes.delete(write); write.resolve() }
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

  private validateSave(value: WeekPlan) {
    const schemaVersion = value.schedule === undefined ? 1 : 2
    const plan = parseWeekPlanDocument({ ...value, schemaVersion })
    const previous = this.items.get(plan.weekStart)
    if (!this.reportError || this.failed || plan.weekStart < this.rangeStart || this.invalidIds.has(plan.weekStart)
      || (!previous && !this.complete)) throw new Error('Week plan is not safely available')
    if (previous && (previous.createdAt !== plan.createdAt || previous.editedAfterWeekEnd && !plan.editedAfterWeekEnd)) {
      throw new Error('Week plan history must be preserved')
    }
    if (plan.weekStart < currentWeekStart() && !plan.editedAfterWeekEnd) throw new Error('Historical edit must be marked')
    return plan
  }

  async save(value: WeekPlan, recurring?: RecurringWeek, additionalWeek?: WeekPlan): Promise<void> {
    const plan = this.validateSave(value)
    const additional = additionalWeek ? this.validateSave(additionalWeek) : undefined
    if (additional?.weekStart === plan.weekStart) throw new Error('Duplicate week in batch')
    const recurringRecords = recurring ? recurringWeekRecords(recurring) : undefined
    const previous = this.items.get(plan.weekStart)
    const expected = JSON.stringify(plan)
    return new Promise<void>((resolve, reject) => {
      const write: LocalWrite = { expected, weekStart: plan.weekStart, resolve, reject,
        additional: additional ? { expected: JSON.stringify(additional), weekStart: additional.weekStart } : undefined }
      this.writes.add(write)
      try {
        let server: Promise<void>
        if (plan.schedule === undefined && !recurring && !additional) server = setDoc(doc(this.path, plan.weekStart), { ...plan, schemaVersion: 1 })
        else {
          const batch = writeBatch(this.db)
          for (const week of [plan, ...(additional ? [additional] : [])]) {
            for (const document of storedWeekPlanDocuments(week)) batch.set(doc(this.path, document.id), document.data)
            for (let position = week.schedule?.length ?? 0; position < WEEK_PLAN_ITEM_LIMIT; position++) batch.delete(doc(this.path, `${week.weekStart}~${position}`))
          }
          if (recurringRecords && recurring) {
            for (const record of recurringRecords) batch.set(doc(this.recurringPath, record.id), record)
            for (let position = recurring.items.length; position < WEEK_PLAN_ITEM_LIMIT; position++) batch.delete(doc(this.recurringPath, `item-${position}`))
          }
          server = batch.commit()
        }
        void server.then(() => {
          this.writes.delete(write)
          resolve()
        }, (error: unknown) => { this.writes.delete(write); reject(error); this.fail(error) })
        if (!recurring && !additional && JSON.stringify(previous) === expected) { this.writes.delete(write); resolve() }
      } catch (error) { this.writes.delete(write); reject(error); this.fail(error) }
    })
  }
}
