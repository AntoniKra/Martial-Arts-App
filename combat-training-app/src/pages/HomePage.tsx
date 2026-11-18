import { workoutDataLabels } from '@/application/workoutDataLabels'
import { useWorkoutData } from '@/application/workoutDataContext'
import { HomeView } from '@/features/home/components/HomeView'
import { mapWorkoutPlanToFeaturedPlan } from '@/features/home/mappers/workoutPlanToFeaturedPlan'
import { mapWorkoutSessionToHomeRecentSession } from '@/features/home/mappers/workoutSessionToHomeRecentSession'
import { selectLatestWorkoutPlan } from '@/features/home/utils/selectLatestWorkoutPlan'
import { selectRecentWorkoutSessions } from '@/features/home/utils/selectRecentWorkoutSessions'
import { WorkoutDataWarning } from '@/features/workouts/components/WorkoutDataWarning'
import { RpeReminder } from '@/features/home/components/RpeReminder'
import { useAuth } from '@/features/auth/authContext'
import { WeekPlanDataMessage } from '@/features/week-plan/WeekPlanSummary'
import { lazy, Suspense } from 'react'
import { hasWellbeingConsent } from '@/domain/wellbeing/wellbeingConsent'
import { useProfileToday } from '@/features/profile/useProfileToday'
import { useHomeSchedule } from '@/features/home/useHomeSchedule'
import { HomeTodayCards, HomeOverdueWeek, HomePendingWeek, homeSectionLabel, homeSecondaryButton } from '@/features/home/components/HomeScheduleCards'
import { HomeQuickStart } from '@/features/home/components/HomeQuickStart'
import { HomeWeekCard } from '@/features/home/components/HomeWeekCard'
import { homeLabels } from '@/features/home/homeLabels'
import { calculateWeekPlanProgress } from '@/domain/week-plan/weekPlanProgress'
import { calculateWeeklySummary } from '@/domain/weekly-summary/weeklySummary'
import { createQuickTimerStorage } from '@/infrastructure/storage/quickTimerStorage'
import { defaultQuickTimerDraft } from '@/domain/quick-timer/quickTimer'
import { formatSecondsAsClock } from '@/domain/time/formatDuration'
import { scheduleLabels } from '@/features/week-plan/scheduleLabels'
import { selectWeekPlan } from '@/application/week-plan/selectWeekPlan'

const WellbeingHomeCard = lazy(() => import('@/features/wellbeing/WellbeingHomeCard').then((module) => ({ default: module.WellbeingHomeCard })))

export function HomePage() {
  const { plans, sessions, profile, weekPlans, recurringWeeks, retry, retryRecurringWeeks, retrySessions } = useWorkoutData()
  const { state } = useAuth()
  const uid = state.status === 'ready' ? state.session?.uid : undefined
  const latest = selectLatestWorkoutPlan(plans.items)
  const today = useProfileToday()
  const { plan, schedule, ready, sessionsReady, generationError, retryGeneration } = useHomeSchedule(today)
  const selected = selectWeekPlan(weekPlans, plan.weekStart)
  const featuredPlanLoadState = plans.status === 'ready'
    ? { status: 'success' as const, plan: latest ? mapWorkoutPlanToFeaturedPlan(latest) : null }
    : plans.status === 'loading' ? { status: 'loading' as const } : { status: 'error' as const, message: workoutDataLabels.plansLoadError }
  const timer = uid ? createQuickTimerStorage(uid).read() : defaultQuickTimerDraft()
  const timerLabel = `${timer.roundCount} × ${formatSecondsAsClock(timer.roundDurationSeconds)}`
  const quickStart = <HomeQuickStart today={today} state={featuredPlanLoadState} timerLabel={timerLabel} onRetry={retry} />
  const progress = calculateWeekPlanProgress(plan.weekStart, plan, sessions.items)
  const minutes = Math.round(calculateWeeklySummary(plan.weekStart, sessions.items).durationSeconds / 60)
  const empty = ready && sessionsReady && plans.status === 'ready' && plans.complete && !plans.invalidDocumentIds.length
    && !plans.items.length && !sessions.items.length && !plan.items.length && !plan.schedule?.length && !plan.targetCount
    && !recurringWeeks.items[0]?.items.length && !weekPlans.items.some((week) => week.items.length || week.schedule?.length)
  return <>
    <WorkoutDataWarning />
    <HomeView
      introReady={ready && sessionsReady && plans.status === 'ready'}
      today={today} empty={empty} timerLabel={timerLabel}
      primary={schedule ? <HomeTodayCards key={plan.weekStart} plan={plan} schedule={schedule} today={today} fallback={<>
        {schedule.next && <p className="text-sm text-muted">{homeLabels.rest(schedule.next.date ? { date: schedule.next.date, item: schedule.next.item } : null)}</p>}
        {quickStart}
      </>} /> : <>
        {quickStart}
        {!ready ? selected.status !== 'ready' ? <WeekPlanDataMessage status={selected.status} /> : <div role="status" className="text-sm text-muted">
          <p>{recurringWeeks.status === 'loading' ? homeLabels.loadingPlan : scheduleLabels.failed}</p>
          <button type="button" className={homeSecondaryButton} onClick={retryRecurringWeeks}>{homeLabels.retry}</button>
        </div> : !sessionsReady && <div role="status" className="text-sm text-muted"><p>{sessions.status === 'loading' ? homeLabels.loadingSessions : workoutDataLabels.historyLoadError}</p><button type="button" className={homeSecondaryButton} onClick={retrySessions}>{homeLabels.retry}</button></div>}
      </>}
      overdue={schedule && !!schedule.overdue.length && <section aria-label={homeLabels.overdue} className="flex flex-col gap-2.5 border border-bd px-4 py-3.5">
        <h2 className={homeSectionLabel}>{homeLabels.overdue}</h2>
        {[plan, ...weekPlans.items.filter((week) => week.weekStart !== plan.weekStart)].map((week) => <HomeOverdueWeek key={week.weekStart} plan={week} entries={schedule.overdue.filter((entry) => entry.weekStart === week.weekStart)} today={today} />)}
      </section>}
      wellbeing={uid && profile.status === 'ready' && hasWellbeingConsent(profile.items[0]) ? <Suspense fallback={null}><WellbeingHomeCard key={uid} uid={uid} /></Suspense> : null}
      weekPlan={schedule && <><HomeWeekCard today={today} weekStart={plan.weekStart} schedule={schedule} progress={progress} minutes={minutes} /><HomePendingWeek />
        {generationError && <div role="alert" className="text-sm text-crimson-ink"><p>{scheduleLabels.failed}</p><button type="button" className={homeSecondaryButton} onClick={retryGeneration}>{homeLabels.retry}</button></div>}</>}
      rpeReminder={uid && sessions.status === 'ready' ? <RpeReminder key={uid} uid={uid} sessions={sessions.items} /> : null}
      featuredPlanLoadState={featuredPlanLoadState}
      recentSessionsLoadState={sessions.status === 'ready'
        ? { status: 'success', sessions: selectRecentWorkoutSessions(sessions.items).map((session) => mapWorkoutSessionToHomeRecentSession(session, sessions.pendingIds.has(session.id))) }
        : sessions.status === 'loading' ? { status: 'loading' } : { status: 'error', message: workoutDataLabels.historyLoadError }}
      onRetryLoadFeaturedPlan={retry} onRetryLoadRecentSessions={retry}
    />
  </>
}
