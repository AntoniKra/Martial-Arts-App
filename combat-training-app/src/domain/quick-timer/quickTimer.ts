import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import type { WorkoutSessionCategory } from '@/domain/workout-session/workoutSession.types'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import { ROUND_FORMAT_PRESETS, type RoundFormatId } from '@/domain/workout/roundFormatPresets'

export const QUICK_TIMER_CATEGORIES = ['technique', 'pads', 'bag', 'sparring', 'conditioning', 'strengthAndConditioning'] as const
export type QuickTimerCategory = (typeof QUICK_TIMER_CATEGORIES)[number]
export interface QuickTimerDraft {
  category: QuickTimerCategory | null
  disciplineKey: DisciplineKey | null
  format: RoundFormatId | 'custom'
  roundCount: number
  roundDurationSeconds: number
  restBetweenRoundsSeconds: number
}
export interface QuickTimerConfig extends QuickTimerDraft {
  category: QuickTimerCategory
  disciplineKey: DisciplineKey
}
export type QuickTimerErrors = Partial<Record<keyof QuickTimerDraft, string>>

export function isQuickTimerCategory(value: WorkoutSessionCategory): value is QuickTimerCategory {
  return value !== 'mixed'
}

export function defaultQuickTimerDraft(): QuickTimerDraft {
  return { category: null, disciplineKey: null, format: ROUND_FORMAT_PRESETS[0].id,
    roundCount: 3, roundDurationSeconds: 180, restBetweenRoundsSeconds: 60 }
}

function validTime(value: number, minimum: number, maximum: number): boolean {
  return Number.isInteger(value) && value >= minimum && value <= maximum
    && value % (value <= 60 ? 5 : 15) === 0
}

export function validateQuickTimerConfig(draft: QuickTimerDraft):
  { ok: true; config: QuickTimerConfig } | { ok: false; errors: QuickTimerErrors } {
  const errors: QuickTimerErrors = {}
  if (!draft.category || !QUICK_TIMER_CATEGORIES.includes(draft.category)) errors.category = 'Wybierz rodzaj treningu'
  if (!draft.disciplineKey || !['boxing', 'kickboxing', 'muay_thai', 'k1', 'mma_striking'].includes(draft.disciplineKey)) errors.disciplineKey = 'Wybierz dyscyplinę'
  if (!Number.isInteger(draft.roundCount) || draft.roundCount < 1 || draft.roundCount > 50) errors.roundCount = 'Wybierz od 1 do 50 rund'
  if (!validTime(draft.roundDurationSeconds, 5, 600)) errors.roundDurationSeconds = 'Wybierz czas pracy od 0:05 do 10:00'
  if (!validTime(draft.restBetweenRoundsSeconds, 0, 300)) errors.restBetweenRoundsSeconds = 'Wybierz przerwę od 0:00 do 5:00'
  const preset = ROUND_FORMAT_PRESETS.find((value) => value.id === draft.format)
  if (draft.format !== 'custom' && (!preset || preset.roundCount !== draft.roundCount
    || preset.roundDurationSeconds !== draft.roundDurationSeconds || preset.restBetweenRoundsSeconds !== draft.restBetweenRoundsSeconds)) errors.format = 'Wybierz gotowy format albo Własny'
  if (Object.keys(errors).length || !draft.category || !draft.disciplineKey) return { ok: false, errors }
  return { ok: true, config: { ...draft, category: draft.category, disciplineKey: draft.disciplineKey } }
}

export function adjustQuickTimerSeconds(value: number, direction: -1 | 1, minimum: number, maximum: number): number {
  const step = (direction === 1 ? value < 60 : value <= 60) ? 5 : 15
  return Math.max(minimum, Math.min(maximum, value + direction * step))
}

export function quickTimerDuration(config: Pick<QuickTimerDraft, 'roundCount' | 'roundDurationSeconds' | 'restBetweenRoundsSeconds'>): number {
  return config.roundCount * config.roundDurationSeconds + (config.roundCount - 1) * config.restBetweenRoundsSeconds
}

export function createQuickTimerPlan(config: QuickTimerConfig, ids: { planId: string; blockId: string; exerciseId: string; now: string }): WorkoutPlan {
  return {
    id: ids.planId, customName: null, mainGoal: null, nameSnapshot: 'Szybki stoper',
    disciplineKey: config.disciplineKey, createdAt: ids.now, updatedAt: ids.now,
    blocks: [{ id: ids.blockId,
      ...(config.category === 'sparring' ? { blockType: 'sparring', sparringIntensity: null } : { blockType: config.category }),
      items: [{ id: ids.exerciseId, type: 'exercise', exerciseNameSnapshot: getWorkoutBlockLabelPl(config.category),
        combinationId: null, focusSkillId: null, instruction: null,
        configuration: { mode: 'rounds', roundCount: config.roundCount,
          roundDurationSeconds: config.roundDurationSeconds, restBetweenRoundsSeconds: config.restBetweenRoundsSeconds } }],
    }],
  }
}
