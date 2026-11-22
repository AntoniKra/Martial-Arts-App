import { useWorkoutData } from '@/application/workoutDataContext'
import { Button } from '@/components/ui/Button'
import { workoutSessionName } from '@/features/workouts/utils/workoutSessionPresentation'
import { workoutPlayerLabels as labels } from '../workoutPlayerLabels'

export function CompletedWorkoutRecoveryNotice() {
  const { completedWorkoutRetries, saveRecordedSession } = useWorkoutData()
  return completedWorkoutRetries.map((session) => <div key={session.id} className="mx-4 mt-4 space-y-2 border border-bd bg-surface p-3 text-sm">
    <p role="alert" className="text-crimson-ink">{labels.unsentSession(workoutSessionName(session))}</p>
    <Button variant="secondary" onClick={() => void saveRecordedSession(session).catch(() => {
      // The recovery notice is shown again after a failed retry.
    })}>{labels.retrySave}</Button>
  </div>)
}
