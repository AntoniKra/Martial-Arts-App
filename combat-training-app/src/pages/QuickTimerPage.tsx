import { RouteScreenHeader } from '@/components/ScreenHeader'
import { useId, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { routes } from '@/app/routes'
import { useAuth } from '@/features/auth/authContext'
import { useWorkoutData } from '@/application/workoutDataContext'
import { createQuickTimerPlan, adjustQuickTimerSeconds, quickTimerDuration, resolveQuickTimerDefaults, validateQuickTimerConfig, type QuickTimerDraft, type QuickTimerErrors } from '@/domain/quick-timer/quickTimer'
import { ROUND_FORMAT_PRESETS } from '@/domain/workout/roundFormatPresets'
import { formatSecondsAsClock } from '@/domain/time/formatDuration'
import { createQuickTimerStorage } from '@/infrastructure/storage/quickTimerStorage'
import { profileSettingsLabels } from '@/features/profile/profileSettingsLabels'
import { Button } from '@/components/ui/Button'
import { quickTimerLabels as labels } from '@/features/quick-timer/quickTimerLabels'
import '@/features/quick-timer/quickTimer.css'

function Counter({ label, value, display, onChange, minimum, maximum, error }: {
  label: string; value: number; display: string; onChange: (direction: -1 | 1) => void; minimum: number; maximum: number; error?: string
}) {
  const labelId = useId()
  const errorId = `${labelId}-error`
  return <div role="group" aria-labelledby={labelId} className="quick-timer-counter">
    <span id={labelId} className="quick-timer-counter-label">{label}</span>
    <output aria-labelledby={labelId} className="quick-timer-counter-value">{display}</output>
    <div className="grid w-full grid-cols-2 gap-1">
      <button type="button" aria-label={labels.decrease(label)} aria-invalid={!!error} aria-describedby={error ? errorId : undefined}
        disabled={value <= minimum} onClick={() => onChange(-1)} className="m5-flat-control quick-timer-counter-button">−</button>
      <button type="button" aria-label={labels.increase(label)} aria-invalid={!!error} aria-describedby={error ? errorId : undefined}
        disabled={value >= maximum} onClick={() => onChange(1)} className="m5-flat-control quick-timer-counter-button">+</button>
    </div>
    {error && <p id={errorId} role="alert" className="text-xs text-crimson-ink">{error}</p>}
  </div>
}

function QuickTimerSettings({ uid }: { uid: string }) {
  const navigate = useNavigate()
  const { sessions } = useWorkoutData()
  const [storage] = useState(() => createQuickTimerStorage(uid))
  const [draft, setDraft] = useState(storage.read)
  const [errors, setErrors] = useState<QuickTimerErrors>({})
  const form = useRef<HTMLFormElement>(null)
  function update(patch: Partial<QuickTimerDraft>) { setDraft((current) => ({ ...current, ...patch })); setErrors({}) }
  function adjust(patch: Partial<QuickTimerDraft>) { update({ ...patch, format: 'custom' }) }
  function submit(event: FormEvent) {
    event.preventDefault()
    if (sessions.status === 'loading') return
    const { category, disciplineKey } = resolveQuickTimerDefaults(draft.disciplineKey, sessions.items)
    const result = validateQuickTimerConfig({ ...draft, category, disciplineKey })
    if (!result.ok) {
      setErrors(result.errors)
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]:not(:disabled)')?.focus())
      return
    }
    storage.save(result.config)
    const plan = createQuickTimerPlan(result.config, { planId: crypto.randomUUID(), blockId: crypto.randomUUID(), exerciseId: crypto.randomUUID(), now: new Date().toISOString() })
    void navigate(routes.quickTimerActive, { state: { quickTimerPlan: { schemaVersion: 1, ...plan } } })
  }
  return <div className="quick-timer-screen mx-auto w-full max-w-lg">
    <RouteScreenHeader title={labels.title} variant="centered" fallback={routes.home} />
    <form ref={form} noValidate onSubmit={submit} className="quick-timer-stack">
      <fieldset className="min-w-0">
        <legend className="quick-timer-legend">{labels.format}</legend>
        <div className="grid grid-cols-2 gap-2">
          {ROUND_FORMAT_PRESETS.map((preset) => <button key={preset.id} type="button"
            aria-pressed={draft.format === preset.id} aria-invalid={!!errors.format}
            aria-describedby={errors.format ? 'quick-timer-format-error' : undefined}
            onClick={() => update({ format: preset.id, roundCount: preset.roundCount, roundDurationSeconds: preset.roundDurationSeconds, restBetweenRoundsSeconds: preset.restBetweenRoundsSeconds })}
            className="quick-timer-choice quick-timer-format">
            <strong>{preset.roundCount} × {formatSecondsAsClock(preset.roundDurationSeconds)}</strong>
            <span>{labels.formatRest(formatSecondsAsClock(preset.restBetweenRoundsSeconds))}</span>
            {'description' in preset && <span className="quick-timer-format-description">{preset.description}</span>}
          </button>)}
          <button type="button" aria-pressed={draft.format === 'custom'} onClick={() => update({ format: 'custom' })}
            className="quick-timer-choice quick-timer-format">
            <strong>{labels.custom}</strong>
            <span>{labels.customDescription}</span>
          </button>
        </div>
        {errors.format && <p id="quick-timer-format-error" role="alert" className="mt-2 text-xs text-crimson-ink">{errors.format}</p>}
      </fieldset>
      <div className="grid grid-cols-3 gap-1.5">
        <Counter label={labels.rounds} value={draft.roundCount} display={String(draft.roundCount)} minimum={1} maximum={50} error={errors.roundCount} onChange={(direction) => adjust({ roundCount: draft.roundCount + direction })} />
        <Counter label={labels.work} value={draft.roundDurationSeconds} display={formatSecondsAsClock(draft.roundDurationSeconds)} minimum={5} maximum={600} error={errors.roundDurationSeconds} onChange={(direction) => adjust({ roundDurationSeconds: adjustQuickTimerSeconds(draft.roundDurationSeconds, direction, 5, 600) })} />
        <Counter label={labels.rest} value={draft.restBetweenRoundsSeconds} display={formatSecondsAsClock(draft.restBetweenRoundsSeconds)} minimum={0} maximum={300} error={errors.restBetweenRoundsSeconds} onChange={(direction) => adjust({ restBetweenRoundsSeconds: adjustQuickTimerSeconds(draft.restBetweenRoundsSeconds, direction, 0, 300) })} />
      </div>
      <div className="flex items-center justify-between border-y border-bd py-3.5 text-sm text-muted">{labels.total}<output aria-label={labels.total} className="font-display text-2xl font-extrabold tabular-nums text-ink">{formatSecondsAsClock(quickTimerDuration(draft))}</output></div>
      <Link to={`${routes.profile}#profile-training`} className="inline-flex min-h-touch items-center self-start text-[13px] text-muted underline underline-offset-[3px]">{profileSettingsLabels.trainingLink}</Link>
      <p className="text-xs leading-normal text-muted">{labels.iphone}</p>
      <Button type="submit" disabled={sessions.status === 'loading'} size="sm" className="quick-timer-submit">{labels.start}</Button>
    </form>
  </div>
}

export function Component() {
  const { state } = useAuth()
  const uid = state.status === 'ready' ? state.session?.uid : undefined
  return uid ? <QuickTimerSettings key={uid} uid={uid} /> : null
}
