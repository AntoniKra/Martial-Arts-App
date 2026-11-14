import { useWorkoutData } from '@/application/workoutDataContext'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { describeWellbeing } from '@/domain/wellbeing/wellbeing'
import { hasWellbeingConsent } from '@/domain/wellbeing/wellbeingConsent'
import { profileDataUnavailable } from '@/features/profile/profileDataUnavailable'
import { useProfileToday } from '@/features/profile/useProfileToday'
import { WellbeingDataState } from './WellbeingDataState'
import { WellbeingChart } from './WellbeingChart'
import { wellbeingCategoryLabels, wellbeingLabels as labels, wellbeingQuestions } from './wellbeingLabels'

export function WellbeingProgressCard() {
  const { profile, wellbeing, retryWellbeing } = useWorkoutData(), today = useProfileToday()
  if (!hasWellbeingConsent(profile?.items[0])) return null
  const latest = [...wellbeing.items].filter((entry) => entry.date <= today).sort((a, b) => b.date.localeCompare(a.date))[0]
  const description = latest ? describeWellbeing(wellbeing.items, latest) : null
  return <section aria-label={labels.title} className="space-y-4 border border-bd bg-surface p-4">
    <h2 className="font-display text-xl font-semibold">{labels.title}</h2>
    {profileDataUnavailable(wellbeing) ? <WellbeingDataState loading={wellbeing.status === 'loading'} retry={retryWellbeing} /> : latest && description ? <>
      <p className="text-sm text-muted">Ostatni wpis: <time dateTime={latest.date}>{latest.date}</time></p>
      {!description.fields[0].norm && <div className="space-y-2 text-sm text-muted"><p>{labels.missing(description.missingEntries)}</p><p>{labels.span}</p></div>}
      {description.fields.map(({ field, category, worseEntries }) => <div key={field} className="space-y-2 border-t border-bd pt-3">
        <h3 className="text-sm font-semibold">{wellbeingQuestions[field].name}: {category ? wellbeingCategoryLabels[category] : `${latest[field]} · ${wellbeingQuestions[field].options[latest[field] - 1]}`}
          {worseEntries > 1 && ` (od ${worseEntries} dni)`}</h3>
        <WellbeingChart entries={wellbeing.items} field={field} end={today} version={latest.questionsVersion} />
      </div>)}
      <p className="text-xs text-muted">{labels.chartHint}</p>
      {latest.note && <p className="whitespace-pre-wrap break-words text-sm">{labels.note}: {latest.note}</p>}
      {wellbeing.hasPendingWrites && <p role="status" className="text-sm text-muted">{workoutDataLabels.pending}</p>}
    </> : <><p className="text-sm text-muted">{labels.empty}</p><p className="text-sm text-muted">{labels.missing(14)}</p></>}
    <p className="border-t border-bd pt-3 text-xs leading-relaxed text-muted">{labels.disclaimer}</p>
  </section>
}
