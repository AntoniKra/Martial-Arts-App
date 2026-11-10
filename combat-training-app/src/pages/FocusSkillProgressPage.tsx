import { Link, useParams } from 'react-router-dom'
import { routes } from '@/app/routes'
import { useWorkoutData } from '@/application/workoutDataContext'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { selectFocusSkillAssessments, summarizeFocusSkill } from '@/domain/focus-skill/focusSkillProgress'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import { CorrectionNote } from '@/features/workout-feedback/CorrectionNote'
import { FocusSkillChart, PlaceMarker } from '@/features/progress/FocusSkillChart'
import { FocusSkillActions } from '@/features/progress/FocusSkillActions'
import { ProgressDataState, ProgressDataWarning } from '@/features/progress/ProgressDataState'
import { formatProgressDate, progressLabels as labels } from '@/features/progress/progressLabels'

export function Component() {
  const { focusSkillId = '' } = useParams()
  const { focusSkills, sessions } = useWorkoutData()
  const ready = focusSkills.status === 'ready' && sessions.status === 'ready'
  const skill = focusSkills.items.find((value) => value.id === focusSkillId)
  const assessments = skill ? selectFocusSkillAssessments(skill, sessions.items) : []
  const summary = summarizeFocusSkill(assessments)
  return <div className="space-y-6 px-4 py-6 md:px-0">
    <Link to={routes.progress} className="inline-flex min-h-touch items-center gap-1 text-sm text-muted"><span aria-hidden="true">←</span>{labels.back}</Link>
    {!ready ? <ProgressDataState /> : !skill ? <h1 className="font-display text-xl font-bold">{labels.notFound}</h1> : <>
      <header className="space-y-2">
        <h1 className="break-words font-display text-2xl font-bold">{skill.name}</h1>
        <p className="break-words text-sm leading-relaxed text-muted">{skill.criterion}</p>
        {skill.archivedAt !== null && <p className="inline-block border border-bd px-2 py-1 text-xs">{labels.archived}</p>}
        {focusSkills.pendingIds.has(skill.id) && <p role="status" className="text-xs text-muted">{workoutDataLabels.pending}</p>}
      </header>
      <ProgressDataWarning />
      {skill.openCorrection && <CorrectionNote correction={skill.openCorrection} />}
      <FocusSkillChart assessments={assessments} />
      <section aria-labelledby="summary-heading" className="space-y-4">
        <h2 id="summary-heading" className="font-display text-xl font-semibold">{labels.summary}</h2>
        {summary.places.length === 0 && <p className="text-sm text-muted">{labels.noRatings}</p>}
        {summary.places.map((place) => <div key={place.blockType} className="space-y-2 border border-bd bg-surface p-4 text-sm">
          <h3 className="font-display font-semibold"><PlaceMarker place={place.blockType} /></h3>
          <p>{place.count === 1 ? labels.single(Number(place.ratings[0].assessment), place.ratings[0].workoutDate)
            : place.count === 2 ? labels.pair(place.recent) : labels.median(place.median ?? 0, place.count)}</p>
          {place.count >= 3 && <p className="text-muted">{labels.recent(place.recent)}</p>}
          {place.earlier.length > 0 && <p className="text-muted">{labels.earlier(place.earlier)}</p>}
        </div>)}
        {summary.unableToRateCount > 0 && <p className="text-sm text-muted">{labels.unableCount(summary.unableToRateCount)}</p>}
        {summary.previousCriterionCount > 0 && <p className="text-sm text-muted">{labels.previousCount(summary.previousCriterionCount)}</p>}
      </section>
      <section aria-labelledby="ratings-heading" className="space-y-3">
        <h2 id="ratings-heading" className="font-display text-xl font-semibold">{labels.allRatings}</h2>
        <ul className="space-y-2">{[...assessments].reverse().map((rating, index) => <li key={`${rating.sessionId}-${rating.workoutItemId}-${index}`}>
          <Link to={routes.workoutFeedback(rating.sessionId)} className="block min-h-touch space-y-1 border border-bd bg-surface p-3 text-sm hover:bg-elevated">
            <p>{formatProgressDate(rating.workoutDate)} · {getWorkoutBlockLabelPl(rating.blockType)} · <strong>{rating.assessment === 'unableToRate' ? labels.unable : rating.assessment}</strong></p>
            <p className="break-words text-muted">{rating.planName}</p>
            {!rating.currentCriterion && <p className="text-xs text-muted">{labels.previous}</p>}
          </Link>
        </li>)}</ul>
      </section>
      <FocusSkillActions skill={skill} />
    </>}
  </div>
}
