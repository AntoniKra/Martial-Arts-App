import { formatSecondsAsClock } from '@/domain/time/formatDuration'
import { calculateWorkoutPlanSummary } from '@/domain/workout/workoutCalculations'
import type { ExerciseConfiguration, WorkoutBlock, WorkoutItem } from '@/domain/workout/workout.types'

export interface BlockTimeSummary {
  workSeconds: number
  restSeconds: number
  totalSeconds: number
  /** Share of work in the ratio bar, 0–100. Zero when the block has no time yet. */
  workPercent: number
  restPercent: number
}

/** Work and rest of one block. Rest includes rests between rounds and standalone breaks. */
export function summarizeBlockTime(block: Pick<WorkoutBlock, 'items'>): BlockTimeSummary {
  const summary = calculateWorkoutPlanSummary({ blocks: [{ id: 'block', blockType: 'technique', items: block.items }] })
  const totalSeconds = summary.estimatedTotalSeconds

  if (totalSeconds === 0) {
    return { workSeconds: 0, restSeconds: 0, totalSeconds: 0, workPercent: 0, restPercent: 0 }
  }

  const workPercent = (summary.activeWorkSeconds / totalSeconds) * 100

  return {
    workSeconds: summary.activeWorkSeconds,
    restSeconds: summary.totalRestSeconds,
    totalSeconds,
    workPercent,
    restPercent: 100 - workPercent,
  }
}

/** Compact exercise parameters for a timeline row: "3 × 3:00 / 1:00". */
export function formatExerciseParams(configuration: ExerciseConfiguration, continuousLabel: string): string {
  if (configuration.mode === 'continuous') {
    return `${continuousLabel} · ${formatSecondsAsClock(configuration.durationSeconds)}`
  }

  const { roundCount, roundDurationSeconds, restBetweenRoundsSeconds } = configuration
  const rounds = `${roundCount} × ${formatSecondsAsClock(roundDurationSeconds)}`

  // One round has no rest between rounds (#61), so the rest part would be misleading.
  return roundCount > 1 ? `${rounds} / ${formatSecondsAsClock(restBetweenRoundsSeconds)}` : rounds
}

/** "bloku 1 — Technika" for genitive use ("Dodaj ćwiczenie do bloku 1"). */
export function formatBlockDescriptorGenitive(position: number, blockLabel: string): string {
  return `bloku ${position} — ${blockLabel}`
}

export interface PositionedItem {
  item: WorkoutItem
  /** One-based position of the item in its block. */
  position: number
}

/**
 * Splits block items into the rows shown inside the block card and the breaks that close
 * the block. Rest between blocks is stored as the last item(s) of the preceding block,
 * so trailing breaks are drawn on the axis below the card.
 */
export function splitTrailingBreaks(items: readonly WorkoutItem[]): {
  inside: PositionedItem[]
  trailing: PositionedItem[]
} {
  const positioned = items.map((item, index) => ({ item, position: index + 1 }))
  let firstTrailingIndex = positioned.length

  while (firstTrailingIndex > 0 && positioned[firstTrailingIndex - 1].item.type === 'break') {
    firstTrailingIndex -= 1
  }

  return {
    inside: positioned.slice(0, firstTrailingIndex),
    trailing: positioned.slice(firstTrailingIndex),
  }
}
