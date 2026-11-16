import { useRef, useState } from 'react'
import type { WeekActivity, Weekday } from '@/domain/week-plan/weekPlan.types'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import { DISCIPLINE_LABELS_PL } from '@/domain/discipline/disciplineLabels'
import { MANUAL_WORKOUT_PARTS } from '@/domain/workout-session/workoutSession.types'
import { manualPartLabel } from '@/features/manual-workout/manualWorkoutLabels'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { UnsavedPlanChangesGuard } from '@/features/workout-builder/components/UnsavedPlanChangesGuard'
import { WEEK_PLAN_CATEGORIES, categoryLabel } from './weekPlanLabels'
import { scheduleLabels as labels, weekdays } from './scheduleLabels'
import { validateWeekActivity, type WeekActivityDraft } from './validateWeekActivity'

const input = 'min-h-12 w-full min-w-0 border border-bd bg-input px-3 text-base text-ink'
const legend = 'mb-2 font-display text-base font-bold'

export function WeekActivityForm({ initial, defaultDay, recurring, plans, onSave, onCancel }: {
  initial?: WeekActivity; defaultDay: Weekday | null; recurring: boolean; plans: readonly WorkoutPlan[]
  onSave: (items: WeekActivity[]) => Promise<void>; onCancel: () => void
}) {
  const [baseline] = useState<WeekActivityDraft>(() => ({
    kind: initial?.kind ?? (defaultDay === null && !recurring ? 'own' : 'club'), days: initial?.day !== undefined && initial.day !== null ? [initial.day] : defaultDay === null ? [] : [defaultDay],
    anyDay: initial ? initial.kind === 'own' && initial.day === null : defaultDay === null && !recurring, disciplineKey: initial?.kind === 'club' ? initial.disciplineKey : '',
    startTime: initial?.kind === 'club' ? initial.startTime : '', endTime: initial?.kind === 'club' ? initial.endTime : '',
    parts: initial?.kind === 'club' ? initial.parts : [], clubName: initial?.kind === 'club' ? initial.clubName ?? '' : '',
    category: initial?.kind === 'own' ? initial.category : 'bag', workoutPlanId: initial?.kind === 'own' ? initial.workoutPlanId : null,
    planNameSnapshot: initial?.kind === 'own' ? initial.planNameSnapshot : null,
  }))
  const [draft, setDraft] = useState(baseline)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const allowLeaveRef = useRef(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline)
  const set = <K extends keyof WeekActivityDraft>(key: K, value: WeekActivityDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  async function save() {
    let usedInitialId = false
    const items = validateWeekActivity(draft, () => {
      if (initial && !usedInitialId) { usedInitialId = true; return initial.id }
      return crypto.randomUUID()
    })
    if (!items) { setError(labels.invalid); return }
    setSaving(true); setError(null)
    try { await onSave(items); allowLeaveRef.current = true } catch { setError(labels.failed) } finally { setSaving(false) }
  }
  return <UnsavedPlanChangesGuard isDirty={dirty} allowLeaveRef={allowLeaveRef}>
    <form aria-label={labels.form} className="flex flex-col gap-[22px]" onSubmit={(event) => { event.preventDefault(); void save() }}>
      <fieldset disabled={saving} className="flex min-w-0 flex-col gap-[22px]">
        <div className="grid grid-cols-2 gap-1.5">{(['club', 'own'] as const).map((kind) => <button key={kind} type="button" aria-pressed={draft.kind === kind}
          className={`min-h-touch border px-2 text-[13px] font-semibold ${draft.kind === kind ? 'border-crimson bg-elevated text-ink' : 'border-bd text-muted'}`} onClick={() => set('kind', kind)}>{labels[kind]}</button>)}</div>
        <button type="button" aria-pressed={draft.kind === 'rest'} className={getButtonClassName({ variant: 'ghost' })} onClick={() => set('kind', 'rest')}>{labels.addRest}</button>
        <p className="-mt-2.5 text-sm text-muted">{recurring ? labels.recurringHint : labels.oneWeekHint}</p>
        {draft.kind === 'club' && <fieldset className="min-w-0"><legend className={legend}>{labels.discipline}</legend>
          <div className="grid grid-cols-2 gap-2">{Object.entries(DISCIPLINE_LABELS_PL).map(([key, name]) => <label key={key} className="radio-tile min-h-12">
            <input type="radio" name="week-discipline" checked={draft.disciplineKey === key} onChange={() => set('disciplineKey', key as DisciplineKey)} className="absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0" />
            {draft.disciplineKey === key && <span aria-hidden="true">✓</span>}{name}</label>)}</div>
        </fieldset>}
        {draft.kind === 'own' && <>
          <label className="space-y-2 text-sm">{labels.category}<select className={input} value={draft.category} onChange={(event) => {
            const category = WEEK_PLAN_CATEGORIES.find((category) => category === event.target.value)
            if (category) set('category', category)
          }}>{WEEK_PLAN_CATEGORIES.map((category) => <option key={category} value={category}>{categoryLabel(category)}</option>)}</select></label>
          <label className="space-y-2 text-sm">{labels.linkedPlan}<select className={input} value={draft.workoutPlanId ?? ''} onChange={(event) => {
            const plan = plans.find((plan) => plan.id === event.target.value)
            setDraft((current) => ({ ...current, workoutPlanId: plan?.id ?? null, planNameSnapshot: plan?.nameSnapshot ?? null }))
          }}><option value="">{labels.noPlan}</option>{draft.workoutPlanId && !plans.some((plan) => plan.id === draft.workoutPlanId) && <option value={draft.workoutPlanId}>{draft.planNameSnapshot}</option>}
            {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.nameSnapshot}</option>)}</select></label>
          <label className="flex min-h-touch items-center gap-3 text-sm"><input type="checkbox" checked={draft.anyDay} onChange={(event) => set('anyDay', event.target.checked)} />{labels.anyDay}</label>
        </>}
        {!(draft.kind === 'own' && draft.anyDay) && <fieldset className="min-w-0"><legend className={legend}>{labels.days}</legend><div className="grid grid-cols-7 gap-1">
          {weekdays.map(({ day, short, name }) => <button key={day} type="button" aria-label={`${short} — ${name}`} aria-pressed={draft.days.includes(day)}
            className={`min-h-12 border text-[13px] ${draft.days.includes(day) ? 'border-crimson bg-elevated font-bold' : 'border-bd text-muted'}`}
            onClick={() => set('days', draft.days.includes(day) ? draft.days.filter((entry) => entry !== day) : recurring ? [...draft.days, day] : [day])}>{short}</button>)}
        </div></fieldset>}
        {draft.kind === 'club' && <>
          <div className="grid grid-cols-2 gap-2"><label className="space-y-1.5 font-display font-bold">{labels.from}<input type="time" value={draft.startTime} className={input} onChange={(event) => set('startTime', event.target.value)} /></label>
            <label className="space-y-1.5 font-display font-bold">{labels.to}<input type="time" value={draft.endTime} className={input} onChange={(event) => set('endTime', event.target.value)} /></label></div>
          <fieldset className="min-w-0"><legend className={legend}>{labels.parts} <span className="font-sans text-[13px] font-medium text-muted">{labels.optional}</span></legend>
            <p className="mb-2 text-xs text-faint">{labels.partsHint}</p><div className="flex flex-wrap gap-1.5">{MANUAL_WORKOUT_PARTS.map((part) => <button key={part} type="button" aria-pressed={draft.parts.includes(part)}
              className={`min-h-touch border px-3 text-[13px] ${draft.parts.includes(part) ? 'border-crimson bg-elevated font-semibold' : 'border-bd text-muted'}`} onClick={() => set('parts', draft.parts.includes(part) ? draft.parts.filter((entry) => entry !== part) : [...draft.parts, part])}>{draft.parts.includes(part) ? '✓ ' : ''}{manualPartLabel(part)}</button>)}</div>
          </fieldset>
          <label className="space-y-1.5 font-display font-bold">{labels.clubName} <span className="font-sans text-[13px] font-medium text-muted">{labels.optional}</span><input type="text" maxLength={100} value={draft.clubName} placeholder={labels.clubPlaceholder} className={input} onChange={(event) => set('clubName', event.target.value)} /></label>
        </>}
      </fieldset>
      {error && <p role="alert" className="text-sm text-crimson-ink">{error}</p>}
      <button type="submit" disabled={saving} className={getButtonClassName({ disabled: saving, className: 'min-h-14 w-full tracking-wider' })}>{recurring ? draft.kind === 'club' ? labels.saveRecurring : draft.kind === 'rest' ? labels.saveRest : labels.saveOwn : labels.saveSingle}</button>
      <button type="button" disabled={saving} className={getButtonClassName({ variant: 'ghost' })} onClick={() => { if (!dirty || window.confirm(labels.confirmLeave)) onCancel() }}>{labels.cancel}</button>
      <p className="-mt-2.5 text-xs text-faint">{recurring ? labels.recurringFooter : labels.oneWeekHint}</p>
    </form>
  </UnsavedPlanChangesGuard>
}
