import { useState } from 'react'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { WorkoutListContent } from '@/features/workouts/WorkoutListContent'
import { CollapsibleCard } from '@/components/ui/CollapsibleCard'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Link, useSearchParams } from 'react-router-dom'
import { routes } from '@/app/routes'
import { useWorkoutData } from '@/application/workoutDataContext'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import { selectAvailableFocusSkills } from '@/domain/focus-skill/focusSkillSelectors'
import { selectFocusSkillAssessments } from '@/domain/focus-skill/focusSkillProgress'
import { ProgressDataState, ProgressDataWarning } from '@/features/progress/ProgressDataState'
import { formatProgressDate, progressLabels as labels } from '@/features/progress/progressLabels'
import { latestOpenCorrection } from '@/features/progress/progressPresentation'
import { ProgressOverview, ProgressMore } from '@/features/progress/ProgressOverview'
import { AddFocusSkill } from '@/features/focus-skills/AddFocusSkill'
import { focusCardSummary } from '@/domain/weekly-summary/progressOverview'
import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import '@/features/progress/progress.css'

function SkillStar({ className }: { className: string }) {
  return <svg aria-hidden="true" className={`shrink-0 text-crimson-ink ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
  </svg>
}

function SkillCard({ skill }: { skill: FocusSkill }) {
  const { sessions, focusSkills } = useWorkoutData()
  const summary = focusCardSummary(selectFocusSkillAssessments(skill, sessions.items))
  return <li><Link to={routes.focusSkillProgress(skill.id)} className="motion-press flex min-h-touch flex-col gap-2.5 rounded-sm border border-bd bg-surface p-3.5 hover:bg-elevated">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="break-words font-display text-[15px] leading-[1.2] font-extrabold">{skill.name}</h3>
        <p className="mt-0.5 break-words text-[12.5px] leading-[1.3] text-muted">{skill.criterion}</p>
      </div>
      {summary.value !== null && <p className="shrink-0 font-display text-[26px] leading-none font-black tabular-nums">{summary.value}<span className="text-[13px] font-semibold text-muted">/5</span></p>}
    </div>
    {summary.value === null ? <div className="flex items-center gap-3 rounded-sm border border-dashed border-bd bg-elevated px-3 py-2.5">
      <SkillStar className="size-[18px]" />
      <div><p className="text-[13px] font-bold">{labels.notRatedYet}</p><p className="text-[11.5px] text-muted">{labels.rateAfterWorkout}</p></div>
    </div> : <>
      <div aria-hidden="true" className="grid grid-cols-5 gap-1">{[1, 2, 3, 4, 5].map((value) => <span key={value} className={`h-1.5 rounded-[1px] ${summary.value !== null && value <= summary.value ? 'bg-crimson' : 'bg-bd'}`} />)}</div>
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11.5px] text-muted">
        <p>ostatnio: {summary.recent.join(' → ')}</p>
        {summary.trend && <p className={`progress-skill-trend ${summary.trend.startsWith('↑') ? 'is-improved' : ''}`}>{summary.trend}</p>}
      </div>
    </>}
    {focusSkills.pendingIds.has(skill.id) && <p className="text-xs text-muted">{workoutDataLabels.pending}</p>}
  </Link></li>
}

export function Component() {
  const [params, setParams] = useSearchParams()
  const routeTab = params.get('tab') === 'history' ? 'history' : 'charts'
  const [selection, setSelection] = useState({ routeTab, tab: routeTab })
  // Update the radio immediately while the route transition commits; follow browser Back.
  if (selection.routeTab !== routeTab) setSelection({ routeTab, tab: routeTab })
  const tab = selection.routeTab === routeTab ? selection.tab : routeTab
  const history = tab === 'history'
  const { focusSkills, sessions, plans, currentWeek, weekPlans } = useWorkoutData()
  const ready = focusSkills.status === 'ready' && sessions.status === 'ready' && focusSkills.complete && sessions.complete && !focusSkills.invalidDocumentIds.length && !sessions.invalidDocumentIds.length
  const lastNote = ready ? latestOpenCorrection(focusSkills.items, sessions.items) : null
  const active = selectAvailableFocusSkills(focusSkills.items)
  const archived = focusSkills.items.filter((skill) => skill.archivedAt !== null).sort((a, b) => a.name.localeCompare(b.name, 'pl'))
  return <div className={"space-y-[18px] px-4 pb-6 pt-14 md:px-0 md:pt-0"}>
    <ScreenHeader variant="main" title={labels.title} subtitle={<>{new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', timeZone: 'UTC' }).formatRange(new Date(`${currentWeek}T12:00:00Z`), new Date(`${shiftCalendarDate(currentWeek, 6)}T12:00:00Z`))} · ten tydzień</>} />
    <SegmentedControl ariaLabel={labels.tabs} options={[{ label: labels.charts, value: 'charts' }, { label: labels.history, value: 'history' }]} value={history ? 'history' : 'charts'}
      onChange={(nextTab) => {
        setSelection({ routeTab, tab: nextTab })
        const next = new URLSearchParams(params)
        if (nextTab === 'history') next.set('tab', nextTab)
        else { next.delete('tab'); next.delete('week') }
        setParams(next)
      }} />
    {history ? <WorkoutListContent history /> : <>
    <ProgressOverview />
    {plans.hasPendingWrites || focusSkills.hasPendingWrites || sessions.hasPendingWrites || weekPlans.hasPendingWrites ? <p role="status" className="text-sm text-muted">{workoutDataLabels.pending}</p> : null}
    <ProgressDataWarning />
    {!ready ? <ProgressDataState /> : <section aria-labelledby="focus-skills-heading" className="space-y-2.5">
      <div className="flex items-center justify-between gap-2"><h2 id="focus-skills-heading" className="font-display text-base font-extrabold">{labels.skills}</h2><AddFocusSkill /></div>
      {focusSkills.items.length === 0 ? <div className="flex flex-col items-center gap-2.5 rounded-sm border border-dashed border-bd bg-surface px-4 py-5 text-center">
        <SkillStar className="size-7" />
        <p className="max-w-[280px] text-[13px] leading-[1.45] text-muted">{labels.empty}</p>
        <AddFocusSkill empty />
      </div> : active.length === 0 ? <p className="text-sm text-muted">{labels.noActiveSkills}</p>
        : <ul role="list" className="space-y-2.5">{active.map((skill) => <SkillCard key={skill.id} skill={skill} />)}</ul>}
      {lastNote && <Link to={lastNote.session?.source === 'manual' ? routes.editManualWorkout(lastNote.session.id)
        : lastNote.session?.source === 'plan' ? routes.workoutFeedback(lastNote.session.id) : routes.focusSkillProgress(lastNote.skillId)}
        className="motion-press flex min-h-touch flex-col gap-1 rounded-sm border border-bd bg-surface px-3.5 py-3 hover:bg-elevated">
        <p className="font-display text-[10.5px] font-extrabold tracking-[0.1em] text-muted uppercase">{labels.lastNote} · {formatProgressDate(lastNote.correction.workoutDate, false)}</p>
        <p className="break-words text-[13px] leading-[1.35]">„{lastNote.correction.problem}” → <strong className="text-ember-ink">{lastNote.correction.fix}</strong></p>
      </Link>}
      {archived.length > 0 && <CollapsibleCard title={<>{labels.archived} ({archived.length})</>}>
        <ul className="mt-2 space-y-3">{archived.map((skill) => <SkillCard key={skill.id} skill={skill} />)}</ul>
      </CollapsibleCard>}
    </section>}
    <ProgressMore />
    </>}
  </div>
}
