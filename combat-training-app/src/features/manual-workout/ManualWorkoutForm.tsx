import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import type { ManualWorkoutSession, WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { changeManualCategory, createManualWorkoutDraft, findManualWorkoutDuplicate, manualFocusPlace, validateManualWorkout,
  type ManualWorkoutDraft, type ManualWorkoutErrors, type ManualWorkoutValues } from '@/domain/workout-session/manualWorkoutEntry'
import { calculateWorkoutDate } from '@/domain/workout-session/workoutSessionDefinitions'
import { calendarDaysBetween } from '@/domain/workout-session/rpeRecall'
import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import { DISCIPLINE_LABELS_PL } from '@/domain/discipline/disciplineLabels'
import { Button } from '@/components/ui/Button'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { UnsavedPlanChangesGuard } from '@/features/workout-builder/components/UnsavedPlanChangesGuard'
import { RpeScale } from '@/features/workout-feedback/RpeScale'
import { FocusCard } from '@/features/workout-feedback/FocusCard'
import { sparringIntensityLabels } from '@/features/workout-feedback/sparringIntensityLabels'
import { workoutFeedbackLabels } from '@/features/workout-feedback/workoutFeedbackLabels'
import { WEEK_PLAN_CATEGORIES, categoryLabel } from '@/features/week-plan/weekPlanLabels'
import { workoutSessionName } from '@/features/workouts/utils/workoutSessionPresentation'
import { manualCategoryDescriptions, manualWorkoutLabels as labels } from './manualWorkoutLabels'
import { hasPerformanceObserver, reportPerformanceEvent } from '@/application/performance/performanceEvents'

const inputClass = 'mt-2 block min-h-touch w-full border border-bd bg-input p-3 text-base text-ink'
const groupClass = 'min-w-0 space-y-3'
const legendClass = 'mb-2 font-display text-base font-semibold text-ink'

function FieldError({ message, id }: { message?: string; id: string }) {
  return message ? <p id={id} role="alert" className="mt-2 text-sm text-crimson-ink">{message}</p> : null
}

function DuplicateDialog({ duplicate, onCancel, onConfirm }: {
  duplicate: WorkoutSession; onCancel: () => void; onConfirm: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const id = useId()
  useEffect(() => { dialog.current?.showModal(); cancel.current?.focus() }, [])
  return <dialog ref={dialog} aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
    onCancel={(event) => { event.preventDefault(); onCancel() }}
    className="fixed inset-0 m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-sm space-y-4 overflow-y-auto border border-bd bg-surface p-5 text-ink backdrop:bg-bg/80">
    <h2 id={`${id}-title`} className="font-display text-xl font-bold">{labels.duplicateTitle}</h2>
    <div id={`${id}-description`} className="space-y-3 text-sm leading-relaxed">
      <p>{labels.duplicate(workoutSessionName(duplicate))}</p><p className="text-muted">{labels.duplicateHint}</p>
    </div>
    <Button className="w-full" onClick={onConfirm}>{labels.confirmDuplicate}</Button>
    <button ref={cancel} type="button" className={getButtonClassName({ variant: 'secondary', className: 'w-full' })} onClick={onCancel}>{labels.returnToEntry}</button>
  </dialog>
}

export function ManualWorkoutForm({ original, sessions, skills, skillsStatus, onRetrySkills, onSave, returnTo }: {
  original?: ManualWorkoutSession; sessions: readonly WorkoutSession[]; skills: readonly FocusSkill[]
  skillsStatus: 'loading' | 'ready' | 'error'; onRetrySkills: () => void
  onSave: (values: ManualWorkoutValues, skillsAvailable: boolean) => Promise<void>; returnTo: string
}) {
  const navigate = useNavigate()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const today = calculateWorkoutDate(new Date().toISOString(), timezone)
  const [initial] = useState(() => {
    const latest = [...sessions].sort((a, b) => b.workoutDate.localeCompare(a.workoutDate)
      || (b.source === 'manual' ? b.createdAt : b.startedAt).localeCompare(a.source === 'manual' ? a.createdAt : a.startedAt))[0]
    return createManualWorkoutDraft(today, latest?.disciplineKey ?? '', original)
  })
  const [draft, setDraft] = useState(initial)
  const [customDuration, setCustomDuration] = useState(!['', '60', '90', '120'].includes(initial.durationMinutes))
  const [errors, setErrors] = useState<ManualWorkoutErrors>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [duplicate, setDuplicate] = useState<WorkoutSession | null>(null)
  const form = useRef<HTMLFormElement>(null)
  const allowLeave = useRef(false)
  const busy = useRef(false)
  const id = useId()
  const activeSkills = skills.filter((skill) => skill.archivedAt === null)
  const listedSkills = [...activeSkills, ...skills.filter((skill) => skill.archivedAt !== null && draft.focusRatings.some((rating) => rating.focusSkillId === skill.id))]
  const daysAgo = calendarDaysBetween(draft.workoutDate, today)
  function set<K extends keyof ManualWorkoutDraft>(key: K, value: ManualWorkoutDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }
  const errorId = (key: string) => `${id}-${key}-error`
  const invalidProps = (key: keyof ManualWorkoutDraft) => ({ 'aria-invalid': !!errors[key], 'aria-describedby': errors[key] ? errorId(key) : undefined })

  async function save(confirmDuplicate = false) {
    if (busy.current) return
    if (!original && hasPerformanceObserver()) reportPerformanceEvent({ type: 'save-click', at: performance.now() })
    const available = skillsStatus === 'ready'
    const result = validateManualWorkout({ ...draft, focusRatings: available ? draft.focusRatings : original?.focusRatings ?? [] },
      calculateWorkoutDate(new Date().toISOString(), timezone), original?.workoutDate)
    if (!result.ok) {
      setErrors(result.errors)
      requestAnimationFrame(() => {
        const invalid = form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ;(invalid?.querySelector<HTMLElement>('input, select, textarea') ?? invalid)?.focus()
      })
      return
    }
    const found = findManualWorkoutDuplicate(result.values, sessions, original)
    if (found && !confirmDuplicate) { setDuplicate(found); return }
    setDuplicate(null); setErrors({}); setSaveError(false); setSaving(true); busy.current = true
    try {
      await onSave(result.values, available)
      allowLeave.current = true
      await navigate(returnTo)
    } catch { setSaveError(true) } finally { busy.current = false; setSaving(false) }
  }
  function submit(event: FormEvent) { event.preventDefault(); void save() }
  return <UnsavedPlanChangesGuard isDirty={JSON.stringify(draft) !== JSON.stringify(initial)} allowLeaveRef={allowLeave} description={labels.discard}>
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-5">
      <h1 className="font-display text-2xl font-bold text-ink">{original ? labels.editTitle : labels.title}</h1>
      <form ref={form} onSubmit={submit} noValidate aria-label={labels.title} className="space-y-6">
        <fieldset disabled={saving} className="min-w-0 space-y-6">
          <div>
            <label className="block font-semibold text-ink" htmlFor={`${id}-date`}>{labels.date}</label>
            <input id={`${id}-date`} type="date" min={shiftCalendarDate(today, -7)} max={today} value={draft.workoutDate}
              {...invalidProps('workoutDate')} onChange={(event) => set('workoutDate', event.target.value)} className={inputClass} />
            <p className="mt-2 text-xs text-muted">{labels.dateHint}</p><FieldError message={errors.workoutDate} id={errorId('workoutDate')} />
          </div>
          <fieldset className={groupClass} {...invalidProps('disciplineKey')} tabIndex={errors.disciplineKey ? -1 : undefined}>
            <legend className={legendClass}>{labels.discipline}</legend>
            <div className="grid grid-cols-2 gap-2">{(Object.entries(DISCIPLINE_LABELS_PL) as [keyof typeof DISCIPLINE_LABELS_PL, string][]).map(([value, label]) =>
              <label key={value} className={`flex min-h-touch items-center gap-2 border p-3 text-sm ${draft.disciplineKey === value ? 'border-crimson text-ink' : 'border-bd text-muted'}`}>
                <input type="radio" name={`${id}-discipline`} checked={draft.disciplineKey === value} onChange={() => set('disciplineKey', value)} className="accent-crimson" />{label}
              </label>)}</div>
            <FieldError message={errors.disciplineKey} id={errorId('disciplineKey')} />
          </fieldset>
          <fieldset className={groupClass} {...invalidProps('category')} tabIndex={errors.category ? -1 : undefined}>
            <legend className={legendClass}>{labels.category}</legend>
            {WEEK_PLAN_CATEGORIES.map((category) => <label key={category}
              className={`flex min-h-touch items-start gap-3 border p-3 ${draft.category === category ? 'border-crimson text-ink' : 'border-bd text-muted'}`}>
              <input type="radio" name={`${id}-category`} checked={draft.category === category} onChange={() => {
                setDraft((current) => changeManualCategory(current, category)); setErrors({})
              }} className="mt-1 accent-crimson" />
              <span><span className="block text-sm font-semibold">{categoryLabel(category)}</span><span className="mt-1 block text-xs leading-relaxed text-muted">{manualCategoryDescriptions[category]}</span></span>
            </label>)}<FieldError message={errors.category} id={errorId('category')} />
          </fieldset>
          <fieldset className={groupClass} {...invalidProps('durationMinutes')} tabIndex={errors.durationMinutes ? -1 : undefined}>
            <legend className={legendClass}>{labels.duration}</legend><p className="text-sm text-muted">{labels.durationHint}</p>
            <div className="grid grid-cols-4 gap-1">{['60', '90', '120', 'other'].map((value) => <label key={value}
              className={`flex min-h-touch items-center justify-center gap-1 border text-xs ${value === 'other' ? customDuration ? 'border-crimson' : 'border-bd' : !customDuration && draft.durationMinutes === value ? 'border-crimson' : 'border-bd'}`}>
              <input type="radio" name={`${id}-duration`} checked={value === 'other' ? customDuration : !customDuration && draft.durationMinutes === value}
                onChange={() => { setCustomDuration(value === 'other'); if (value !== 'other') set('durationMinutes', value) }} className="accent-crimson" />
              {value === 'other' ? labels.customDuration : `${value} min`}
            </label>)}</div>
            {customDuration && <label className="block text-sm">{labels.minutes}<input type="number" min={1} max={480} step={1} inputMode="numeric"
              value={draft.durationMinutes} onChange={(event) => set('durationMinutes', event.target.value)} {...invalidProps('durationMinutes')} className={inputClass} /></label>}
            <FieldError message={errors.durationMinutes} id={errorId('durationMinutes')} />
          </fieldset>
          <fieldset className={groupClass} {...invalidProps('rpe')} tabIndex={errors.rpe ? -1 : undefined}>
            <legend className={legendClass}>{labels.rpe}</legend><p className="text-sm text-muted">{labels.rpeHint}</p>
            <RpeScale value={draft.rpe} onChange={(value) => set('rpe', value)} />
            {daysAgo >= 3 && <p className="text-sm leading-relaxed text-muted">{labels.recall(daysAgo)}</p>}
            <FieldError message={errors.rpe} id={errorId('rpe')} />
          </fieldset>
          <section aria-label={labels.sparring} className="space-y-3">
            {draft.category !== 'sparring' ? <label className="flex min-h-touch items-center gap-3 text-sm font-semibold">
              <input type="checkbox" checked={draft.hasSparring} onChange={(event) => set('hasSparring', event.target.checked)} className="accent-crimson" />{labels.sparring}
            </label> : <h2 className={legendClass}>{labels.sparring}</h2>}
            {(draft.hasSparring || draft.category === 'sparring') && <>
              <fieldset className={groupClass} {...invalidProps('intensity')} tabIndex={errors.intensity ? -1 : undefined}>
                <legend className={legendClass}>{labels.intensity}</legend>
                {(Object.entries(sparringIntensityLabels) as [keyof typeof sparringIntensityLabels, string][]).map(([value, label]) => <label key={value}
                  className={`flex min-h-touch items-start gap-3 border p-3 text-sm leading-relaxed ${draft.intensity === value ? 'border-crimson' : 'border-bd'}`}>
                  <input type="radio" name={`${id}-intensity`} checked={draft.intensity === value} onChange={() => set('intensity', value)} className="mt-1 accent-crimson" />{label}
                </label>)}<FieldError message={errors.intensity} id={errorId('intensity')} />
              </fieldset>
              <label className="block text-sm">{labels.rounds}<input type="number" min={1} max={50} step={1} inputMode="numeric" value={draft.rounds}
                onChange={(event) => set('rounds', event.target.value)} {...invalidProps('rounds')} className={inputClass} /></label>
              <FieldError message={errors.rounds} id={errorId('rounds')} />
            </>}
          </section>
          <section aria-labelledby={`${id}-focus`} className="space-y-3">
            <h2 id={`${id}-focus`} className={legendClass}>{labels.focus}</h2><p className="text-sm text-muted">{labels.focusHint}</p>
            {skillsStatus === 'loading' ? <p role="status" className="text-sm text-muted">{labels.skillsLoading}</p>
              : skillsStatus === 'error' ? <div className="space-y-2"><p role="alert" className="text-sm text-muted">{labels.skillsError}</p><Button variant="secondary" onClick={onRetrySkills}>{labels.retry}</Button></div>
                : <>
                  {!listedSkills.length && !draft.focusRatings.length && <p className="text-sm text-muted">{labels.noSkills}</p>}
                  {listedSkills.map((skill) => {
                    const selected = draft.focusRatings.some((rating) => rating.focusSkillId === skill.id)
                    return <label key={skill.id} className="flex min-h-touch items-center gap-3 border border-bd p-3 text-sm">
                      <input type="checkbox" checked={selected} disabled={!selected && draft.focusRatings.length >= 3} className="accent-crimson"
                        onChange={() => set('focusRatings', selected ? draft.focusRatings.filter((rating) => rating.focusSkillId !== skill.id)
                          : [...draft.focusRatings, { workoutItemId: null, focusSkillId: skill.id, skillNameSnapshot: skill.name,
                            criterionSnapshot: skill.criterion, blockType: manualFocusPlace(draft.category), assessment: null, correction: null, previousCorrectionCheck: null }])} />{skill.name}
                    </label>
                  })}
                  {draft.focusRatings.map((rating) => {
                    const error = errors[`focus-${rating.focusSkillId}`]
                    return <div key={rating.focusSkillId} aria-invalid={!!error} aria-describedby={error ? errorId(rating.focusSkillId) : undefined} tabIndex={error ? -1 : undefined}>
                      <FocusCard session={{ id: original?.id ?? 'new-manual-entry', workoutDate: draft.workoutDate }} rating={rating} skills={skills} first
                        correctionLabel={labels.newCorrection} error={error?.startsWith('Problem') ? error : undefined}
                        onChange={(value) => { set('focusRatings', draft.focusRatings.map((current) => current.focusSkillId === value.focusSkillId ? value : current)); setErrors({}) }}>
                        {(draft.category === 'mixed' || draft.category === 'conditioning') && <label className="block text-sm font-semibold">
                          {labels.place}<select value={rating.blockType ?? ''} onChange={(event) => {
                            const blockType = WEEK_PLAN_CATEGORIES.find((value) => value !== 'mixed' && value === event.target.value)
                            set('focusRatings', draft.focusRatings.map((value) => value.focusSkillId === rating.focusSkillId ? { ...value, blockType: blockType && blockType !== 'mixed' ? blockType : null } : value))
                            setErrors({})
                          }} className={inputClass}>
                            <option value="">{labels.choosePlace}</option>{WEEK_PLAN_CATEGORIES.filter((value) => value !== 'mixed').map((value) => <option key={value} value={value}>{categoryLabel(value)}</option>)}
                          </select>
                        </label>}
                      </FocusCard>
                      {!error?.startsWith('Problem') && <FieldError message={error} id={errorId(rating.focusSkillId)} />}
                    </div>
                  })}
                </>}
            <FieldError message={errors.focusRatings} id={errorId('focusRatings')} />
          </section>
          <label className="block text-sm font-semibold">{workoutFeedbackLabels.noteHeading}
            <textarea rows={4} maxLength={1000} value={draft.note} placeholder={workoutFeedbackLabels.notePlaceholder} {...invalidProps('note')}
              onChange={(event) => set('note', event.target.value)} className={`${inputClass} resize-y font-normal`} />
          </label><FieldError message={errors.note} id={errorId('note')} />
        </fieldset>
        {saveError && <p role="alert" className="text-sm text-crimson-ink">{labels.saveError}</p>}
        <Button type="submit" loading={saving} size="lg" className="w-full">{labels.save}</Button>
        <Button variant="ghost" disabled={saving} className="w-full" onClick={() => { void navigate(returnTo) }}>{labels.cancel}</Button>
      </form>
    </div>
    {duplicate && <DuplicateDialog duplicate={duplicate} onCancel={() => { setDuplicate(null); form.current?.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus() }} onConfirm={() => { void save(true) }} />}
  </UnsavedPlanChangesGuard>
}
