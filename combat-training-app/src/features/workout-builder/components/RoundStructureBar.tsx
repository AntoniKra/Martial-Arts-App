import { exerciseConfigurationLabels as labels } from '@/features/workout-builder/exerciseConfigurationLabels'
import { buildRoundStructure } from '@/features/workout-builder/state/exerciseRoundStructure'
import { formatStepperClock } from '@/features/workout-builder/utils/formatStepperClock'

/** Total time N5 B: one segment per round and per rest between rounds, widths proportional to time. */
export function RoundStructureBar({ roundCount, roundDurationSeconds, restSeconds }: {
  roundCount: number
  roundDurationSeconds: number
  restSeconds: number
}) {
  const structure = buildRoundStructure({ roundCount, roundDurationSeconds, restSeconds })
  const hasRests = structure.segments.some((segment) => segment.kind === 'rest')

  return (
    <section aria-label={labels.structure} className="exercise-config-structure">
      <div className="exercise-config-structure-top">
        <div aria-hidden="true" className="exercise-config-structure-track" data-compact={structure.compact || undefined}>
          {structure.segments.map((segment, index) => (
            <span
              key={index}
              className={segment.kind === 'work' ? 'exercise-config-structure-work' : 'exercise-config-structure-rest'}
              style={{ flexGrow: segment.seconds, flexBasis: 0 }}
            />
          ))}
        </div>
        <p className="exercise-config-structure-total">
          <span className="sr-only">{labels.total}: </span>
          {formatStepperClock(structure.totalSeconds)}
        </p>
      </div>
      <div className="exercise-config-structure-legend">
        <span className="exercise-config-legend-item">
          <span aria-hidden="true" className="exercise-config-swatch" data-kind="work" />
          {labels.structureRounds(formatStepperClock(roundDurationSeconds))}
        </span>
        {hasRests && (
          <span className="exercise-config-legend-item">
            <span aria-hidden="true" className="exercise-config-swatch" data-kind="rest" />
            {labels.structureRests(formatStepperClock(restSeconds))}
          </span>
        )}
        <span aria-hidden="true" className="exercise-config-total-label">{labels.total}</span>
      </div>
    </section>
  )
}
