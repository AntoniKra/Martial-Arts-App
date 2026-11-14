import * as z from 'zod/mini'

const schema = z.strictObject({ schemaVersion: z.literal(1), date: z.iso.date() })
export function wellbeingDismissalStorage(uid: string) {
  const key = `combat-training.wellbeingDismissal.${uid}`
  return {
    dismissed: (date: string): boolean => {
      try {
        const parsed = schema.safeParse(JSON.parse(localStorage.getItem(key) ?? 'null'))
        return parsed.success && parsed.data.date === date
      } catch { return false }
    },
    dismiss: (date: string) => {
      const value = schema.parse({ schemaVersion: 1, date })
      try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Keep the dismissal in the mounted UI. */ }
    },
  }
}
