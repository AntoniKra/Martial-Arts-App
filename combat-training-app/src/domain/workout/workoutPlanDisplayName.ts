import { getDisciplineLabelPl } from '@/domain/discipline/disciplineLabels'
import type { WorkoutPlanDraft } from '@/domain/workout/workout.types'

export function resolveWorkoutPlanDisplayName(
  draft: Pick<WorkoutPlanDraft, 'customName' | 'disciplineKey'>,
): string {
  const trimmedCustomName = draft.customName?.trim() ?? ''

  if (trimmedCustomName.length > 0) {
    return trimmedCustomName
  }

  if (draft.disciplineKey !== null) {
    return `${getDisciplineLabelPl(draft.disciplineKey)} — plan treningu`
  }

  return 'Nowy plan treningowy'
}
