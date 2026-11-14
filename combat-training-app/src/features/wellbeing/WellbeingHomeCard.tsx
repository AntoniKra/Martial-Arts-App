import { useState } from 'react'
import { useWorkoutData } from '@/application/workoutDataContext'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { useProfileToday } from '@/features/profile/useProfileToday'
import { wellbeingDismissalStorage } from '@/infrastructure/storage/wellbeingDismissalStorage'
import { getButtonClassName } from '@/components/ui/buttonStyles'
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
  const entry = wellbeing.items.find((item) => item.date === today)
  const withdrawalPending = profile.items[0]?.wellbeingWithdrawal?.pending
  if (entry && wellbeing.status !== 'error' && !withdrawalPending) return wellbeing.pendingIds.has(today) ? <p role="status" className="text-sm text-muted">{labels.title}: {workoutDataLabels.pending}</p> : null
  if (dismissed) return null
  return <section aria-label={labels.prompt} className="space-y-4 border border-bd bg-surface p-4">
    <h2 className="font-display text-xl font-semibold">{labels.prompt}</h2>
    {withdrawalPending ? <p role="status" className="text-sm text-muted">{labels.withdrawalPending}</p> : wellbeing.status !== 'ready' || wellbeing.invalidDocumentIds.length ? <WellbeingDataState loading={wellbeing.status === 'loading'} retry={retryWellbeing} /> : <>
      <WellbeingForm date={today} onSave={(value) => wellbeingRepository.save(value)} />
      <button type="button" className={getButtonClassName({ variant: 'ghost' })} onClick={() => { wellbeingDismissalStorage(uid).dismiss(today); setDismissed(true) }}>{labels.skip}</button>
    </>}
  </section>
}
