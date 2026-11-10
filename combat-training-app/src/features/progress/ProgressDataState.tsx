import { useWorkoutData } from '@/application/workoutDataContext'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { Button } from '@/components/ui/Button'
import { progressLabels as labels } from './progressLabels'

export function ProgressDataState() {
  const { focusSkills, sessions, retry } = useWorkoutData()
  if (focusSkills.status === 'error' || sessions.status === 'error') return <div role="alert" className="space-y-3">
    <p>{focusSkills.status === 'error' ? workoutDataLabels.focusSkillsLoadError : workoutDataLabels.historyLoadError}</p>
    <Button variant="secondary" onClick={retry}>{labels.retry}</Button>
  </div>
  return <p role="status" className="text-muted">{labels.loading}</p>
}

export function ProgressDataWarning() {
  const { focusSkills, sessions } = useWorkoutData()
  return focusSkills.invalidDocumentIds.length + sessions.invalidDocumentIds.length > 0
    ? <p role="status" className="text-sm text-muted">{labels.invalid}</p> : null
}
