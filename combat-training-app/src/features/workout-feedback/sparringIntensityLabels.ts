import type { SparringIntensity } from '@/domain/workout/workout.types'
import { workoutFeedbackLabels as labels } from './workoutFeedbackLabels'

function formatOption(intensity: SparringIntensity): string {
  const { name, description } = labels.sparringOptions[intensity]
  return labels.sparringOptionLabel(name, description)
}

export const sparringIntensityLabels: Record<SparringIntensity, string> = {
  light: formatOption('light'),
  technical: formatOption('technical'),
  hard: formatOption('hard'),
}
