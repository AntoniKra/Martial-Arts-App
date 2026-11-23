import type { CompletedWorkoutStorage } from '@/application/workout-session/completedWorkoutRecovery'
import type { RecordedWorkoutSession } from '@/application/workout-session/workoutSessionRepository'
import { workoutSessionDocumentSchema } from '@/infrastructure/firebase/workoutDocumentSchemas'
import { workoutDocumentVersion } from '@/infrastructure/firebase/workoutDocumentVersion'

const prefix = 'combat-training.completedWorkout.'

export function createCompletedWorkoutStorage(uid: string): CompletedWorkoutStorage {
  const keyFor = (id: string) => `${prefix}${encodeURIComponent(id).replaceAll('.', '%2E')}.${uid}`
  return {
    readAll() {
      const sessions: RecordedWorkoutSession[] = []
      try {
        for (const key of Object.keys(localStorage)) {
          if (!key.startsWith(prefix)) continue
          const accountSeparator = key.indexOf('.', prefix.length)
          if (accountSeparator < 0 || key.slice(accountSeparator + 1) !== uid) continue
          try {
            const parsed = workoutSessionDocumentSchema.safeParse(JSON.parse(localStorage.getItem(key) ?? 'null'))
            if (!parsed.success || parsed.data.source === 'manual' || key !== keyFor(parsed.data.id)) continue
            const { schemaVersion: _version, ...session } = parsed.data
            sessions.push(session)
          } catch { /* An unreadable copy must not hide the remaining sessions. */ }
        }
      } catch { /* Storage may be blocked. */ }
      return sessions
    },
    save(session) {
      const document = workoutSessionDocumentSchema.parse({ ...session, schemaVersion: workoutDocumentVersion(session) })
      localStorage.setItem(keyFor(session.id), JSON.stringify(document))
    },
    remove(id) {
      try { localStorage.removeItem(keyFor(id)) } catch { /* A confirmed copy can be reconciled at the next launch. */ }
    },
  }
}
