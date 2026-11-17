import { ScreenHeader } from '@/components/ScreenHeader'
import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import { useWorkoutData } from '@/application/workoutDataContext'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import { selectAvailableFocusSkills } from '@/domain/focus-skill/focusSkillSelectors'
import { selectFocusSkillAssessments } from '@/domain/focus-skill/focusSkillProgress'
import { ProgressDataState, ProgressDataWarning } from '@/features/progress/ProgressDataState'
import { progressLabels as labels } from '@/features/progress/progressLabels'
import { ProgressOverview, ProgressMore } from '@/features/progress/ProgressOverview'
import { AddFocusSkill } from '@/features/focus-skills/AddFocusSkill'
import { focusCardSummary, latestCorrection } from '@/domain/weekly-summary/progressOverview'
import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'

function SkillCard({ skill }: { skill: FocusSkill }) {
  const { sessions, focusSkills } = useWorkoutData()
  const summary = focusCardSummary(selectFocusSkillAssessments(skill, sessions.items))
  return <li><Link to={routes.focusSkillProgress(skill.id)} className="block min-h-touch space-y-2 border border-bd bg-surface p-4 hover:bg-elevated">
    <div className="flex items-start justify-between gap-3"><div><h3 className="break-words font-display text-[15px] font-bold">{skill.name}</h3>
    <p className="break-words text-sm text-muted">{skill.criterion}</p></div>
    {summary.value !== null && <p className="shrink-0 font-display text-[28px] font-extrabold tabular-nums">{summary.value}<span className="text-sm text-muted">/5</span></p>}</div>
    {summary.value === null ? <div className="flex items-center gap-2.5 rounded-sm border border-dashed border-bd bg-elevated px-3 py-2.5">
      <svg aria-hidden="true" className="size-[18px] shrink-0 text-crimson-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>
      <div><p className="text-sm font-bold">{labels.notRatedYet}</p><p className="text-xs text-muted">{labels.rateAfterWorkout}</p></div>
    </div> : <>
      <div aria-hidden="true" className="grid grid-cols-5 gap-[3px]">{[1, 2, 3, 4, 5].map((value) => <span key={value} className={`h-2 rounded-[1px] ${summary.value !== null && value <= summary.value ? 'accent-fill' : 'bg-bd'}`} />)}</div>
      <div className="flex flex-wrap justify-between gap-2 text-xs text-muted"><p>{summary.recent.length ? `ostatnio: ${summary.recent.join(' → ')}` : labels.noRatings}</p>
      {summary.trend && <p className={`status-badge ${summary.trend.startsWith('↑') ? 'is-improved' : 'is-neutral'}`}>{summary.trend}</p>}</div>
    </>}
    {focusSkills.pendingIds.has(skill.id) && <p className="text-xs text-muted">{workoutDataLabels.pending}</p>}
  </Link></li>
}

export function Component() {
  const { focusSkills, sessions, plans, currentWeek, weekPlans } = useWorkoutData()
  const ready = focusSkills.status === 'ready' && sessions.status === 'ready' && focusSkills.complete && sessions.complete && !focusSkills.invalidDocumentIds.length && !sessions.invalidDocumentIds.length
  const correction = ready ? latestCorrection(sessions.items) : null
  const active = selectAvailableFocusSkills(focusSkills.items)
  const archived = focusSkills.items.filter((skill) => skill.archivedAt !== null).sort((a, b) => a.name.localeCompare(b.name, 'pl'))
  return <div className="space-y-[18px] px-4 pb-6 pt-14 md:px-0 md:pt-0">
    <ScreenHeader variant="main" title={labels.title} subtitle={<>{new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', timeZone: 'UTC' }).formatRange(new Date(`${currentWeek}T12:00:00Z`), new Date(`${shiftCalendarDate(currentWeek, 6)}T12:00:00Z`))} · ten tydzień</>} />
    <ProgressOverview />
    {plans.hasPendingWrites || focusSkills.hasPendingWrites || sessions.hasPendingWrites || weekPlans.hasPendingWrites ? <p role="status" className="text-sm text-muted">{workoutDataLabels.pending}</p> : null}
    <ProgressDataWarning />
    {!ready ? <ProgressDataState /> : <section aria-labelledby="focus-skills-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-2"><h2 id="focus-skills-heading" className="font-display text-lg font-bold">{labels.skills}</h2><AddFocusSkill /></div>
      {focusSkills.items.length === 0 ? <div className="space-y-4 border border-bd bg-surface p-4">
        <p className="text-sm leading-relaxed text-muted">{labels.empty}</p>
      </div> : active.length === 0 ? <p className="text-sm text-muted">{labels.noActiveSkills}</p>
        : <ul className="space-y-3">{active.map((skill) => <SkillCard key={skill.id} skill={skill} />)}</ul>}
      {archived.length > 0 && <details className="border-t border-bd pt-2">
        <summary className="min-h-touch cursor-pointer py-3 font-display font-semibold">{labels.archived} ({archived.length})</summary>
        <ul className="mt-2 space-y-3">{archived.map((skill) => <SkillCard key={skill.id} skill={skill} />)}</ul>
      </details>}
      {correction && <Link to={correction.source === 'manual' ? routes.editManualWorkout(correction.sessionId) : routes.workoutFeedback(correction.sessionId)} className="block space-y-1 border border-bd bg-surface p-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Ostatnia notatka · {Number(correction.workoutDate.slice(8))}.{correction.workoutDate.slice(5, 7)}</p>
        <p className="break-words text-sm">„{correction.problem}” → <strong>{correction.fix}</strong></p>
      </Link>}
    </section>}
    <ProgressMore />
  </div>
}
