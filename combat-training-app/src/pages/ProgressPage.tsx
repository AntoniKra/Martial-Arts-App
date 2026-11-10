import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import { useWorkoutData } from '@/application/workoutDataContext'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import { selectAvailableFocusSkills } from '@/domain/focus-skill/focusSkillSelectors'
import { selectFocusSkillAssessments, summarizeFocusSkill } from '@/domain/focus-skill/focusSkillProgress'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import { ProgressDataState, ProgressDataWarning } from '@/features/progress/ProgressDataState'
import { formatProgressDate, progressLabels as labels } from '@/features/progress/progressLabels'

function SkillCard({ skill }: { skill: FocusSkill }) {
  const { sessions, focusSkills } = useWorkoutData()
  const summary = summarizeFocusSkill(selectFocusSkillAssessments(skill, sessions.items))
  return <li><Link to={routes.focusSkillProgress(skill.id)} className="block min-h-touch space-y-2 border border-bd bg-surface p-4 hover:bg-elevated">
    <h3 className="break-words font-display text-lg font-semibold">{skill.name}</h3>
    <p className="break-words text-sm text-muted">{skill.criterion}</p>
    <p className="text-xs text-muted">{labels.currentCount(summary.count)}</p>
    <p className="text-sm">{summary.latest
      ? `Ostatnia ocena: ${summary.latest.assessment} · ${formatProgressDate(summary.latest.workoutDate)} · ${getWorkoutBlockLabelPl(summary.latest.blockType)}`
      : labels.noRatings}</p>
    {focusSkills.pendingIds.has(skill.id) && <p className="text-xs text-muted">{workoutDataLabels.pending}</p>}
  </Link></li>
}

export function Component() {
  const { focusSkills, sessions, plans } = useWorkoutData()
  const ready = focusSkills.status === 'ready' && sessions.status === 'ready'
  const active = selectAvailableFocusSkills(focusSkills.items)
  const archived = focusSkills.items.filter((skill) => skill.archivedAt !== null).sort((a, b) => a.name.localeCompare(b.name, 'pl'))
  return <div className="space-y-6 px-4 py-6 md:px-0">
    <h1 className="font-display text-3xl font-bold">{labels.title}</h1>
    {plans.hasPendingWrites || focusSkills.hasPendingWrites ? <p role="status" className="text-sm text-muted">{workoutDataLabels.pending}</p> : null}
    <ProgressDataWarning />
    {!ready ? <ProgressDataState /> : <section aria-labelledby="focus-skills-heading" className="space-y-4">
      <h2 id="focus-skills-heading" className="font-display text-xl font-semibold">{labels.skills}</h2>
      {focusSkills.items.length === 0 ? <div className="space-y-4 border border-bd bg-surface p-4">
        <p className="text-sm leading-relaxed text-muted">{labels.empty}</p>
        <Link to={routes.newWorkout} className={getButtonClassName()}>{labels.newPlan}</Link>
      </div> : <ul className="space-y-3">{active.map((skill) => <SkillCard key={skill.id} skill={skill} />)}</ul>}
      {archived.length > 0 && <details className="border-t border-bd pt-2">
        <summary className="min-h-touch cursor-pointer py-3 font-display font-semibold">{labels.archived} ({archived.length})</summary>
        <ul className="mt-2 space-y-3">{archived.map((skill) => <SkillCard key={skill.id} skill={skill} />)}</ul>
      </details>}
    </section>}
  </div>
}
