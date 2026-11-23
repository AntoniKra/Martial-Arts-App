import { collection, doc, getDocsFromServer, onSnapshot, query, setDoc, where, writeBatch, type Firestore } from 'firebase/firestore'
import type { WeekPlanRepository, WeekPlanSnapshot, WeekPlanSaveIntent } from '@/application/week-plan/weekPlanRepository'
import type { RecurringWeek, WeekPlan } from '@/domain/week-plan/weekPlan.types'
import { WEEK_PLAN_HISTORY_WEEKS, WEEK_PLAN_ITEM_LIMIT } from '@/domain/week-plan/weekPlan.types'
import { currentWeekStart, isMonday, shiftCalendarDate, WEEK_PLAN_TIME_ZONE } from '@/domain/week-plan/weekCalendar'
import { combineWeekPlanDocuments, parseWeekPlanDocument, storedWeekPlanDocuments } from './weekPlanDocumentSchema'
import { combineRecurringWeekRecords, recurringWeekRecords, recurringWeekRecordSchema } from './recurringWeekDocumentSchema'
import { updateCurrentWeekFromRecurring } from '@/domain/week-plan/updateRecurringWeek'
import { mergeChangedItems, rebaseWeekChange } from '@/domain/week-plan/reconcileWeekChange'
import { generateScheduledWeek } from '@/domain/week-plan/scheduledWeek'

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
  private recovering = false
  private generation = 0
  private pendingCommits = 0

  constructor(private db: Firestore, uid: string) {
    if (!uid || uid.includes('/')) throw new Error('Invalid user identity')
    this.path = collection(db, 'users', uid, 'weekPlans')
    this.recurringPath = collection(db, 'users', uid, 'recurringWeeks')
  }

  subscribe(currentWeek: string, onChange: (snapshot: WeekPlanSnapshot) => void, onError: (error: unknown) => void): () => void {
    if (!isMonday(currentWeek)) throw new Error('Invalid current week')
    if (this.reportError) throw new Error('Repository already subscribed')
    this.reportError = onError
    this.generation++
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
      this.generation++
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

  private validateSave(value: WeekPlan, currentWeek: string) {
    const schemaVersion = value.schedule === undefined ? 1 : 2
    const plan = parseWeekPlanDocument({ ...value, schemaVersion })
    const previous = this.items.get(plan.weekStart)
    if (!this.reportError || this.failed || plan.weekStart < this.rangeStart || this.invalidIds.has(plan.weekStart)
      || (!previous && !this.complete)) throw new Error('Week plan is not safely available')
    if (previous && (previous.createdAt !== plan.createdAt || previous.editedAfterWeekEnd && !plan.editedAfterWeekEnd)) {
      throw new Error('Week plan history must be preserved')
    }
    if (plan.weekStart < currentWeek && !plan.editedAfterWeekEnd) throw new Error('Historical edit must be marked')
    return plan
  }

  async reconcile(recurring: RecurringWeek, now: Date): Promise<void> {
    const start = currentWeekStart(now, WEEK_PLAN_TIME_ZONE)
    const current = this.items.get(start)
    if (this.recovering || this.pendingCommits || !current || (recurring.revision ?? 0) <= (current.appliedRecurringRevision ?? 0)) return
    const next = updateCurrentWeekFromRecurring(undefined, recurring, current, now)
    await this.save(next, undefined, undefined, { reconcileOnly: true, operationTime: now })
  }

  private async freshState() {
    const [weeks, source] = await Promise.all([
      getDocsFromServer(query(this.path, where('weekStart', '>=', this.rangeStart))), getDocsFromServer(this.recurringPath),
    ])
    if (weeks.metadata.hasPendingWrites || source.metadata.hasPendingWrites) throw new Error('Unsettled weekly writes')
    const groups = new Map<string, { id: string; data: unknown }[]>()
    for (const document of weeks.docs) {
      const key = document.id.split('~')[0]
      groups.set(key, [...(groups.get(key) ?? []), { id: document.id, data: document.data() }])
    }
    const items = new Map([...groups].map(([id, records]) => [id, combineWeekPlanDocuments(records)]))
    const recurring = combineRecurringWeekRecords(source.docs.map((document) => recurringWeekRecordSchema.parse(document.data())))
    return { items, recurring }
  }

  private async recover(before: WeekPlan | undefined, desired: WeekPlan, recurring: RecurringWeek | undefined, intent: WeekPlanSaveIntent | undefined, generation: number) {
    if (generation !== this.generation || !this.reportError) return
    this.recovering = true
    try {
      const fresh = await this.freshState()
      if (generation !== this.generation || !this.reportError) throw new Error('Account subscription changed')
      this.items = fresh.items
      this.invalidIds.clear()
      this.complete = true
      const now = new Date()
      const start = currentWeekStart(now, WEEK_PLAN_TIME_ZONE)
      if (recurring) {
        const next: RecurringWeek = { ...recurring, createdAt: fresh.recurring?.createdAt ?? recurring.createdAt,
          updatedAt: now.toISOString(), revision: (fresh.recurring?.revision ?? 0) + 1,
          items: mergeChangedItems(intent?.previousRecurring?.items ?? [], recurring.items, fresh.recurring?.items ?? []) }
        let current = updateCurrentWeekFromRecurring(fresh.recurring, next, fresh.items.get(start), now)
        const change = intent?.displayedChange
        let displayed: WeekPlan | undefined
        if (change?.after.weekStart === start) current = rebaseWeekChange(change.before, change.after, current, now)
        else if (change) displayed = rebaseWeekChange(change.before, change.after, fresh.items.get(change.after.weekStart) ?? generateScheduledWeek(change.after.weekStart, fresh.recurring, now), now)
        await this.write(displayed ?? current, next, displayed ? current : undefined, undefined, true, now)
      } else if (intent?.reconcileOnly && fresh.recurring) {
        const current = fresh.items.get(start)
        if (current && (fresh.recurring.revision ?? 0) > (current.appliedRecurringRevision ?? 0)) {
          await this.write(updateCurrentWeekFromRecurring(undefined, fresh.recurring, current, now), undefined, undefined, undefined, true, now)
        }
      } else {
        if (!before) throw new Error('Concurrent creation requires a fresh edit')
        const current = fresh.items.get(desired.weekStart)
        if (!current) throw new Error('Week removed on another device')
        await this.write(rebaseWeekChange(before, desired, current, now), undefined, undefined, undefined, true, now)
      }
    } catch (error) { if (generation === this.generation && !this.failed) this.fail(error) }
    finally { this.recovering = false }
  }

  save(value: WeekPlan, recurring?: RecurringWeek, additionalWeek?: WeekPlan, intent?: WeekPlanSaveIntent): Promise<void> {
    return this.write(value, recurring, additionalWeek, intent, false, intent?.operationTime ?? new Date())
  }

  private async write(value: WeekPlan, recurring: RecurringWeek | undefined, additionalWeek: WeekPlan | undefined, intent: WeekPlanSaveIntent | undefined, retrying: boolean, now: Date): Promise<void> {
    const before = this.items.get(value.weekStart)
    const normalize = (week: WeekPlan) => ({ ...week, revision: (week.revision ?? 0) + 1,
      ...(week.schedule === undefined ? {} : { appliedRecurringRevision: week.appliedRecurringRevision ?? 0, appliedRecurringIds: week.appliedRecurringIds ?? [] }) })
    const currentWeek = currentWeekStart(now, WEEK_PLAN_TIME_ZONE)
    const plan = this.validateSave(normalize(value), currentWeek)
    const additional = additionalWeek ? this.validateSave(normalize(additionalWeek), currentWeek) : undefined
    if (recurring) recurring = { ...recurring, revision: recurring.revision ?? 1 }
    if (additional?.weekStart === plan.weekStart) throw new Error('Duplicate week in batch')
    const recurringRecords = recurring ? recurringWeekRecords(recurring) : undefined
    const previous = this.items.get(plan.weekStart)
    const expected = JSON.stringify(plan)
    const generation = this.generation
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
        this.pendingCommits++
        void server.then(() => {
          this.pendingCommits--
          this.writes.delete(write)
          resolve()
        }, (error: unknown) => {
          this.pendingCommits--
          this.writes.delete(write)
          if (retrying) { reject(error); this.fail(error) }
          else { resolve(); void this.recover(before, value, recurring, intent, generation) }
        })
        if (!recurring && !additional && JSON.stringify(previous) === expected) { this.writes.delete(write); resolve() }
      } catch (error) { this.writes.delete(write); reject(error); this.fail(error) }
    })
  }
}
