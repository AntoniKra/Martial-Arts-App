import { formatPolishCount } from '@/domain/language/polishPlural'
import { formatEstimatedDuration, formatSecondsAsClock } from '@/domain/time/formatDuration'
import { calculateWorkoutPlanSummary, type WorkoutPlanCalculable } from './workoutCalculations'

/** Display parameters derived from the definition; the saved plan stays unchanged. */
export function workoutParameterChips(plan: WorkoutPlanCalculable): string[] {
  const summary = calculateWorkoutPlanSummary(plan)
  const rounds = plan.blocks.flatMap((block) => block.items.flatMap((item) =>
    item.type === 'exercise' && item.configuration.mode === 'rounds' ? [item.configuration] : []))
  const durations = new Set(rounds.map((round) => round.roundDurationSeconds))
  // A single round has no between-round break.
  const rests = new Set(rounds.filter((round) => round.roundCount > 1).map((round) => round.restBetweenRoundsSeconds))
  const duration = rounds[0]?.roundDurationSeconds
  const roundLabel = formatPolishCount(summary.plannedRoundCount, 'runda', 'rundy', 'rund')
  const chips = rounds.length ? [durations.size === 1
    ? `${roundLabel} × ${duration % 60 === 0 ? `${duration / 60} min` : formatSecondsAsClock(duration)}`
    : `${roundLabel} · ${formatEstimatedDuration(summary.estimatedTotalSeconds)}`] : []
  if (rests.size === 1) chips.push(`Przerwa ${[...rests][0]} s`)
  return chips
}
