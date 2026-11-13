import { useState } from 'react'
import { useWorkoutData } from '@/application/workoutDataContext'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { calculateSevenDayWeight, calculateWeeklyWeights } from '@/domain/profile/bodyWeight'
import type { AthleteProfile, BodyWeight } from '@/domain/profile/profile.types'
import { BodyWeightChart } from './BodyWeightChart'
import { BodyWeightForm } from './BodyWeightForm'
import { WeightClassForm } from './WeightClassForm'
import { ProfileConfirmDialog } from './ProfileConfirmDialog'
import { ProfileDataState } from './ProfileDataState'
import { profileDataUnavailable } from './profileDataUnavailable'
import { profileLabels as labels, measurementCountLabel, profileDateLabel, profileRangeLabel, weightKgLabel } from './profileLabels'

export function BodyWeightSection({ today, profile }: { today: string; profile: AthleteProfile }) {
  const { bodyWeights, bodyWeightRepository, profileRepository, retryBodyWeights, profile: profileState } = useWorkoutData()
  const [form, setForm] = useState<{ editing: BodyWeight | null } | null>(null)
  const [categoryOpen, setCategoryOpen] = useState(false), [all, setAll] = useState(false)
  const [removing, setRemoving] = useState<BodyWeight | null>(null), [withdrawing, setWithdrawing] = useState(false)
  const unavailable = profileDataUnavailable(bodyWeights)
  const summary = calculateSevenDayWeight(bodyWeights.items, today)
  const ordered = [...bodyWeights.items].sort((a, b) => b.date.localeCompare(a.date))
  return <>
    {unavailable ? <ProfileDataState state={unavailable} retry={retryBodyWeights} /> : <>
      <div className="space-y-2">
        {summary.averageKg === null ? <>
          <p>{labels.noRecent}</p>
          {summary.latest && <p className="text-sm text-muted">Ostatni pomiar: {weightKgLabel(summary.latest.weightKg)} ({profileDateLabel(summary.latest.date)})</p>}
        </> : <>
          <p className="font-display text-2xl font-semibold tabular-nums">Średnia z 7 dni: {weightKgLabel(summary.averageKg)}</p>
          <p className="text-sm text-muted">{measurementCountLabel(summary.count)} · {profileRangeLabel(summary.start, summary.end)}</p>
        </>}
      </div>
      <div className="space-y-3">
        {profile.weightClassLabel ? <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="break-words">{labels.category}: {profile.weightClassLabel}</p>
          <button type="button" className={getButtonClassName({ variant: 'ghost', size: 'sm' })} onClick={() => setCategoryOpen(true)}>{labels.editCategory}</button>
        </div> : <button type="button" className={getButtonClassName({ variant: 'secondary' })} onClick={() => setCategoryOpen(true)}>{labels.setCategory}</button>}
        {categoryOpen && <WeightClassForm current={profile.weightClassLabel} onClose={() => setCategoryOpen(false)}
          onSave={(weightClassLabel) => profileRepository.save({ ...profile, weightClassLabel, updatedAt: new Date().toISOString() })} />}
        {profileState.hasPendingWrites && <p role="status" className="text-sm text-muted">{workoutDataLabels.pending}</p>}
      </div>
      <button type="button" className={getButtonClassName()} onClick={() => setForm({ editing: null })}>{labels.add}</button>
      {form && <BodyWeightForm key={form.editing?.date ?? 'new'} today={today} weights={bodyWeights.items} editing={form.editing}
        onSave={(weight) => bodyWeightRepository.save(weight)} onClose={() => setForm(null)} />}
      <BodyWeightChart weeks={calculateWeeklyWeights(bodyWeights.items, today)} />
      <section aria-label={labels.history} className="space-y-3 border-t border-bd pt-4">
        <h3 className="font-display text-lg font-semibold">{labels.history}</h3>
        {ordered.length === 0 ? <p className="text-sm text-muted">{labels.noWeights}</p> : <ul className="divide-y divide-bd">
          {(all ? ordered : ordered.slice(0, 14)).map((weight) => <li key={weight.date} className="space-y-2 py-3">
            <div className="flex justify-between gap-3 text-sm tabular-nums"><time dateTime={weight.date}>{profileDateLabel(weight.date, true)}</time><span>{weightKgLabel(weight.weightKg)}</span></div>
            <div className="flex gap-2">
              <button type="button" aria-label={`${labels.edit} pomiar ${profileDateLabel(weight.date, true)}`} className={getButtonClassName({ variant: 'secondary', size: 'sm' })}
                onClick={() => setForm({ editing: weight })}>{labels.edit}</button>
              <button type="button" aria-label={`${labels.remove} pomiar ${profileDateLabel(weight.date, true)}`} className={getButtonClassName({ variant: 'ghost', size: 'sm' })}
                onClick={() => setRemoving(weight)}>{labels.remove}</button>
            </div>
            {bodyWeights.pendingIds.has(weight.date) && <p role="status" className="text-sm text-muted">{workoutDataLabels.pending}</p>}
          </li>)}
        </ul>}
        {!all && ordered.length > 14 && <button type="button" className={getButtonClassName({ variant: 'secondary' })} onClick={() => setAll(true)}>{labels.all}</button>}
      </section>
    </>}
    <div className="space-y-3 border-t border-bd pt-4">
      <p className="text-sm text-muted">Zgoda na zapisywanie masy ciała: od {profileDateLabel(profile.healthDataConsent!.grantedAt, true)}.</p>
      <button type="button" disabled={!bodyWeights.complete} className={getButtonClassName({ variant: 'danger', disabled: !bodyWeights.complete })} onClick={() => setWithdrawing(true)}>{labels.withdraw}</button>
    </div>
    {removing && <ProfileConfirmDialog title={labels.deleteTitle} description={`${profileDateLabel(removing.date, true)} · ${weightKgLabel(removing.weightKg)}. Tego nie da się cofnąć.`}
      confirm={labels.deleteConfirm} onClose={() => setRemoving(null)} onConfirm={() => bodyWeightRepository.delete(removing.date)} failureMessage={() => labels.saveFailed} />}
    {withdrawing && <ProfileConfirmDialog title={labels.withdrawTitle}
      description={`Usuniemy wszystkie pomiary (${bodyWeights.items.length + bodyWeights.invalidDocumentIds.length}) i kategorię. Tego nie da się cofnąć.`}
      confirm={labels.withdrawConfirm} onClose={() => setWithdrawing(false)} onConfirm={async () => {
        if (!navigator.onLine) throw new Error('Offline')
        await profileRepository.withdrawConsent()
      }} failureMessage={() => navigator.onLine ? labels.withdrawalFailed : labels.onlineRequired} />}
  </>
}
