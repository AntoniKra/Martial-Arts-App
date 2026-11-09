import * as z from 'zod/mini'

const dismissalSchema = z.object({ schemaVersion: z.literal(1), sessionIds: z.array(z.string().check(z.minLength(1))) })

export function createRpeDismissalStorage(uid: string) {
  const key = `combat-training.rpeDismissals.${uid}`
  const read = (): string[] => {
    try {
      const result = dismissalSchema.safeParse(JSON.parse(localStorage.getItem(key) ?? 'null'))
      return result.success ? result.data.sessionIds : []
    } catch { return [] }
  }
  return { read, dismiss: (id: string): boolean => {
    const result = dismissalSchema.safeParse({ schemaVersion: 1, sessionIds: [...new Set([...read(), id])] })
    if (!result.success) return false
    try { localStorage.setItem(key, JSON.stringify(result.data)); return true } catch { return false }
  } }
}
