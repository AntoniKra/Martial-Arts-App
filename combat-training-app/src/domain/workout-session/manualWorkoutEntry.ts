import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import type { SparringIntensity } from '@/domain/workout/workout.types'
import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import type { ManualFocusRating, ManualWorkoutSession, WorkoutSession, WorkoutSessionCategory } from './workoutSession.types'

export interface ManualFocusRatingDraft extends Omit<ManualFocusRating, 'blockType' | 'assessment'> {
  blockType: ManualFocusRating['blockType'] | null
  assessment: ManualFocusRating['assessment'] | null
}
export interface ManualWorkoutDraft {
  workoutDate: string
  disciplineKey: DisciplineKey | ''
  category: WorkoutSessionCategory | ''
  durationMinutes: string
  rpe: number | null
  hasSparring: boolean
  intensity: SparringIntensity | ''
  rounds: string
  focusRatings: ManualFocusRatingDraft[]
  note: string
}
export interface ManualWorkoutValues extends Omit<ManualWorkoutDraft, 'disciplineKey' | 'category' | 'rpe' | 'focusRatings'> {
  disciplineKey: DisciplineKey
  category: WorkoutSessionCategory
  rpe: number
  focusRatings: ManualFocusRating[]
}
export type ManualWorkoutErrors = Partial<Record<keyof ManualWorkoutDraft | `focus-${string}`, string>>
const disciplines = new Set(['boxing', 'kickboxing', 'muay_thai', 'k1', 'mma_striking'])
const categories = new Set(['technique', 'pads', 'bag', 'sparring', 'conditioning', 'strengthAndConditioning', 'mixed'])
function isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum
}
function isCorrectionText(value: string): boolean { return value.length >= 1 && value.length <= 200 }
function isCalendarDate(value: string): boolean {
  const timestamp = Date.parse(`${value}T12:00:00Z`)
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
}

export function manualFocusPlace(category: ManualWorkoutDraft['category']): ManualFocusRating['blockType'] | null {
  return category === '' || category === 'mixed' || category === 'conditioning' ? null : category
}

export function changeManualCategory(draft: ManualWorkoutDraft, category: WorkoutSessionCategory): ManualWorkoutDraft {
  return { ...draft, category, hasSparring: category === 'sparring' || draft.hasSparring,
    focusRatings: draft.focusRatings.map((rating) => ({ ...rating, blockType: manualFocusPlace(category) })) }
}

export function createManualWorkoutDraft(today: string, latestDiscipline: DisciplineKey | '' = '', session?: ManualWorkoutSession): ManualWorkoutDraft {
  return session ? { workoutDate: session.workoutDate, disciplineKey: session.disciplineKey, category: session.category,
    durationMinutes: String(session.durationSeconds / 60), rpe: session.rpe, hasSparring: session.sparring.length > 0,
    intensity: session.sparring[0]?.intensity ?? '', rounds: session.sparring[0]?.rounds?.toString() ?? '',
    focusRatings: structuredClone(session.focusRatings), note: session.note ?? '' }
    : { workoutDate: today, disciplineKey: latestDiscipline, category: '', durationMinutes: '', rpe: null,
      hasSparring: false, intensity: '', rounds: '', focusRatings: [], note: '' }
}

