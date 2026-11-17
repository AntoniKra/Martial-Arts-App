import { MultiChoiceChip } from '@/components/ui/MultiChoiceChip'
import { FormCloseConfirmation } from '@/components/FormCloseConfirmation'
import { ScreenHeader } from '@/components/ScreenHeader'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { EXERCISE_TYPES } from '@/domain/exercise/exercise'
import { DISCIPLINE_LABELS_PL } from '@/domain/discipline/disciplineLabels'
import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import { getWorkoutBlockLabelPl, WORKOUT_BLOCK_TYPES } from '@/domain/workout/workoutBlockLabels'
import { validateExerciseDefinition, type ExerciseDefinition } from './validateExerciseDefinition'
import { exerciseLabels as labels } from './exerciseLabels'

const inputClass = 'mt-1 block min-h-touch w-full border border-bd bg-input px-3 py-2 text-base text-ink'
const disciplines = Object.keys(DISCIPLINE_LABELS_PL) as DisciplineKey[]

export function ExerciseForm({ initial, existing = false, onSave, onCancel, fullScreen = false }: {
  initial: ExerciseDefinition; existing?: boolean; fullScreen?: boolean
  onSave: (value: ExerciseDefinition) => Promise<void>; onCancel: () => void
}) {
  const id = useId()
  const name = useRef<HTMLInputElement>(null)
  const busy = useRef(false)
  const [value, setValue] = useState(initial)
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  useEffect(() => { name.current?.focus() }, [])
  const [confirmClose, setConfirmClose] = useState(false)
  function close() {
    if (JSON.stringify(value) !== JSON.stringify(initial)) setConfirmClose(true)
    else onCancel()
  }
  const configuration = value.defaultConfiguration
  function numberField(label: string, current: number, update: (number: number) => void) {
    return <label className="block text-sm font-semibold">{label}<input type="text" inputMode="numeric" value={Number.isNaN(current) ? '' : current}
      onChange={(event) => update(/^\d+$/.test(event.target.value) ? Number(event.target.value) : Number.NaN)} className={inputClass} /></label>
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current) return
    const errors = validateExerciseDefinition(value)
    setErrors(errors)
    if (errors.length) { name.current?.focus(); return }
    busy.current = true; setSaving(true)
    try { await onSave({ ...value, namePl: value.namePl.trim() }) }
    catch { setErrors([labels.error]) }
    finally { busy.current = false; setSaving(false) }
  }
  return <form aria-label={existing ? labels.edit : labels.create} onSubmit={(event) => void submit(event)} noValidate className="space-y-4 border border-bd bg-surface p-4">
    <ScreenHeader variant="form" headingLevel={fullScreen ? 1 : 2} title={existing ? labels.edit : labels.create} onBack={close} disabled={saving} />
    <fieldset disabled={saving} className="min-w-0 space-y-4">
      <label htmlFor={`${id}-name`} className="block text-sm font-semibold">{labels.name}</label>
      <input ref={name} id={`${id}-name`} value={value.namePl} maxLength={100} required className={inputClass}
        onChange={(event) => setValue({ ...value, namePl: event.target.value })} />
      <label className="block text-sm font-semibold">{labels.type}<select disabled={existing} value={value.type} className={inputClass}
        onChange={(event) => { const type = EXERCISE_TYPES.find((type) => type === event.target.value); if (type) setValue({ ...value, type }) }}>
        {EXERCISE_TYPES.map((type) => <option key={type} value={type}>{labels.types[type]}</option>)}
      </select></label>
      {existing && <p className="text-sm text-muted">{labels.identity}</p>}
      <fieldset className="min-w-0"><legend className="text-sm font-semibold">{labels.disciplines}</legend>
        <div className="flex flex-wrap gap-2">{disciplines.map((key) => <MultiChoiceChip key={key} checked={value.disciplines.includes(key)} onChange={(event) => setValue({ ...value,
            disciplines: event.target.checked ? [...value.disciplines, key] : value.disciplines.filter((entry) => entry !== key) })}>{DISCIPLINE_LABELS_PL[key]}</MultiChoiceChip>)}</div>
      </fieldset>
      <fieldset className="min-w-0"><legend className="text-sm font-semibold">{labels.blocks}</legend>
        <div className="flex flex-wrap gap-2">{WORKOUT_BLOCK_TYPES.map((key) => <MultiChoiceChip key={key} checked={value.blockTypes.includes(key)} onChange={(event) => setValue({ ...value,
            blockTypes: event.target.checked ? [...value.blockTypes, key] : value.blockTypes.filter((entry) => entry !== key) })}>{getWorkoutBlockLabelPl(key)}</MultiChoiceChip>)}</div>
      </fieldset>
      <fieldset className="min-w-0 space-y-3"><legend className="mb-2 text-sm font-semibold">{labels.defaults}</legend>
        <label className="block text-sm font-semibold">{labels.mode}<select value={configuration.mode} className={inputClass} onChange={(event) => setValue({ ...value,
          defaultConfiguration: event.target.value === 'continuous' ? { mode: 'continuous', durationSeconds: 300 }
            : { mode: 'rounds', roundCount: 3, roundDurationSeconds: 180, restBetweenRoundsSeconds: 60 } })}>
          <option value="rounds">{labels.rounds}</option><option value="continuous">{labels.continuous}</option>
        </select></label>
        {configuration.mode === 'rounds' ? <>
          {numberField(labels.roundCount, configuration.roundCount, (roundCount) => setValue({ ...value, defaultConfiguration: { ...configuration, roundCount } }))}
          {numberField(labels.work, configuration.roundDurationSeconds, (roundDurationSeconds) => setValue({ ...value, defaultConfiguration: { ...configuration, roundDurationSeconds } }))}
          {numberField(labels.rest, configuration.restBetweenRoundsSeconds, (restBetweenRoundsSeconds) => setValue({ ...value, defaultConfiguration: { ...configuration, restBetweenRoundsSeconds } }))}
        </> : numberField(labels.duration, configuration.durationSeconds, (durationSeconds) => setValue({ ...value, defaultConfiguration: { ...configuration, durationSeconds } }))}
      </fieldset>
      {errors.length > 0 && <div role="alert" className="space-y-1 text-sm text-crimson-ink">{errors.map((error) => <p key={error}>{error}</p>)}</div>}
      <div className="flex flex-wrap gap-2"><Button type="submit" loading={saving}>{labels.save}</Button><Button type="button" variant="ghost" onClick={close}>{labels.cancel}</Button></div>
    </fieldset>
    {confirmClose && <FormCloseConfirmation onCancel={() => setConfirmClose(false)} onDiscard={onCancel} />}
  </form>
}
