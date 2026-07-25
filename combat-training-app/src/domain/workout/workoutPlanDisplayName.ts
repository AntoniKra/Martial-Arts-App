import { getDisciplineLabelPl } from '@/domain/discipline/disciplineLabels'
import type { WorkoutPlanDraft } from '@/domain/workout/workout.types'

const DISPLAY_NAME_FALLBACK_WITHOUT_DISCIPLINE = 'Nowy plan treningowy'
const DISPLAY_NAME_DATE_FALLBACK_SUFFIX = 'plan treningu'

function formatPolishDateFromCreatedAt(createdAt: string): string | null {
  const timestamp = Date.parse(createdAt)

  if (!Number.isFinite(timestamp)) {
    return null
  }

  const date = new Date(timestamp)
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const year = date.getUTCFullYear()

  return `${day}.${month}.${year}`
}

export function resolveWorkoutPlanDisplayName(
  draft: Pick<WorkoutPlanDraft, 'customName' | 'disciplineKey' | 'createdAt'>,
): string {
  const trimmedCustomName = draft.customName?.trim() ?? ''

  if (trimmedCustomName.length > 0) {
    return trimmedCustomName
  }

  if (draft.disciplineKey !== null) {
    const disciplineLabel = getDisciplineLabelPl(draft.disciplineKey)
    const formattedDate = formatPolishDateFromCreatedAt(draft.createdAt)

    if (formattedDate !== null) {
      return `${disciplineLabel} — ${formattedDate}`
    }

    return `${disciplineLabel} — ${DISPLAY_NAME_DATE_FALLBACK_SUFFIX}`
  }

  return DISPLAY_NAME_FALLBACK_WITHOUT_DISCIPLINE
}
