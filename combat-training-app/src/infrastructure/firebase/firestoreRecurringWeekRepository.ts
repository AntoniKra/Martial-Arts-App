import { collection, doc, writeBatch, type Firestore } from 'firebase/firestore'
import type { RecurringWeekRepository } from '@/application/week-plan/recurringWeekRepository'
import { WEEK_PLAN_ITEM_LIMIT } from '@/domain/week-plan/weekPlan.types'
import { FirestoreWorkoutRepository } from './firestoreWorkoutRepository'
import { combineRecurringWeekRecords, recurringWeekRecords, recurringWeekRecordSchema } from './recurringWeekDocumentSchema'

/** The header and at most fourteen entry documents are observed and written atomically. */
export function createFirestoreRecurringWeekRepository(db: Firestore, uid: string): RecurringWeekRepository {
  const records = new FirestoreWorkoutRepository(db, uid, 'recurringWeeks', (value) => recurringWeekRecordSchema.parse(value))
  const path = collection(db, 'users', uid, 'recurringWeeks')
  return {
    subscribe: (onChange, onError) => records.subscribe((snapshot) => {
      try {
        if (snapshot.invalidDocumentIds.length) throw new Error('Invalid recurring week records')
        const week = combineRecurringWeekRecords(snapshot.items)
        onChange({ ...snapshot, items: week ? [week] : [] })
      } catch { onChange({ ...snapshot, items: [], invalidDocumentIds: snapshot.invalidDocumentIds.length ? snapshot.invalidDocumentIds : ['default'] }) }
    }, onError),
    save: async (week) => {
      const previous = records.getItems()
      const previousHeader = previous.find((record) => record.id === 'default')
      const next = recurringWeekRecords({ ...week, revision: (week.revision ?? (previousHeader && 'revision' in previousHeader ? previousHeader.revision : undefined) ?? 0) + 1 })
      if (previousHeader && previousHeader.createdAt !== week.createdAt) throw new Error('Creation time must be preserved')
      const batch = writeBatch(db)
      let resolveServer!: () => void
      let rejectServer!: (error: unknown) => void
      const server = new Promise<void>((resolve, reject) => { resolveServer = resolve; rejectServer = reject })
      const writes: Promise<unknown>[] = []
      for (const value of next) {
        batch.set(doc(path, value.id), value)
        writes.push(records.save(value, () => server))
      }
      for (let position = week.items.length; position < WEEK_PLAN_ITEM_LIMIT; position++) {
        const id = `item-${position}`
        batch.delete(doc(path, id))
        writes.push(records.delete(id, () => server))
      }
      try { void batch.commit().then(resolveServer, rejectServer) } catch (error) { rejectServer(error) }
      await Promise.all(writes)
    },
  }
}
