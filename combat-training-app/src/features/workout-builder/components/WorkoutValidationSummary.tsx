import { forwardRef } from 'react'

import type { WorkoutPlanValidationIssue } from '@/domain/workout/workoutValidation'

interface WorkoutValidationSummaryProps {
  issues: WorkoutPlanValidationIssue[]
}

export const WorkoutValidationSummary = forwardRef<HTMLDivElement, WorkoutValidationSummaryProps>(
  function WorkoutValidationSummary({ issues }, ref) {
    return (
      <div
        ref={ref}
        tabIndex={-1}
        role="region"
        aria-labelledby="workout-validation-summary-heading"
        className="border border-bd bg-surface px-4 py-4 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--app-focus-ring)]"
      >
        <h2
          id="workout-validation-summary-heading"
          className="font-display text-[14px] font-semibold text-ink"
        >
          Plan wymaga uzupełnienia
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[13px] leading-relaxed text-muted">
          {issues.map((issue, index) => (
            <li key={`${issue.code}-${issue.blockId ?? 'global'}-${issue.itemId ?? index}`}>
              {issue.messagePl}
            </li>
          ))}
        </ul>
      </div>
    )
  },
)
