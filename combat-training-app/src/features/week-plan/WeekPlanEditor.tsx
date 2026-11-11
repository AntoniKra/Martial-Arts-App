import { useId, useRef, useState } from 'react'
import { useWorkoutData } from '@/application/workoutDataContext'
import { selectWeekPlan } from '@/application/week-plan/selectWeekPlan'
import type { WeekPlan, WeekPlanItem } from '@/domain/week-plan/weekPlan.types'
import { WEEK_PLAN_ITEM_LIMIT } from '@/domain/week-plan/weekPlan.types'
import { copyWeekPlanItems, editWeekPlan } from '@/domain/week-plan/editWeekPlan'
import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { UnsavedPlanChangesGuard } from '@/features/workout-builder/components/UnsavedPlanChangesGuard'
import { WeekPlanDataMessage } from './WeekPlanSummary'
import { categoryLabel, WEEK_PLAN_CATEGORIES, weekItemLabel, weekPlanLabels as labels } from './weekPlanLabels'

const selectClass = 'min-h-touch w-full min-w-0 border border-bd bg-bg px-3 py-2 text-base text-ink'

export function WeekPlanEditor({ weekStart, initial, onClose }: { weekStart: string; initial: WeekPlan | undefined; onClose: (saved: boolean) => void }) {
  const { plans, weekPlans, weekPlanRepository } = useWorkoutData()
  const [baseline] = useState(() => initial)
  const [items, setItems] = useState<WeekPlanItem[]>(() => structuredClone(initial?.items ?? []))
  const [choice, setChoice] = useState('c:bag')
  const [copyIds, setCopyIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const allowLeaveRef = useRef(false)
  const descriptionBaseId = useId()
  const selected = selectWeekPlan(weekPlans, weekStart)
  const source = selectWeekPlan(weekPlans, shiftCalendarDate(weekStart, -7))
  const libraryReady = plans.status === 'ready' && (plans.complete === true || !plans.fromCache) && !plans.invalidDocumentIds.length
  const dirty = JSON.stringify(items) !== JSON.stringify(baseline?.items ?? [])
  const unchanged = selected.status === 'ready' && JSON.stringify(selected.plan) === JSON.stringify(baseline)

  function choiceLabel(value: string) {
    const category = WEEK_PLAN_CATEGORIES.find((entry) => `c:${entry}` === value)
    if (category) return categoryLabel(category)
    return plans.items.find((entry) => `p:${entry.id}` === value)?.nameSnapshot ?? ''
  }

  function itemFor(value: string, id: string): WeekPlanItem | null {
    const category = WEEK_PLAN_CATEGORIES.find((entry) => `c:${entry}` === value)
    if (category) return { id, kind: 'category', category }
    const plan = plans.items.find((entry) => `p:${entry.id}` === value)
    return plan && libraryReady ? { id, kind: 'plan', workoutPlanId: plan.id, planNameSnapshot: plan.nameSnapshot } : null
  }

  function options() {
    return <>
      <optgroup label="Rodzaj treningu">{WEEK_PLAN_CATEGORIES.map((category) => <option key={category} value={`c:${category}`}>{categoryLabel(category)}</option>)}</optgroup>
      {libraryReady && <optgroup label="Plany treningowe">{plans.items.map((plan) => <option key={plan.id} value={`p:${plan.id}`}>{plan.nameSnapshot}</option>)}</optgroup>}
    </>
  }

  async function save() {
    if (!dirty || saving) return
    if (!unchanged) { setError(labels.changed); return }
    setSaving(true)
    setError(null)
    try {
      await weekPlanRepository.save(editWeekPlan(weekStart, items, selected.plan, new Date()))
      allowLeaveRef.current = true
      onClose(true)
    } catch { setError(labels.failed) } finally { setSaving(false) }
  }

  return <UnsavedPlanChangesGuard isDirty={dirty} allowLeaveRef={allowLeaveRef}>
    <form aria-label={labels.edit} className="space-y-5 border border-bd bg-surface p-4" onSubmit={(event) => { event.preventDefault(); void save() }}>
      <h2 className="font-display text-xl font-semibold">{labels.edit}</h2>
      {selected.status !== 'ready' && <WeekPlanDataMessage status={selected.status} />}
      {!unchanged && selected.status === 'ready' && <p role="alert" className="text-sm text-crimson-ink">{labels.changed}</p>}
      {error && <p role="alert" className="text-sm text-crimson-ink">{error}</p>}
      {!libraryReady && <p className="text-sm text-muted">{labels.libraryUnavailable}</p>}
      <fieldset disabled={saving} className="min-w-0 space-y-4">
        <legend className="text-sm text-muted">Pozycje: {items.length} / {WEEK_PLAN_ITEM_LIMIT}</legend>
        {!items.length && <p className="text-sm text-muted">{(baseline?.items.length ?? 0) > 0 ? labels.removedGoal : labels.noItems}</p>}
        <ol className="space-y-3">{items.map((item, index) => {
          const value = item.kind === 'plan' ? `p:${item.workoutPlanId}` : `c:${item.category}`
          const unavailable = item.kind === 'plan' && (!libraryReady || !plans.items.some((plan) => plan.id === item.workoutPlanId))
          const descriptionId = `${descriptionBaseId}-item-${item.id}`
          const snapshotName = weekItemLabel(item)
          const selectedName = unavailable && item.kind === 'plan' ? `${item.planNameSnapshot} · ${labels.unavailable}` : choiceLabel(value) || snapshotName
          const renamed = !unavailable && selectedName !== snapshotName
          return <li key={item.id} className="space-y-2 border-b border-bd pb-3">
            {renamed && <p className="break-words text-sm text-muted">{index + 1}. {labels.savedName}: {snapshotName}</p>}
            <p id={descriptionId} className="break-words text-sm">{renamed ? selectedName : `${index + 1}. ${selectedName}`}</p>
            <label className="block text-sm">Zastąp pozycję {index + 1}
              <select aria-label={`Zastąp pozycję ${index + 1}`} aria-describedby={descriptionId} className={selectClass} value={value} onChange={(event) => {
                const replacement = itemFor(event.target.value, item.id)
                if (replacement) setItems(items.map((entry) => entry.id === item.id ? replacement : entry))
              }}>{unavailable && <option value={value}>{item.kind === 'plan' ? item.planNameSnapshot : ''} · {labels.unavailable}</option>}{options()}</select>
            </label>
            <button type="button" className={getButtonClassName({ variant: 'ghost' })} aria-label={`Usuń pozycję ${index + 1}`} onClick={() => setItems(items.filter((entry) => entry.id !== item.id))}>Usuń</button>
          </li>
        })}</ol>
        <div className="space-y-2">
          <label className="block space-y-2 text-sm">{labels.choose}<select aria-label={labels.choose} aria-describedby={`${descriptionBaseId}-choice`} className={selectClass} value={choice} onChange={(event) => setChoice(event.target.value)}>{options()}</select></label>
          <p id={`${descriptionBaseId}-choice`} className="break-words text-sm">{choiceLabel(choice)}</p>
        </div>
        <button type="button" className={getButtonClassName({ variant: 'secondary' })} onClick={() => {
          if (items.length >= WEEK_PLAN_ITEM_LIMIT) { setError(labels.limit); return }
          const added = itemFor(choice, crypto.randomUUID())
          if (added) { setItems([...items, added]); setError(null) }
        }}>{labels.add}</button>
        <details className="border-t border-bd pt-3">
          <summary className="min-h-touch cursor-pointer py-3 font-display font-semibold">{labels.copy}</summary>
          <p className="text-sm text-muted">{labels.copyHint}</p>
          {source.status !== 'ready' ? <WeekPlanDataMessage status={source.status} /> : !source.plan?.items.length ? <p className="py-3 text-sm text-muted">{labels.noCopy}</p> : <div className="space-y-2">
            <button type="button" className={getButtonClassName({ variant: 'ghost' })} onClick={() => setCopyIds(source.plan?.items.map((item) => item.id) ?? [])}>{labels.selectAll}</button>
            {source.plan.items.map((item, index) => <label key={item.id} className="flex min-h-touch items-center gap-3 text-sm">
              <input type="checkbox" checked={copyIds.includes(item.id)} onChange={(event) => setCopyIds(event.target.checked ? [...copyIds, item.id] : copyIds.filter((id) => id !== item.id))} />
              <span className="break-words">{index + 1}. {weekItemLabel(item)}</span>
            </label>)}
            <button type="button" disabled={!copyIds.length} className={getButtonClassName({ variant: 'secondary', disabled: !copyIds.length })} onClick={() => {
              try {
                setItems(copyWeekPlanItems(items, source.plan?.items.filter((item) => copyIds.includes(item.id)) ?? [], () => crypto.randomUUID()))
                setCopyIds([]); setError(null)
              } catch { setError(labels.limit) }
            }}>{labels.copySelected}</button>
          </div>}
        </details>
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={!dirty || !unchanged || saving} className={getButtonClassName({ disabled: !dirty || !unchanged || saving })}>{labels.save}</button>
        <button type="button" disabled={saving} className={getButtonClassName({ variant: 'ghost', disabled: saving })} onClick={() => {
          if (!dirty || window.confirm('Porzucić niezapisane zmiany planu tygodnia?')) onClose(false)
        }}>{labels.cancel}</button>
      </div>
    </form>
  </UnsavedPlanChangesGuard>
}
