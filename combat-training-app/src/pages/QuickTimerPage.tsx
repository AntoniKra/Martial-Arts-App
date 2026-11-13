import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { routes } from '@/app/routes'
import { useAuth } from '@/features/auth/authContext'
import { useWorkoutData } from '@/application/workoutDataContext'
import { createQuickTimerPlan, adjustQuickTimerSeconds, quickTimerDuration, validateQuickTimerConfig, type QuickTimerDraft, type QuickTimerErrors } from '@/domain/quick-timer/quickTimer'
import { ROUND_FORMAT_PRESETS } from '@/domain/workout/roundFormatPresets'
import { DISCIPLINE_LABELS_PL } from '@/domain/discipline/disciplineLabels'
import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import { formatSecondsAsClock } from '@/domain/time/formatDuration'
import { createQuickTimerStorage } from '@/infrastructure/storage/quickTimerStorage'
import { persistWorkoutPreparation, readStoredWorkoutPreparation } from '@/infrastructure/storage/workoutPreparationStorage'
import { persistWorkoutEndWarning, readStoredWorkoutEndWarning } from '@/infrastructure/storage/workoutEndWarningStorage'
import { WORKOUT_PREPARATION_OPTIONS } from '@/features/workout-player/workoutPreparation'
import { workoutPlayerLabels } from '@/features/workout-player/workoutPlayerLabels'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Button } from '@/components/ui/Button'
import { QuickTimerCategoryField } from '@/features/quick-timer/QuickTimerCategoryField'
import { quickTimerLabels as labels } from '@/features/quick-timer/quickTimerLabels'

function Counter({ label, value, display, onChange, minimum, maximum, error }: {
  label: string; value: number; display: string; onChange: (direction: -1 | 1) => void; minimum: number; maximum: number; error?: string
}) {
  return <fieldset className="space-y-2">
    <legend className="mb-2 text-xs font-semibold text-muted">{label}</legend>
    <div className="flex items-center justify-between border border-bd bg-surface">
      <button type="button" aria-label={`Zmniejsz: ${label}`} disabled={value <= minimum} onClick={() => onChange(-1)} className="min-h-touch w-14 text-xl text-ink disabled:opacity-40">−</button>
      <output aria-label={label} className="font-display text-xl font-semibold tabular-nums text-ink">{display}</output>
      <button type="button" aria-label={`Zwiększ: ${label}`} disabled={value >= maximum} onClick={() => onChange(1)} className="min-h-touch w-14 text-xl text-ink disabled:opacity-40">+</button>
    </div>
    {error && <p role="alert" className="text-xs text-crimson-ink">{error}</p>}
  </fieldset>
}

