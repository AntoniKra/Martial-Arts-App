import { useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import { useWorkoutData } from '@/application/workoutDataContext'
import { selectWeekPlan } from '@/application/week-plan/selectWeekPlan'
import { calculateWeeklySummary } from '@/domain/weekly-summary/weeklySummary'
import { calculateScheduledWeek } from '@/domain/week-plan/scheduledWeek'
import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'
import { useProfileToday } from '@/features/profile/useProfileToday'
import { profileDataUnavailable } from '@/features/profile/profileDataUnavailable'
import { ProfileDataState } from '@/features/profile/ProfileDataState'
import { calculateSevenDayWeight, hasValidHealthConsent } from '@/domain/profile/bodyWeight'
import { wellbeingBaseline } from '@/domain/wellbeing/wellbeing'
import { hasWellbeingConsent } from '@/domain/wellbeing/wellbeingConsent'
import { BodyWeightSection } from '@/features/profile/BodyWeightSection'
import { WellbeingProgressCard } from '@/features/wellbeing/WellbeingProgressCard'
import { WeeklySummary } from '@/features/weekly-summary/WeeklySummary'
import { ProfileStatistics } from '@/features/profile/ProfileStatistics'
import { ProgressWeeksChart } from './ProgressWeeksChart'
import { sparringOverview, typicalProgress, weekTarget } from '@/domain/weekly-summary/progressOverview'
import { WeekDayIndicator } from '@/components/domain/WeekDayIndicator'
import { weekDayState } from '@/components/domain/weekDayPresentation'
import { weekdays } from '@/features/week-plan/scheduleLabels'
import { progressLabels as labels } from './progressLabels'
import { weekSummaryTile } from './progressPresentation'
import { ProgressMoreIcon, type ProgressMoreIconKind } from './ProgressMoreIcon'

function MoreTile({ kind, title, value, hint, children }: {
  kind: ProgressMoreIconKind; title: string; value: string; hint: string; children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return <div className="min-w-0 rounded-sm border border-bd bg-surface">
    <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}
      className="motion-press flex min-h-touch w-full items-center gap-2.5 px-3.5 py-3 text-left hover:bg-elevated">
      <ProgressMoreIcon kind={kind} />
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[13.5px] font-bold">{title}</span>
        <span className="block text-[11px] text-muted">{hint}</span>
      </span>
      <strong className={`shrink-0 text-right font-display font-extrabold tabular-nums ${value === labels.noData ? 'text-sm text-muted' : 'text-base'}`}>{value}</strong>
    </button>
    <div id={id} hidden={!open} className="space-y-4 border-t border-bd p-3">{open && children}</div>
  </div>
}

export function ProgressOverview() {
  const { sessions, weekPlans, currentWeek, retrySessions } = useWorkoutData()
  const today = useProfileToday()
  const unavailable = profileDataUnavailable(sessions)
  const selected = selectWeekPlan(weekPlans, currentWeek)
  if (unavailable) return <ProfileDataState state={unavailable} retry={retrySessions} />
  const summary = calculateWeeklySummary(currentWeek, sessions.items)
  const target = selected.status === 'ready' ? weekTarget(selected.plan) : null
  const schedule = selected.status === 'ready' && selected.plan ? calculateScheduledWeek(selected.plan, sessions.items, today) : null
  const planTile = weekSummaryTile(summary.workoutCount, target, schedule)
  const rounds = sparringOverview(sessions.items, currentWeek, shiftCalendarDate(currentWeek, 6))
  const planLabel = planTile.target === null ? labels.weeklyWorkouts : labels.weekPlan
  const planValue = planTile.target === null ? planTile.count.toLocaleString('pl-PL') : labels.planCount(planTile.count, planTile.target)
  const planPercent = schedule?.percentage ?? (planTile.target ? Math.min(100, planTile.count / planTile.target * 100) : 0)
  return <>
    <section aria-label={labels.weeklyNumbers}>
      <div className="progress-summary">
        <dl className="progress-summary-plan">
          <dt className="text-[11px] font-bold uppercase text-muted">{planLabel}</dt>
          <dd className="flex flex-1 flex-col justify-between">
            <span className="mt-0.5 font-display text-[26px] leading-[1.1] font-extrabold tabular-nums">{planValue}</span>
            {planTile.target !== null && <div role="progressbar" aria-label={labels.weekPlan} aria-valuemin={0} aria-valuemax={planTile.target}
              aria-valuenow={Math.min(planTile.count, planTile.target)} aria-valuetext={planValue} className="progress-summary-track">
              <div style={{ width: `${planPercent}%` }} />
            </div>}
          </dd>
        </dl>
        <div className="progress-summary-side">
          <dl className="progress-summary-mini">
            <dt>{labels.minutes}</dt><dd>{Math.ceil(summary.durationSeconds / 60).toLocaleString('pl-PL')}</dd>
          </dl>
          <dl className="progress-summary-mini">
            <dt>{labels.sparringRounds}</dt><dd>{`${rounds.unknown ? '≥ ' : ''}${rounds.rounds}`}</dd>
          </dl>
        </div>
      </div>
      {rounds.unknown > 0 && <p className="mt-2 text-xs text-muted">{labels.unknownRounds(rounds.unknown)}</p>}
    </section>
    <section aria-label={labels.week}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-extrabold">{labels.week}</h2>
        <Link to={routes.weekPlan(currentWeek)} className="inline-flex min-h-touch items-center text-[13px] text-muted hover:text-ink">{labels.weekPlan} ›</Link>
      </div>
      {selected.status !== 'ready' && <p role="status" className="text-sm text-muted">Plan tygodnia jest niedostępny.</p>}
      <div className="progress-week-ribbon">{weekdays.map(({ short, name }, index) => {
        const date = shiftCalendarDate(currentWeek, index)
        const trained = sessions.items.some((session) => session.workoutDate === date)
        const planned = schedule?.matches.some(({ item }) => item.day === index && item.kind !== 'rest' && !item.omitted)
        const missed = schedule?.matches.some(({ item, status }) => item.day === index && (status === 'omitted' || status === 'missed'))
        return <WeekDayIndicator key={date} short={index === 5 ? 'So' : short} name={name} today={date === today}
          state={weekDayState({ done: trained, planned: !!planned, missed: !!missed, available: selected.status === 'ready' })} />
      })}</div>
    </section>
    <ProgressWeeksChart />
  </>
}

export function ProgressMore() {
  const { sessions, currentWeek, profile, bodyWeights, wellbeing } = useWorkoutData()
  const today = useProfileToday()
  const athlete = profile.items[0]
  const ready = !profileDataUnavailable(sessions)
  const summary = calculateWeeklySummary(currentWeek, sessions.items)
  const sparring = sparringOverview(sessions.items, shiftCalendarDate(today, -27), today)
  const typical = ready ? typicalProgress(sessions.items, currentWeek) : null
  const weight = calculateSevenDayWeight(bodyWeights.items, today)
  const lastWellbeing = [...wellbeing.items].filter((entry) => entry.date <= today).sort((a, b) => b.date.localeCompare(a.date))[0]
  const baseline = lastWellbeing && !profileDataUnavailable(wellbeing) ? wellbeingBaseline(wellbeing.items, lastWellbeing.date, lastWellbeing.questionsVersion) : null
  const loadHint = [typical?.load != null ? `zwykle ok. ${Math.round(typical.load).toLocaleString('pl-PL')}` : 'sRPE × min · ten tydzień',
    ready && summary.rpeCount < summary.workoutCount ? `RPE w ${summary.rpeCount} z ${summary.workoutCount} · suma tylko z RPE` : null].filter(Boolean).join(' · ')
  return <section aria-label={labels.more} className="space-y-2">
    <h2 className="font-display text-base font-extrabold">{labels.more}</h2>
    <div className="space-y-1.5">
      <MoreTile kind="sparring" title={labels.sparring} value={ready ? `${sparring.unknown ? '≥ ' : ''}${sparring.rounds} rund` : labels.noData} hint={ready ? labels.sparringWorkouts(sparring.workouts) : labels.historyUnavailable}>
        {sparring.unknown > 0 && <p className="text-sm text-muted">{labels.unknownRounds(sparring.unknown)}</p>}
        <WeeklySummary weekStart={currentWeek} showTrends={false} /><ProfileStatistics today={today} recentOnly />
      </MoreTile>
      <MoreTile kind="load" title={labels.trainingLoad} value={ready && summary.load.units !== null ? Math.round(summary.load.units).toLocaleString('pl-PL') : labels.noData}
        hint={loadHint}>
        <WeeklySummary weekStart={currentWeek} showTrends={false} />
      </MoreTile>
      {profile.status === 'ready' && hasWellbeingConsent(athlete) && <MoreTile kind="wellbeing" title={labels.wellbeing}
        value={profileDataUnavailable(wellbeing) ? labels.noData : `${Math.min(14, baseline?.count ?? 0)}/14`}
        hint={baseline?.norms.sleep ? 'wpisów · norma dostępna' : 'wpisów do normy · wymagane 21 dni'}><WellbeingProgressCard /></MoreTile>}
      {profile.status === 'ready' && athlete && hasValidHealthConsent(athlete) && <MoreTile kind="weight" title={labels.bodyWeight}
        value={!profileDataUnavailable(bodyWeights) && weight.averageKg !== null ? `${weight.averageKg.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg` : labels.noData}
        hint="średnia krocząca 7 dni"><BodyWeightSection today={today} profile={athlete} /></MoreTile>}
    </div>
  </section>
}
