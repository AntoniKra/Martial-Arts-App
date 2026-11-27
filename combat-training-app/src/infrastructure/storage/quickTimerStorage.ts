import * as z from 'zod/mini'
import { defaultQuickTimerDraft, QUICK_TIMER_CATEGORIES, validateQuickTimerTiming, type QuickTimerConfig, type QuickTimerDraft } from '@/domain/quick-timer/quickTimer'
import { ROUND_FORMAT_PRESETS } from '@/domain/workout/roundFormatPresets'

const integer = z.number().check(z.int())
// Strip the disciplineKey from older drafts and from the resolved player config.
const schema = z.object({ schemaVersion: z.literal(1), category: z.enum(QUICK_TIMER_CATEGORIES),
  format: z.union([z.literal('custom'), z.enum(ROUND_FORMAT_PRESETS.map((value) => value.id))]),
  roundCount: integer, roundDurationSeconds: integer, restBetweenRoundsSeconds: integer,
}).check(z.refine((value) => Object.keys(validateQuickTimerTiming(value)).length === 0))

export function createQuickTimerStorage(uid: string) {
  const key = `combat-training.quickTimer.${uid}`
  return {
    read(): Omit<QuickTimerDraft, 'disciplineKey'> {
      try {
        const result = schema.safeParse(JSON.parse(localStorage.getItem(key) ?? 'null'))
        if (result.success) {
          const { schemaVersion: _version, ...config } = result.data
          return config
        }
      } catch { /* An unavailable preference must never block a workout. */ }
      const { disciplineKey: _disciplineKey, ...draft } = defaultQuickTimerDraft()
      return draft
    },
    save(config: Omit<QuickTimerConfig, 'disciplineKey'>): void {
      try {
        const result = schema.safeParse({ schemaVersion: 1, ...config })
        if (result.success) localStorage.setItem(key, JSON.stringify(result.data))
      } catch { /* The current configuration can still start without persistence. */ }
    },
  }
}