export function validateManualWorkout(draft: ManualWorkoutDraft, today: string, savedDate?: string):
  { ok: true; values: ManualWorkoutValues } | { ok: false; errors: ManualWorkoutErrors } {
  const errors: ManualWorkoutErrors = {}
  if (!isCalendarDate(draft.workoutDate)) errors.workoutDate = 'Wybierz datę treningu.'
  else if (draft.workoutDate > today) errors.workoutDate = 'Data nie może być w przyszłości.'
  else if (draft.workoutDate < shiftCalendarDate(today, -7) && draft.workoutDate !== savedDate) errors.workoutDate = 'Data może być najwyżej 7 dni wstecz.'
  if (!disciplines.has(draft.disciplineKey)) errors.disciplineKey = 'Wybierz dyscyplinę.'
  if (!categories.has(draft.category)) errors.category = 'Wybierz rodzaj treningu.'
  if (!draft.durationMinutes.trim() || !isIntegerInRange(Number(draft.durationMinutes), 1, 480)) errors.durationMinutes = 'Podaj czas trwania od 1 do 480 minut.'
  if (!isIntegerInRange(draft.rpe, 0, 10)) errors.rpe = 'Oceń wysiłek (RPE 0–10).'
  if (draft.hasSparring || draft.category === 'sparring') {
    if (!['light', 'technical', 'hard'].includes(draft.intensity)) errors.intensity = 'Wybierz intensywność sparingu.'
    if (draft.rounds.trim() && !isIntegerInRange(Number(draft.rounds), 1, 50)) errors.rounds = 'Podaj liczbę rund od 1 do 50 albo zostaw puste.'
  }
  const focusRatings: ManualFocusRating[] = []
  const seen = new Set<string>()
  if (draft.focusRatings.length > 3) errors.focusRatings = 'Oceń najwyżej 3 ćwiczenia celu.'
  for (const rating of draft.focusRatings) {
    const key = `focus-${rating.focusSkillId}` as const
    const place = manualFocusPlace(draft.category) ?? rating.blockType
    if (rating.assessment !== 'unableToRate' && !isIntegerInRange(rating.assessment, 1, 5)) errors[key] = 'Wybierz ocenę albo odznacz ćwiczenie celu.'
    else if (!place) errors[key] = 'Wybierz, gdzie ćwiczyłeś.'
    if (seen.has(rating.focusSkillId)) errors[key] = 'Każde ćwiczenie celu można ocenić tylko raz.'
    seen.add(rating.focusSkillId)
    const problem = rating.correction?.problem.trim() ?? '', fix = rating.correction?.fix.trim() ?? ''
    if ((problem || fix) && (!isCorrectionText(problem) || !isCorrectionText(fix))) errors[key] = 'Problem i poprawka muszą mieć po 1–200 znaków.'
    if (place && rating.assessment !== null) focusRatings.push({ ...rating, assessment: rating.assessment, blockType: place,
      correction: problem || fix ? { problem, fix } : null })
  }
  const note = draft.note.trim()
  if (note.length > 1000) errors.note = 'Notatka może mieć do 1000 znaków.'
  if (Object.keys(errors).length || !draft.disciplineKey || !draft.category || draft.rpe === null) return { ok: false, errors }
  return { ok: true, values: { ...draft, disciplineKey: draft.disciplineKey, category: draft.category, rpe: draft.rpe, focusRatings, note } }
}

export function buildManualWorkoutSession(values: ManualWorkoutValues, options: {
  id: string; now: string; timezone: string; original?: ManualWorkoutSession
}): ManualWorkoutSession {
  const { original, now } = options
  const sparring: ManualWorkoutSession['sparring'] = []
  if (values.hasSparring || values.category === 'sparring') {
    if (!values.intensity) throw new Error('Sparring intensity is required')
    sparring.push({ blockId: null, intensity: values.intensity, rounds: values.rounds.trim() ? Number(values.rounds) : null })
  }
  return { id: original?.id ?? options.id, source: 'manual', status: 'completed',
    workoutDate: values.workoutDate, disciplineKey: values.disciplineKey, category: values.category,
    durationSeconds: Number(values.durationMinutes) * 60, workSeconds: null, sparringSeconds: null, completion: null,
    rpe: values.rpe, rpeRecordedAt: original?.rpe === values.rpe ? original.rpeRecordedAt : now,
    timezone: original?.timezone ?? options.timezone, createdAt: original?.createdAt ?? now, updatedAt: now,
    sparring,
    note: values.note || null, focusRatings: values.focusRatings }
}

export function findManualWorkoutDuplicate(values: Pick<ManualWorkoutValues, 'workoutDate' | 'category'>,
  sessions: readonly WorkoutSession[], original?: ManualWorkoutSession): WorkoutSession | null {
  if (original && original.workoutDate === values.workoutDate && original.category === values.category) return null
  return sessions.filter((session) => session.id !== original?.id && session.workoutDate === values.workoutDate && session.category === values.category)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0] ?? null
}
