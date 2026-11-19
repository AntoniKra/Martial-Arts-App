import { useId } from 'react'
import { HomeCardDate } from './HomeCardDate'
import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import { HomeActionIcon } from './HomeActionIcon'
import { formatPolishCount } from '@/domain/language/polishPlural'
import type { FeaturedWorkoutPlanLoadState } from '../types/homeView.types'
import { homeLabels as labels } from '../homeLabels'
import { StormDecoration } from './StormDecoration'
import { HomeParameterChip } from './HomeParameterChip'
import { homePrimaryButton, homeSecondaryButton } from './HomeScheduleCards'

export function HomeQuickStart({ state, today, onRetry }: { state: FeaturedWorkoutPlanLoadState; today: string; onRetry: () => void }) {
  const descriptionId = useId()
  const plan = state.status === 'success' ? state.plan : null
  return <section aria-label={labels.quickStart} className="storm-card home-main-card">
    <StormDecoration />
    <div className="home-card-meta">
      <HomeCardDate date={today} />
      {plan && <span className="home-plan-badge">{labels.activePlan}</span>}
    </div>
    <div>
      <h2 className="home-workout-name">{plan ? plan.name : labels.quickStart}</h2>
      {plan && <p className="home-workout-sub">{labels.discipline(plan.disciplineKey)}</p>}
    </div>
    {plan ? <div className="home-param-chips">
        {plan.parameterChips.map((chip, index) => <HomeParameterChip key={chip} kind={index === 0 ? 'rounds' : 'rest'}>{chip}</HomeParameterChip>)}
        <HomeParameterChip kind="clock">{plan.estimatedDurationLabelPl}</HomeParameterChip>
        <HomeParameterChip kind="blocks">{formatPolishCount(plan.blockCount, 'blok', 'bloki', 'bloków')}</HomeParameterChip>
    </div> : state.status === 'loading' ? <p role="status" className="text-sm text-muted">{labels.loadingPlan}</p>
      : state.status === 'error' ? <div role="alert" className="text-sm text-muted"><p>{state.message}</p><button type="button" onClick={onRetry} className={homeSecondaryButton}>{labels.retry}</button></div>
        : <p className="home-workout-sub">{labels.quickStartHint}</p>}
    <div className="home-card-actions">
      <span id={descriptionId} className="sr-only">{plan ? labels.discipline(plan.disciplineKey) : labels.quickStartHint}</span>
      {state.status === 'success' && <Link aria-describedby={descriptionId} to={plan ? routes.workoutActive(plan.id) : routes.newWorkout} className={homePrimaryButton}><HomeActionIcon kind="start" />{plan ? labels.startPlan : labels.createPlan}</Link>}
      <div className="home-action-tiles">
        <Link to={routes.quickTimer} className="home-secondary-action"><span className="home-tile-icon"><HomeActionIcon kind="timer" /></span><span>{labels.timer}</span></Link>
        <Link to={routes.newManualWorkout} state={{ returnTo: routes.home }} className="home-secondary-action"><span className="home-tile-icon"><HomeActionIcon kind="entry" /></span><span>{labels.clubWorkout}</span></Link>
      </div>
    </div>
  </section>
}
