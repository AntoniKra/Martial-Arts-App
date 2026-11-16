import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import type { SparringIntensity } from '@/domain/workout/workout.types'
import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import { MANUAL_WORKOUT_PARTS, type ManualWorkoutPart, type ManualFocusRating, type ManualWorkoutSession, type WorkoutSession, type WorkoutSessionCategory } from './workoutSession.types'
import { manualDraftParts, manualSessionParts, manualWorkoutCategory } from './manualWorkoutParts'

export interface ManualFocusRatingDraft extends Omit<ManualFocusRating, 'blockType' | 'assessment'> {
  blockType: ManualFocusRating['blockType'] | null
  assessment: ManualFocusRating['assessment'] | null
}
export interface ManualWorkoutDraft {
  workoutDate: string
  disciplineKey: DisciplineKey | ''
  category: WorkoutSessionCategory | ''
  parts: ManualWorkoutPart[]
  durationMinutes: string
  rpe: number | null
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

export function changeManualParts(draft: ManualWorkoutDraft, parts: ManualWorkoutPart[], original?: ManualWorkoutSession): ManualWorkoutDraft {
  const category = manualWorkoutCategory(parts)
  return { ...draft, parts, category, intensity: parts.includes('sparring') ? draft.intensity : '', rounds: parts.includes('sparring') ? draft.rounds : '',
    focusRatings: draft.focusRatings.map((rating) => original?.focusRatings.some((saved) => saved.focusSkillId === rating.focusSkillId)
      ? rating : { ...rating, blockType: manualFocusPlace(category) }) }
}

export function createManualWorkoutDraft(today: string, latestDiscipline: DisciplineKey | '' = '', session?: ManualWorkoutSession): ManualWorkoutDraft {
  const parts = session ? manualDraftParts(session) : []
  return session ? { workoutDate: session.workoutDate, disciplineKey: session.disciplineKey, category: manualWorkoutCategory(parts), parts,
    durationMinutes: String(session.durationSeconds / 60), rpe: session.rpe,
    intensity: session.sparring[0]?.intensity ?? '', rounds: session.sparring[0]?.rounds?.toString() ?? '',
    focusRatings: structuredClone(session.focusRatings), note: session.note ?? '' }
    : { workoutDate: today, disciplineKey: latestDiscipline, category: '', parts: [], durationMinutes: '', rpe: null,
      intensity: '', rounds: '', focusRatings: [], note: '' }
}

export function latestManualWorkout(sessions: readonly WorkoutSession[]): ManualWorkoutSession | undefined {
  return sessions.filter((session): session is ManualWorkoutSession => session.source === 'manual')
    .sort((a, b) => b.workoutDate.localeCompare(a.workoutDate) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0]
}

/** Copy only the three reusable fields; every subjective answer remains the user's own. */
export function applyPreviousManualWorkout(draft: ManualWorkoutDraft, previous: ManualWorkoutSession): ManualWorkoutDraft {
  return { ...changeManualParts(draft, manualDraftParts(previous)), disciplineKey: previous.disciplineKey,
    durationMinutes: String(previous.durationSeconds / 60) }
}

export function previousWorkoutNotes(sessions: readonly WorkoutSession[], excludeId?: string): string[] {
  return [...new Set(sessions.filter((session) => session.id !== excludeId)
    .sort((a, b) => b.workoutDate.localeCompare(a.workoutDate) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
    .map((session) => session.note?.trim()).filter((note): note is string => !!note))].slice(0, 3)
}

export function validateManualWorkout(draft: ManualWorkoutDraft, today: string, savedDate?: string, original?: ManualWorkoutSession):
  { ok: true; values: ManualWorkoutValues } | { ok: false; errors: ManualWorkoutErrors } {
  const errors: ManualWorkoutErrors = {}
  if (!isCalendarDate(draft.workoutDate)) errors.workoutDate = 'Wybierz datę treningu.'
  else if (draft.workoutDate > today) errors.workoutDate = 'Data nie może być w przyszłości.'
  else if (draft.workoutDate < shiftCalendarDate(today, -7) && draft.workoutDate !== savedDate) errors.workoutDate = 'Data może być najwyżej 7 dni wstecz.'
  if (!disciplines.has(draft.disciplineKey)) errors.disciplineKey = 'Wybierz dyscyplinę.'
  if (draft.parts.length < 1 || draft.parts.length > 6 || new Set(draft.parts).size !== draft.parts.length
    || draft.parts.some((part) => !MANUAL_WORKOUT_PARTS.includes(part))) errors.parts = 'Wybierz co najmniej jedną część zajęć (bez powtórzeń).'
  const category = manualWorkoutCategory(draft.parts)
  if (!draft.durationMinutes.trim() || !isIntegerInRange(Number(draft.durationMinutes), 1, 480)) errors.durationMinutes = 'Podaj czas trwania od 1 do 480 minut.'
  if (!isIntegerInRange(draft.rpe, 0, 10)) errors.rpe = 'Oceń wysiłek (RPE 0–10).'
  if (draft.parts.includes('sparring')) {
    if (!['light', 'technical', 'hard'].includes(draft.intensity)) errors.intensity = 'Wybierz intensywność sparingu.'
    if (draft.rounds.trim() && !isIntegerInRange(Number(draft.rounds), 1, 50)) errors.rounds = 'Podaj liczbę rund od 1 do 50 albo zostaw puste.'
  }
  const focusRatings: ManualFocusRating[] = []
  const seen = new Set<string>()
  if (draft.focusRatings.length > 3) errors.focusRatings = 'Oceń najwyżej 3 elementy do poprawy.'
  for (const rating of draft.focusRatings) {
    const key = `focus-${rating.focusSkillId}` as const
    const hasSavedPlace = original?.focusRatings.some((saved) => saved.focusSkillId === rating.focusSkillId)
    const place = hasSavedPlace ? rating.blockType : manualFocusPlace(category) ?? rating.blockType
    if (rating.assessment !== 'unableToRate' && !isIntegerInRange(rating.assessment, 1, 5)) errors[key] = 'Wybierz ocenę albo odznacz element do poprawy.'
    else if (!place) errors[key] = 'Wybierz, gdzie ćwiczyłeś.'
    if (seen.has(rating.focusSkillId)) errors[key] = 'Każdy element do poprawy można ocenić tylko raz.'
    seen.add(rating.focusSkillId)
    const problem = rating.correction?.problem.trim() ?? '', fix = rating.correction?.fix.trim() ?? ''
    if ((problem || fix) && (!isCorrectionText(problem) || !isCorrectionText(fix))) errors[key] = 'Problem i poprawka muszą mieć po 1–200 znaków.'
    if (place && rating.assessment !== null) focusRatings.push({ ...rating, assessment: rating.assessment, blockType: place,
      correction: problem || fix ? { problem, fix } : null })
  }
  const note = draft.note.trim()
  if (note.length > 1000) errors.note = 'Notatka może mieć do 1000 znaków.'
  if (Object.keys(errors).length || !draft.disciplineKey || draft.rpe === null) return { ok: false, errors }
  return { ok: true, values: { ...draft, disciplineKey: draft.disciplineKey, category, rpe: draft.rpe, focusRatings, note } }
}

export function buildManualWorkoutSession(values: ManualWorkoutValues, options: {
  id: string; now: string; timezone: string; original?: ManualWorkoutSession
}): ManualWorkoutSession {
  const { original, now } = options
  const sparring: ManualWorkoutSession['sparring'] = []
  if (values.parts.includes('sparring')) {
    if (!values.intensity) throw new Error('Sparring intensity is required')
    sparring.push({ blockId: null, intensity: values.intensity, rounds: values.rounds.trim() ? Number(values.rounds) : null })
  }
  return { id: original?.id ?? options.id, source: 'manual', status: 'completed',
    workoutDate: values.workoutDate, disciplineKey: values.disciplineKey, category: manualWorkoutCategory(values.parts), parts: [...values.parts],
    durationSeconds: Number(values.durationMinutes) * 60, workSeconds: null, sparringSeconds: null, completion: null,
    rpe: values.rpe, rpeRecordedAt: original?.rpe === values.rpe ? original.rpeRecordedAt : now,
    timezone: original?.timezone ?? options.timezone, createdAt: original?.createdAt ?? now, updatedAt: now,
    sparring,
    note: values.note || null, focusRatings: values.focusRatings }
}

export function findManualWorkoutDuplicate(values: Pick<ManualWorkoutValues, 'workoutDate' | 'category'> & { parts?: readonly ManualWorkoutPart[] },
  sessions: readonly WorkoutSession[], original?: ManualWorkoutSession): WorkoutSession | null {
  const parts = values.parts
  if (original && original.workoutDate === values.workoutDate && (parts
    ? JSON.stringify([...manualSessionParts(original)].sort()) === JSON.stringify([...parts].sort()) : original.category === values.category)) return null
  return sessions.filter((session) => session.id !== original?.id && session.workoutDate === values.workoutDate && (parts
    ? session.source === 'manual' ? manualSessionParts(session).some((part) => parts.includes(part)) : parts.some((part) => part === session.category)
    : session.category === values.category))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0] ?? null
}
