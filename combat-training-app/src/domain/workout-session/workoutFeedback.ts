import type { FocusSkill, FocusSkillCorrection } from '@/domain/focus-skill/focusSkill.types'
import type { ExerciseRating, FocusRating, ManualFocusRating, ManualWorkoutSession, PlanWorkoutSession, SparringEntry } from './workoutSession.types'

export interface WorkoutFeedbackDraft {
  focusRatings: FocusRating[]
  exerciseRatings: ExerciseRating[]
  sparring: SparringEntry[]
  note: string | null
}

export interface FocusCorrectionUpdate {
  focusSkillId: string
  openCorrection: FocusSkillCorrection | null
}

export interface WorkoutFeedbackUpdate extends WorkoutFeedbackDraft {
  updatedAt: string
  correctionUpdates: FocusCorrectionUpdate[]
}

export interface ManualWorkoutFeedbackDraft { focusRatings: ManualFocusRating[]; note: string | null }
export interface ManualWorkoutFeedbackUpdate extends ManualWorkoutFeedbackDraft {
  updatedAt: string
  correctionUpdates: FocusCorrectionUpdate[]
}

export function hasCompletedExercise(session: PlanWorkoutSession, workoutItemId: string): boolean {
  return session.stepResults.some((step) => step.kind === 'exercise'
    && step.workoutItemId === workoutItemId && step.outcome === 'completed')
}

export function canEditSparringIntensity(entry: SparringEntry): boolean {
  return entry.blockId !== null && entry.rounds !== null && entry.rounds >= 1
}

export function getPreviousCorrection(session: Pick<PlanWorkoutSession, 'id' | 'workoutDate'>, skill: FocusSkill | undefined): FocusSkillCorrection | null {
  const correction = skill?.openCorrection
  return correction && correction.sessionId !== session.id && correction.workoutDate <= session.workoutDate ? correction : null
}

export function selectOtherExercises(session: PlanWorkoutSession): (Omit<ExerciseRating, 'rating'> & { rating: number | null })[] {
  const seen = new Set(session.focusRatings.map((value) => value.workoutItemId))
  return session.stepResults.flatMap((step) => {
    if (step.kind !== 'exercise' || seen.has(step.workoutItemId) || !hasCompletedExercise(session, step.workoutItemId)) return []
    seen.add(step.workoutItemId)
    return [{ workoutItemId: step.workoutItemId, nameSnapshot: step.nameSnapshot, blockType: step.blockType,
      rating: session.exerciseRatings.find((value) => value.workoutItemId === step.workoutItemId)?.rating ?? null }]
  })
}

export function prepareWorkoutFeedback(session: PlanWorkoutSession, draft: WorkoutFeedbackDraft, skills: readonly FocusSkill[], updatedAt: string): WorkoutFeedbackUpdate
export function prepareWorkoutFeedback(session: ManualWorkoutSession, draft: ManualWorkoutFeedbackDraft, skills: readonly FocusSkill[], updatedAt: string): ManualWorkoutFeedbackUpdate
export function prepareWorkoutFeedback(
  session: PlanWorkoutSession | ManualWorkoutSession, draft: WorkoutFeedbackDraft | ManualWorkoutFeedbackDraft,
  skills: readonly FocusSkill[], updatedAt: string,
): WorkoutFeedbackUpdate | ManualWorkoutFeedbackUpdate {
  if (session.source === 'manual') {
    const focusRatings = draft.focusRatings as ManualFocusRating[]
    return { focusRatings, note: draft.note, updatedAt,
      correctionUpdates: prepareCorrectionUpdates(session, focusRatings, skills) }
  }
  return preparePlanFeedback(session, draft as WorkoutFeedbackDraft, skills, updatedAt)
}

function preparePlanFeedback(
  session: PlanWorkoutSession, draft: WorkoutFeedbackDraft, skills: readonly FocusSkill[], updatedAt: string,
): WorkoutFeedbackUpdate {
  const seen = new Set<string>()
  const focusRatings = session.focusRatings.map((original) => {
    const first = !seen.has(original.focusSkillId)
    seen.add(original.focusSkillId)
    if (!hasCompletedExercise(session, original.workoutItemId)) {
      return { ...original, assessment: null, correction: null, previousCorrectionCheck: null }
    }
    const edited = draft.focusRatings.find((value) => value.workoutItemId === original.workoutItemId)
    return { ...original, assessment: edited?.assessment ?? null, correction: edited?.correction ?? null,
      previousCorrectionCheck: first ? edited?.previousCorrectionCheck ?? null : null }
  })
  const exerciseRatings = selectOtherExercises(session).flatMap((exercise): ExerciseRating[] => {
    const edited = draft.exerciseRatings.find((value) => value.workoutItemId === exercise.workoutItemId)
    return edited ? [{ ...exercise, rating: edited.rating }] : []
  })
  const sparring = session.sparring.map((original) => {
    const edited = draft.sparring.find((entry) => entry.blockId === original.blockId)
    return canEditSparringIntensity(original) && edited ? { ...original, intensity: edited.intensity } : { ...original }
  })
  return { ...draft, focusRatings, exerciseRatings, sparring, updatedAt,
    correctionUpdates: prepareCorrectionUpdates(session, focusRatings, skills) }
}

function prepareCorrectionUpdates(session: PlanWorkoutSession | ManualWorkoutSession,
  focusRatings: readonly (FocusRating | ManualFocusRating)[], skills: readonly FocusSkill[]): FocusCorrectionUpdate[] {
  const updates = new Map<string, FocusSkillCorrection | null>()
  for (const rating of focusRatings) {
    const skill = skills.find((value) => value.id === rating.focusSkillId)
    const original = session.focusRatings.find((value) => session.source === 'manual'
      ? value.focusSkillId === rating.focusSkillId : value.workoutItemId === rating.workoutItemId)
    if (skill && getPreviousCorrection(session, skill) && rating.previousCorrectionCheck === 'better'
      && original?.previousCorrectionCheck !== 'better') {
      updates.set(skill.id, null)
    }
  }
  const lastCorrections = new Map(focusRatings.filter((value) => value.correction).map((value) => [value.focusSkillId, value.correction]))
  const originalCorrections = new Map(session.focusRatings.filter((value) => value.correction).map((value) => [value.focusSkillId, value.correction]))
  for (const [focusSkillId, correction] of lastCorrections) {
    const original = originalCorrections.get(focusSkillId)
    if (correction && skills.some((skill) => skill.id === focusSkillId)
      && (correction.problem !== original?.problem || correction.fix !== original?.fix)) {
      updates.set(focusSkillId, { ...correction, sessionId: session.id, workoutDate: session.workoutDate })
    }
  }
  return [...updates].map(([focusSkillId, openCorrection]) => ({ focusSkillId, openCorrection }))
}
