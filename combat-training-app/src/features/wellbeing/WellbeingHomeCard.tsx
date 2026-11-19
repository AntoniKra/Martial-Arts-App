import { useId, useState } from 'react'
import { useWorkoutData } from '@/application/workoutDataContext'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { HomeQuickLinkContent } from '@/features/home/components/HomeQuickLinkContent'
import { homeLabels } from '@/features/home/homeLabels'
import { useProfileToday } from '@/features/profile/useProfileToday'
import { wellbeingDismissalStorage } from '@/infrastructure/storage/wellbeingDismissalStorage'
import { WellbeingForm } from './WellbeingForm'
import { WellbeingDataState } from './WellbeingDataState'
import { wellbeingLabels as labels } from './wellbeingLabels'

export function WellbeingHomeCard({ uid }: { uid: string }) {
  const today = useProfileToday()
  return <DailyCard key={today} uid={uid} today={today} />
}
function DailyCard({ uid, today }: { uid: string; today: string }) {
  const { profile, wellbeing, wellbeingRepository, retryWellbeing } = useWorkoutData()
  const [dismissed, setDismissed] = useState(() => wellbeingDismissalStorage(uid).dismissed(today))
  const [expanded, setExpanded] = useState(false)
  const panelId = useId()
  const entry = wellbeing.items.find((item) => item.date === today)
  const withdrawalPending = profile.items[0]?.wellbeingWithdrawal?.pending
  if (entry && wellbeing.status !== 'error' && !withdrawalPending) return wellbeing.pendingIds.has(today) ? <p role="status" className="text-sm text-muted">{labels.title}: {workoutDataLabels.pending}</p> : null
  if (dismissed) return null
  return <section aria-label={homeLabels.wellbeing}>
    <h2>
      <button type="button" className="quick-link-row-5a wellbeing-home-toggle" aria-expanded={expanded} aria-controls={panelId}
        onClick={() => setExpanded(!expanded)}>
        <HomeQuickLinkContent icon="heart" title={homeLabels.wellbeing} subtitle={homeLabels.wellbeingHint} />
      </button>
    </h2>
    <div id={panelId} hidden={!expanded} className="mt-2 border border-bd bg-surface p-4">
      {withdrawalPending ? <p role="status" className="text-sm text-muted">{labels.withdrawalPending}</p> : wellbeing.status !== 'ready' || wellbeing.invalidDocumentIds.length ? <WellbeingDataState loading={wellbeing.status === 'loading'} retry={retryWellbeing} /> :
        <WellbeingForm date={today} onSave={(value) => wellbeingRepository.save(value)}
          onSkip={() => { wellbeingDismissalStorage(uid).dismiss(today); setDismissed(true) }} />}
    </div>
  </section>
}