function QuickTimerSettings({ uid }: { uid: string }) {
  const navigate = useNavigate()
  const { sessions } = useWorkoutData()
  const [storage] = useState(() => createQuickTimerStorage(uid))
  const [draft, setDraft] = useState(storage.read)
  const [errors, setErrors] = useState<QuickTimerErrors>({})
  const [preparation, setPreparation] = useState(readStoredWorkoutPreparation)
  const [endWarning, setEndWarning] = useState(readStoredWorkoutEndWarning)
  const form = useRef<HTMLFormElement>(null)
  const latest = [...sessions.items].sort((a, b) => b.workoutDate.localeCompare(a.workoutDate) || b.createdAt.localeCompare(a.createdAt))[0]
  const disciplineKey = draft.disciplineKey ?? latest?.disciplineKey ?? null
  function update(patch: Partial<QuickTimerDraft>) { setDraft((current) => ({ ...current, ...patch })); setErrors({}) }
  function submit(event: FormEvent) {
    event.preventDefault()
    const result = validateQuickTimerConfig({ ...draft, disciplineKey })
    if (!result.ok) {
      setErrors(result.errors)
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    storage.save(result.config)
    const plan = createQuickTimerPlan(result.config, { planId: crypto.randomUUID(), blockId: crypto.randomUUID(), exerciseId: crypto.randomUUID(), now: new Date().toISOString() })
    void navigate(routes.quickTimerActive, { state: { quickTimerPlan: { schemaVersion: 1, ...plan } } })
  }
  return <div className="mx-auto w-full max-w-lg px-4 py-6">
    <h1 className="mb-6 font-display text-2xl font-bold text-ink">{labels.title}</h1>
    <form ref={form} noValidate onSubmit={submit} className="space-y-6">
      <QuickTimerCategoryField value={draft.category} onChange={(category) => update({ category })} error={errors.category} />
      <div>
        <label htmlFor="quick-timer-discipline" className="mb-2 block font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{labels.discipline}</label>
        <select id="quick-timer-discipline" value={disciplineKey ?? ''} aria-invalid={!!errors.disciplineKey} aria-describedby={errors.disciplineKey ? 'quick-timer-discipline-error' : undefined}
          onChange={(event) => update({ disciplineKey: event.target.value as DisciplineKey })} className="min-h-touch w-full border border-bd bg-input px-3 text-base text-ink">
          <option value="" disabled>{labels.chooseDiscipline}</option>
          {Object.entries(DISCIPLINE_LABELS_PL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        {errors.disciplineKey && <p id="quick-timer-discipline-error" role="alert" className="mt-2 text-xs text-crimson-ink">{errors.disciplineKey}</p>}
      </div>
      <fieldset className="min-w-0 space-y-2">
        <legend className="mb-2 font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{labels.format}</legend>
        {[...ROUND_FORMAT_PRESETS.map((preset) => ({ ...preset, description: 'description' in preset ? preset.description : null })), { id: 'custom' as const, label: labels.custom, description: null }].map((preset) => <button key={preset.id} type="button" aria-pressed={draft.format === preset.id}
          onClick={() => update('roundCount' in preset ? { format: preset.id, roundCount: preset.roundCount, roundDurationSeconds: preset.roundDurationSeconds, restBetweenRoundsSeconds: preset.restBetweenRoundsSeconds } : { format: 'custom' })}
          className={`block min-h-touch w-full border p-3 text-left text-sm ${draft.format === preset.id ? 'border-crimson bg-elevated font-semibold text-ink' : 'border-bd bg-surface text-muted'}`}>
          {draft.format === preset.id && <span aria-hidden="true">✓ </span>}{preset.label}
          {preset.description && <span className="mt-1 block text-xs font-normal text-muted">{preset.description}</span>}
        </button>)}
      </fieldset>
      {draft.format === 'custom' && <div className="space-y-4">
        <Counter label={labels.rounds} value={draft.roundCount} display={String(draft.roundCount)} minimum={1} maximum={50} error={errors.roundCount} onChange={(direction) => update({ roundCount: Math.max(1, Math.min(50, draft.roundCount + direction)) })} />
        <Counter label={labels.work} value={draft.roundDurationSeconds} display={formatSecondsAsClock(draft.roundDurationSeconds)} minimum={5} maximum={600} error={errors.roundDurationSeconds} onChange={(direction) => update({ roundDurationSeconds: adjustQuickTimerSeconds(draft.roundDurationSeconds, direction, 5, 600) })} />
        <Counter label={labels.rest} value={draft.restBetweenRoundsSeconds} display={formatSecondsAsClock(draft.restBetweenRoundsSeconds)} minimum={0} maximum={300} error={errors.restBetweenRoundsSeconds} onChange={(direction) => update({ restBetweenRoundsSeconds: adjustQuickTimerSeconds(draft.restBetweenRoundsSeconds, direction, 0, 300) })} />
      </div>}
      <p className="flex items-center justify-between border-y border-bd py-4 text-sm text-muted">{labels.total}<span className="font-display text-2xl font-bold tabular-nums text-ink">{formatSecondsAsClock(quickTimerDuration(draft))}</span></p>
      <SegmentedControl label={workoutPlayerLabels.preparationSetting} options={WORKOUT_PREPARATION_OPTIONS} value={preparation} onChange={(value) => setPreparation(persistWorkoutPreparation(value))} />
      <label className="flex min-h-touch cursor-pointer items-center gap-3 text-[13px] leading-relaxed text-ink">
        <input type="checkbox" role="switch" checked={endWarning} onChange={(event) => setEndWarning(persistWorkoutEndWarning(event.target.checked))} className="size-5 shrink-0 accent-crimson" />
        {workoutPlayerLabels.endWarningSetting}
      </label>
      <p className="text-xs leading-relaxed text-muted">{labels.iphone}</p>
      <Button type="submit" size="lg" className="w-full uppercase tracking-[0.1em]">{labels.start}</Button>
    </form>
  </div>
}

export function Component() {
  const { state } = useAuth()
  const uid = state.status === 'ready' ? state.session?.uid : undefined
  return uid ? <QuickTimerSettings key={uid} uid={uid} /> : null
}
