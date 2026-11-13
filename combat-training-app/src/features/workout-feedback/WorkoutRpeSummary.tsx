import { useRef, useState, type ReactNode } from 'react'
import type { PlanWorkoutSession, QuickTimerWorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { useSharedWorkoutGong } from '@/application/audio/workoutGongContext'
import { formatSecondsAsClock } from '@/domain/time/formatDuration'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { createRpeDismissalStorage } from '@/infrastructure/storage/rpeDismissalStorage'
import { RpePanel } from './RpePanel'
import { rpeLabels as labels } from './rpeLabels'
import { useRpeCountdown } from './useRpeCountdown'

export function WorkoutRpeSummary({ session, uid, initialOpen, onSave, children }: {
  session: PlanWorkoutSession | QuickTimerWorkoutSession; uid: string; initialOpen: boolean
  onSave: (value: number, recordedAt: string) => Promise<void>
  children: (card: ReactNode) => ReactNode
}) {
  const [open, setOpen] = useState(initialOpen)
  const [skipped, setSkipped] = useState(false)
  const rateButton = useRef<HTMLButtonElement>(null)
  const cardHeading = useRef<HTMLHeadingElement>(null)
  const gong = useSharedWorkoutGong()
  const remaining = useRpeCountdown(session.completedAt, session.rpe === null && !skipped, () => setOpen(true))
  const back = () => {
    setOpen(false)
    requestAnimationFrame(() => (rateButton.current ?? cardHeading.current)?.focus())
  }
  const card = <section aria-labelledby="rpe-card-heading" className="space-y-4 border border-bd bg-surface p-4">
    <h2 id="rpe-card-heading" ref={cardHeading} tabIndex={-1} className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">{labels.heading}</h2>
    {session.rpe === null ? <>
      <div className="flex items-center justify-between gap-3">
        <div>
          {remaining > 0 ? <>
            <p className="text-[12px] text-muted">{labels.countdown}</p>
            <p role="timer" aria-label={`${labels.countdown} ${formatSecondsAsClock(remaining)}`} className="font-display text-[36px] font-bold leading-tight tabular-nums text-ink">{formatSecondsAsClock(remaining)}</p>
          </> : <p className="font-display text-lg font-semibold text-ink">{labels.ready}</p>}
        </div>
        <button ref={rateButton} type="button" onClick={() => { gong.unlock(); setOpen(true) }} className={getButtonClassName({ variant: 'secondary', className: 'uppercase tracking-[0.08em]' })}>{labels.rateNow}</button>
      </div>
      {remaining > 0 && <p className="text-[12px] leading-relaxed text-muted">{labels.timingHint}</p>}
    </> : <p role="status" className="text-sm font-semibold tabular-nums text-ink">{labels.saved(session.rpe)}</p>}
  </section>
  return <>
    <div hidden={open}>{children(card)}</div>
    {open && <RpePanel due={remaining === 0} initialValue={session.rpe} onBack={back}
      onSave={async (value) => { await onSave(value, new Date().toISOString()); back() }}
      onSkip={() => {
        if (!createRpeDismissalStorage(uid).dismiss(session.id)) return false
        setSkipped(true); back(); return true
      }} />}
  </>
}
