import { Switch } from '@/components/ui/Switch'
import { MultiChoiceChip } from '@/components/ui/MultiChoiceChip'
import { ChoiceTile } from '@/components/ui/ChoiceTile'
import { useId, useState } from 'react'
import type { WeekActivity, Weekday } from '@/domain/week-plan/weekPlan.types'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import { DISCIPLINE_LABELS_PL } from '@/domain/discipline/disciplineLabels'
import { MANUAL_WORKOUT_PARTS } from '@/domain/workout-session/workoutSession.types'
import { manualPartLabel } from '@/features/manual-workout/manualWorkoutLabels'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { WEEK_PLAN_CATEGORIES, categoryLabel } from './weekPlanLabels'
import { scheduleLabels as labels, weekdays } from './scheduleLabels'
import { validateWeekActivity, type WeekActivityDraft } from './validateWeekActivity'

const input = 'min-h-touch w-full min-w-0 rounded-[2px] border border-bd bg-input px-3 text-base text-ink'
const legend = 'mb-2 text-[11px] font-bold uppercase tracking-wider text-muted'

export function WeekActivityForm({ initial, defaultDay, recurring, plans, onSave }: {
  initial?: WeekActivity; defaultDay: Weekday | null; recurring: boolean; plans: readonly WorkoutPlan[]
  onSave: (items: WeekActivity[], repeat: boolean) => Promise<void>; onCancel: () => void
}) {
  const planDescriptionId = useId()
  const [draft, setDraft] = useState<WeekActivityDraft>(() => ({
    kind: initial?.kind ?? (defaultDay === null ? 'own' : 'club'),
    days: initial?.day !== undefined && initial.day !== null ? [initial.day] : defaultDay === null ? [] : [defaultDay],
    anyDay: defaultDay === null, disciplineKey: initial?.kind === 'club' ? initial.disciplineKey : 'boxing',
    startTime: initial?.kind === 'club' ? initial.startTime : '', endTime: initial?.kind === 'club' ? initial.endTime : '',
    parts: initial?.kind === 'club' ? initial.parts : [], clubName: initial?.kind === 'club' ? initial.clubName ?? '' : '',
    category: initial?.kind === 'own' ? initial.category : 'bag',
    workoutPlanId: initial?.kind === 'own' ? initial.workoutPlanId : null,
    planNameSnapshot: initial?.kind === 'own' ? initial.planNameSnapshot : null,
  }))
  const [repeat, setRepeat] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  function set<K extends keyof WeekActivityDraft>(key: K, value: WeekActivityDraft[K]) { setDraft((current) => ({ ...current, [key]: value })); setError(null) }
  return <form aria-label={labels.form} className="flex flex-col gap-2.5 pb-[env(safe-area-inset-bottom,0px)]" onSubmit={(event) => {
    event.preventDefault()
    if (saving) return
    const items = validateWeekActivity(draft, () => initial?.id ?? crypto.randomUUID())
    if (!items) { setError(labels.invalid); return }
    setSaving(true); setError(null)
    void onSave(items, repeat).catch(() => setError(labels.failed)).finally(() => setSaving(false))
  }}>
    <fieldset disabled={saving} className="contents">
      <div className="grid grid-cols-2 border border-bd" role="group" aria-label={labels.activityKind}>
        {(['club', 'own'] as const).map((kind) => <button key={kind} type="button" aria-pressed={draft.kind === kind}
          className={`min-h-touch px-2 text-[13px] font-semibold ${draft.kind === kind ? 'bg-elevated shadow-[inset_0_-2px_0_var(--app-crimson)]' : 'text-muted'}`}
          onClick={() => set('kind', kind)}>{labels[kind]}</button>)}
      </div>
      {defaultDay === null && draft.kind === 'club' && <label className="text-sm">{labels.days}<select className={input} value={draft.days[0] ?? ''} onChange={(event) => {
        const day = weekdays.find(({ day }) => String(day) === event.target.value)?.day
        set('days', day === undefined ? [] : [day])
      }}><option value="">Wybierz dzień</option>{weekdays.map(({ day, name }) => <option key={day} value={day}>{name}</option>)}</select></label>}
      {draft.kind === 'club' && <fieldset><legend className={legend}>{labels.discipline}</legend>
        <div className="flex flex-wrap gap-1.5">{Object.entries(DISCIPLINE_LABELS_PL).map(([key, name]) => <ChoiceTile key={key} value={key} className="compact-choice" name="week-discipline" checked={draft.disciplineKey === key} onChange={() => set('disciplineKey', key as DisciplineKey)}>{name}</ChoiceTile>)}</div>
      </fieldset>}
      {draft.kind === 'own' && <>
        <label className="space-y-1 text-sm">{labels.category}<select className={input} value={draft.category} onChange={(event) => {
          const category = WEEK_PLAN_CATEGORIES.find((category) => category === event.target.value)
          if (category) set('category', category)
        }}>{WEEK_PLAN_CATEGORIES.map((category) => <option key={category} value={category}>{categoryLabel(category)}</option>)}</select></label>
        <label className="space-y-1 text-sm">{labels.linkedPlan}<select className={input} aria-describedby={planDescriptionId} value={draft.workoutPlanId ?? ''} onChange={(event) => {
          const plan = plans.find((plan) => plan.id === event.target.value)
          setDraft((current) => ({ ...current, workoutPlanId: plan?.id ?? null, planNameSnapshot: plan?.nameSnapshot ?? null }))
        }}><option value="">{labels.noPlan}</option>{draft.workoutPlanId && !plans.some((plan) => plan.id === draft.workoutPlanId) && <option value={draft.workoutPlanId}>{draft.planNameSnapshot}</option>}
          {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.nameSnapshot}</option>)}</select></label>
        <p id={planDescriptionId} className="break-words text-[13px] text-muted">{draft.planNameSnapshot ? `${labels.savedName}: ${draft.planNameSnapshot}` : labels.noPlan}</p>
      </>}
      {draft.kind === 'club' && <>
        <div className="grid grid-cols-2 gap-2"><label className="space-y-1 text-sm text-muted">{labels.from}<input type="time" value={draft.startTime} className={input} onChange={(event) => set('startTime', event.target.value)} /></label>
          <label className="space-y-1 text-sm text-muted">{labels.to}<input type="time" value={draft.endTime} className={input} onChange={(event) => set('endTime', event.target.value)} /></label></div>
        <fieldset><legend className={legend}>{labels.parts} {labels.optional}</legend>
          <div className="flex flex-wrap gap-1.5">{MANUAL_WORKOUT_PARTS.map((part) => <MultiChoiceChip as="button" key={part} aria-pressed={draft.parts.includes(part)} onClick={() => set('parts', draft.parts.includes(part) ? draft.parts.filter((entry) => entry !== part) : [...draft.parts, part])}>{manualPartLabel(part)}</MultiChoiceChip>)}</div>
        </fieldset>
        <label className="space-y-1 text-sm text-muted">{labels.clubName} {labels.optional}<input type="text" maxLength={100} value={draft.clubName} placeholder={labels.clubPlaceholder} className={input} onChange={(event) => set('clubName', event.target.value)} /></label>
      </>}
      {!recurring && <Switch checked={repeat} onChange={(event) => setRepeat(event.target.checked)} description={labels.repeatHint} className="border-t border-bd pt-2.5">{labels.repeat}</Switch>}
    </fieldset>
    {error && <p role="alert" className="text-sm text-crimson-ink">{error}</p>}
    <button type="submit" disabled={saving} className={getButtonClassName({ disabled: saving, className: 'min-h-[52px] w-full tracking-wider' })}>{labels.save}</button>
  </form>
}
