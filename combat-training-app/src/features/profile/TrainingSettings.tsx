import { useState } from 'react'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { REST_WARNING_VALUES, ROUND_WARNING_VALUES } from '@/domain/workout-playback/workoutEndWarning'
import { persistWorkoutEndWarnings, readStoredWorkoutEndWarnings } from '@/infrastructure/storage/workoutEndWarningStorage'
import { persistWorkoutPreparation, readStoredWorkoutPreparation } from '@/infrastructure/storage/workoutPreparationStorage'
import { WORKOUT_PREPARATION_OPTIONS } from '@/features/workout-player/workoutPreparation'
import { workoutPlayerLabels } from '@/features/workout-player/workoutPlayerLabels'
import { ProfileSettingsSection } from './ProfileSettingsSection'
import { profileSettingsLabels as labels } from './profileSettingsLabels'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { useWorkoutSignalPreview } from './useWorkoutSignalPreview'

export function TrainingSettings() {
  const [preparation, setPreparation] = useState(readStoredWorkoutPreparation)
  const [warnings, setWarnings] = useState(readStoredWorkoutEndWarnings)
  const preview = useWorkoutSignalPreview()
  return <ProfileSettingsSection title={labels.training} id="profile-training">
    <SegmentedControl textCase="normal" label={workoutPlayerLabels.preparationSetting} options={WORKOUT_PREPARATION_OPTIONS} value={preparation}
      onChange={(value) => setPreparation(persistWorkoutPreparation(value))} />
    <SegmentedControl textCase="normal" label={labels.roundWarning} options={ROUND_WARNING_VALUES.map((value) => ({ value, label: value === 'off' ? labels.off : `${value} s` }))}
      value={warnings.round} onChange={(round) => setWarnings(persistWorkoutEndWarnings({ ...warnings, round }))} />
    <SegmentedControl textCase="normal" label={labels.restWarning} options={REST_WARNING_VALUES.map((value) => ({ value, label: value === 'off' ? labels.off : `${value} s` }))}
      value={warnings.rest} onChange={(rest) => setWarnings(persistWorkoutEndWarnings({ ...warnings, rest }))} />
    <p className="text-sm leading-relaxed text-muted">{labels.trainingHint}</p>
    <button type="button" onClick={preview} className={getButtonClassName({ variant: 'secondary' })}>{labels.previewSignals}</button>
    <p className="text-sm leading-relaxed text-muted">{labels.previewSignalsHint}</p>
  </ProfileSettingsSection>
}
