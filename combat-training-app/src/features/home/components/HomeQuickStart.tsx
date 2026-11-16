import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import { PlayIcon } from '@/components/icons/PlayIcon'
import { formatPolishCount } from '@/domain/language/polishPlural'
import type { FeaturedWorkoutPlanLoadState } from '../types/homeView.types'
import { homeCardDate, homeLabels as labels } from '../homeLabels'
import { StormDecoration } from './StormDecoration'
import { homePrimaryButton, homeSecondaryButton, homeSectionLabel } from './HomeScheduleCards'

export function HomeQuickStart({ state, today, timerLabel, onRetry }: { state: FeaturedWorkoutPlanLoadState; today: string; timerLabel: string; onRetry: () => void }) {
  const plan = state.status === 'success' ? state.plan : null
  return <section aria-label={labels.quickStart} className="storm-card flex flex-col">
    <StormDecoration />
    {/* Reserve the same reachable primary-action position as the today card. */}
    <div className="flex min-h-[366px] flex-col gap-2 px-4 pb-3 pt-[18px] md:min-h-0">
      <p className={`${homeSectionLabel} text-crimson-ink`}>{homeCardDate(today)}</p>
      <h2 className={homeSectionLabel}>{labels.quickStart}</h2>
      {plan ? <>
        <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-crimson-ink">{labels.discipline(plan.disciplineKey)} · {labels.activePlan}</p>
        <h3 className="storm-copy break-words font-display text-[30px] font-extrabold leading-[1.05]">{plan.name}</h3>
        <p className="storm-copy text-sm tabular-nums text-muted">{formatPolishCount(plan.blockCount, 'blok', 'bloki', 'bloków')} · {formatPolishCount(plan.roundCount, 'runda', 'rundy', 'rund')} · {plan.estimatedDurationLabelPl}</p>
      </> : state.status === 'loading' ? <p role="status" className="text-sm text-muted">{labels.loadingPlan}</p>
        : state.status === 'error' ? <div role="alert" className="text-sm text-muted"><p>{state.message}</p><button type="button" onClick={onRetry} className={homeSecondaryButton}>{labels.retry}</button></div>
          : <p className="text-sm text-muted">{labels.emptyHint}</p>}
    </div>
    {state.status === 'success' && <Link to={plan ? routes.workoutActive(plan.id) : routes.newWorkout} className={`${homePrimaryButton} mx-4`}><PlayIcon className="h-4 w-4" />{plan ? labels.startPlan : labels.createPlan}</Link>}
    <div className="grid grid-cols-2 gap-2 px-4 pb-4 pt-2">
      <Link to={routes.quickTimer} className={`${homeSecondaryButton} min-h-[52px] flex-col gap-0.5 py-2 text-center text-sm`}>{labels.timer}<span className="text-xs font-medium tabular-nums text-muted">{timerLabel}</span></Link>
      <Link to={routes.newManualWorkout} state={{ returnTo: routes.home }} className={`${homeSecondaryButton} min-h-[52px] flex-col gap-0.5 py-2 text-center text-sm`}>{labels.clubWorkout}<span className="text-xs font-medium text-muted">{labels.afterClass}</span></Link>
    </div>
    <Link to={routes.workouts} className="flex min-h-touch items-center justify-between border-t border-bd px-4 py-3.5 text-sm text-muted">{labels.allPlans}<span aria-hidden="true">›</span></Link>
  </section>
}
