import { useState, type ReactNode } from 'react'
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

export function MoreTile({ title, value, hint, children }: { title: string; value: string; hint: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return <div className={open ? 'col-span-2' : ''}>
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex min-h-28 w-full flex-col gap-1 border border-bd bg-surface p-3 text-left">
      <span className="text-[11px] font-bold uppercase tracking-widest text-muted">{title}</span>
      <strong className="font-display text-2xl tabular-nums">{value}</strong><span className="text-xs text-muted">{hint}</span>
    </button>
    {open && <div className="space-y-4 border border-bd p-3">{children}</div>}
  </div>
}

export function ProgressOverview() {
  const { sessions, weekPlans, currentWeek, retrySessions } = useWorkoutData()
  const today = useProfileToday()
  const unavailable = profileDataUnavailable(sessions)
  const selected = selectWeekPlan(weekPlans, currentWeek)
  if (unavailable) return <ProfileDataState state={unavailable} retry={retrySessions} />
  const summary = calculateWeeklySummary(currentWeek, sessions.items)
  const typical = typicalProgress(sessions.items, currentWeek)
  const target = selected.status === 'ready' ? weekTarget(selected.plan) : null
  const schedule = selected.status === 'ready' && selected.plan ? calculateScheduledWeek(selected.plan, sessions.items, today) : null
  const rounds = sparringOverview(sessions.items, currentWeek, shiftCalendarDate(currentWeek, 6))
  return <>
    <dl aria-label="Ten tydzień w liczbach" className="grid grid-cols-3 gap-2">
      {[[`${summary.workoutCount}${target === null ? '' : ` / ${target}`}`, 'treningi' + (target === null ? '' : ' (plan)')],
        [Math.ceil(summary.durationSeconds / 60).toLocaleString('pl-PL'), `minut${typical ? ` · zwykle ${typical.minutes.toLocaleString('pl-PL')}` : ''}`],
        [`${rounds.unknown ? '≥ ' : ''}${rounds.rounds}`, 'rund sparingu']].map(([value, label]) => <div key={label} className="flex min-w-0 flex-col-reverse justify-end gap-1 border border-bd bg-surface px-2 py-3">
        <dt className="text-xs text-muted">{label}</dt><dd className="font-display text-[28px] font-extrabold tabular-nums">{value}</dd>
      </div>)}
    </dl>
    {rounds.unknown > 0 && <p className="text-xs text-muted">W {rounds.unknown} treningach liczba rund nieznana.</p>}
    <section aria-label="Ten tydzień" className="space-y-3">
      <div className="flex items-center justify-between gap-2"><h2 className="font-display text-lg font-bold">Ten tydzień</h2><Link to={routes.weekPlan(currentWeek)} className="inline-flex min-h-touch items-center text-sm text-muted">Plan tygodnia ›</Link></div>
      {selected.status !== 'ready' && <p role="status" className="text-sm text-muted">Plan tygodnia jest niedostępny.</p>}
      <div className="grid grid-cols-7 gap-1 text-center">{['PN', 'WT', 'ŚR', 'CZ', 'PT', 'SB', 'ND'].map((day, index) => {
        const date = shiftCalendarDate(currentWeek, index)
        const trained = sessions.items.some((session) => session.workoutDate === date)
        const planned = schedule?.matches.some(({ item }) => item.day === index && item.kind !== 'rest' && !item.omitted)
        return <div key={day} aria-label={`${date}: ${trained ? 'trening' : planned ? 'zaplanowany' : selected.status === 'ready' ? 'wolne' : 'plan niedostępny'}`} className="flex flex-col items-center gap-2 text-[11px] font-bold text-muted">
          {day}<span aria-hidden="true" className={`size-[22px] rounded-full border-2 ${trained ? 'border-crimson bg-crimson' : planned ? 'border-dashed border-muted' : 'border-bd'}`} />
        </div>
      })}</div>
      <p className="text-xs text-muted">● trening · ◌ zaplanowany · ○ wolne</p>
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
  return <section aria-label="Więcej" className="space-y-3">
    <h2 className="font-display text-lg font-bold">Więcej</h2>
    <div className="grid grid-cols-2 gap-2">
      <MoreTile title="Sparing" value={ready ? `${sparring.unknown ? '≥ ' : ''}${sparring.rounds} rund` : 'Brak danych'} hint={ready ? `${sparring.workouts} treningów ze sparingiem · 4 tyg.` : 'Historia niedostępna'}>
        {sparring.unknown > 0 && <p className="text-sm text-muted">W {sparring.unknown} treningach liczba rund nieznana.</p>}
        <WeeklySummary weekStart={currentWeek} showTrends={false} /><ProfileStatistics today={today} recentOnly />
      </MoreTile>
      <MoreTile title="Obciążenie" value={ready ? (summary.load.units === null ? 'Brak danych' : Math.round(summary.load.units).toLocaleString('pl-PL')) : 'Brak danych'}
        hint={loadHint}>
        <WeeklySummary weekStart={currentWeek} showTrends={false} />
      </MoreTile>
      {profile.status === 'ready' && hasWellbeingConsent(athlete) && <MoreTile title="Samopoczucie"
        value={profileDataUnavailable(wellbeing) ? 'Brak danych' : `${Math.min(14, baseline?.count ?? 0)}/14`}
        hint={baseline?.norms.sleep ? 'wpisów · norma dostępna' : 'wpisów do normy · wymagane 21 dni'}><WellbeingProgressCard /></MoreTile>}
      {profile.status === 'ready' && athlete && hasValidHealthConsent(athlete) && <MoreTile title="Masa ciała"
        value={!profileDataUnavailable(bodyWeights) && weight.averageKg !== null ? `${weight.averageKg.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg` : 'Brak danych'}
        hint="średnia 7 dni"><BodyWeightSection today={today} profile={athlete} /></MoreTile>}
    </div>
  </section>
}
