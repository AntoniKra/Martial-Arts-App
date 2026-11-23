import { useRef, useState, type ReactNode } from 'react'
import type { PlanWorkoutSession, QuickTimerWorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { useSharedWorkoutGong } from '@/application/audio/workoutGongContext'
import { formatSecondsAsClock } from '@/domain/time/formatDuration'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { createRpeDismissalStorage } from '@/infrastructure/storage/rpeDismissalStorage'
import { RpePanel } from './RpePanel'
import { RpeSegments } from './RpeScale'
import { FeedbackIcon } from './FeedbackIcon'
import { rpeLabels as labels } from './rpeLabels'
import { workoutFeedbackLabels } from './workoutFeedbackLabels'
import { useRpeCountdown } from './useRpeCountdown'
import './workoutFeedback.css'

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
  const clock = formatSecondsAsClock(remaining)
  const card = <section aria-labelledby="rpe-card-heading" className="feedback-surface space-y-2.5 p-3.5">
    <div className="flex items-center justify-between gap-2">
      <h2 id="rpe-card-heading" ref={cardHeading} tabIndex={-1} className="feedback-eyebrow">{labels.heading}</h2>
      {session.rpe !== null
        ? <span aria-hidden="true" className="feedback-badge is-saved">{workoutFeedbackLabels.rpeSaved}</span>
        : remaining > 0 && <span className="feedback-badge is-countdown">{workoutFeedbackLabels.rpeCountdown}</span>}
    </div>
    {session.rpe === null ? <>
      {remaining > 0 ? <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs text-muted">{labels.countdown}</p>
        <p role="timer" aria-label={`${labels.countdown} ${clock}`} className="font-display text-[32px] leading-tight font-black tracking-tight tabular-nums text-ember-ink">{clock}</p>
      </div> : <p className="font-display text-sm font-extrabold text-ink">{labels.ready}</p>}
      <button ref={rateButton} type="button" onClick={() => { gong.unlock(); setOpen(true) }}
        className={getButtonClassName({ variant: 'secondary', size: 'sm', className: 'motion-press w-full rounded-sm font-extrabold uppercase' })}>
        <FeedbackIcon kind="check" size={14} />{labels.rateNow}
      </button>
      {remaining > 0 && <p className="text-[11.5px] leading-snug text-muted">{labels.timingHint}</p>}
    </> : <div className="space-y-2 rounded-sm border border-bd bg-elevated px-3 py-2.5">
      <p role="status" className="text-[15px] text-ink">
        <span className="sr-only">{labels.saved(session.rpe)}</span>
        <strong aria-hidden="true" className="font-display font-extrabold tabular-nums">{workoutFeedbackLabels.rpeValue(session.rpe)}</strong>
        <span> · {labels.descriptions[session.rpe] || labels.between[session.rpe]}</span>
      </p>
      <RpeSegments value={session.rpe} />
    </div>}
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
