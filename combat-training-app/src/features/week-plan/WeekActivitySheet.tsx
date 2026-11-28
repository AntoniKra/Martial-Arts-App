import { useEffect, useId, useRef } from 'react'
import type { WeekActivity, Weekday } from '@/domain/week-plan/weekPlan.types'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import { WeekActivityForm } from './WeekActivityForm'
import { scheduleLabels as labels, weekdays } from './scheduleLabels'
import { shiftCalendarDate } from '@/domain/week-plan/weekCalendar'

export function WeekActivitySheet({ initial, day, weekStart, recurring, plans, onSave, onClose }: {
  initial?: WeekActivity; day: Weekday | null; weekStart: string; recurring: boolean; plans: readonly WorkoutPlan[]
  onSave: (items: WeekActivity[], repeat: boolean) => Promise<void>; onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef(document.activeElement)
  const titleId = useId()
  const pushed = useRef(false)
  const closing = useRef(false)
  const close = () => {
    if (closing.current) return
    closing.current = true
    window.history.back()
  }
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    const element = dialog.current
    // A local, same-URL entry lets phone/browser Back dismiss the modal even after a hard navigation.
    // Preserve the router state/index: this entry belongs to the modal, not a different route.
    if (!pushed.current) {
      window.history.pushState(window.history.state, '', window.location.href)
      pushed.current = true
    }
    const onPop = () => closeRef.current()
    window.addEventListener('popstate', onPop)
    const returnFocus = trigger.current
    const overflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    element?.showModal()
    element?.querySelector<HTMLButtonElement>('button')?.focus()
    return () => {
      window.removeEventListener('popstate', onPop)
      element?.close()
      document.documentElement.style.overflow = overflow
      if (returnFocus instanceof HTMLElement && returnFocus.isConnected) returnFocus.focus()
    }
  }, [])
  const title = day === null ? labels.anySection : recurring ? weekdays[day].name : new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${shiftCalendarDate(weekStart, day)}T12:00:00Z`))
  return <dialog ref={dialog} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); close() }}
    onKeyDown={(event) => {
      if (event.key !== 'Tab') return
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled)')]
      const first = controls[0], last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }}
    onClick={(event) => { if (event.target === event.currentTarget) close() }}
    className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto border-t border-bd bg-surface px-4 pb-5 pt-3 text-ink backdrop:bg-[var(--app-form-sheet-scrim)] md:inset-x-auto md:left-1/2 md:w-[min(100%,32rem)] md:-translate-x-1/2">
    <div className="mx-auto mb-3 h-1 w-10 rounded-sm bg-bd" aria-hidden="true" />
    <div className="mb-3 flex items-center justify-between gap-2"><h2 id={titleId} className="font-display text-xl font-extrabold first-letter:uppercase">{title}</h2>
      <button type="button" aria-label={labels.close} onClick={close} className="flex size-11 shrink-0 items-center justify-center text-muted">✕</button></div>
    <WeekActivityForm initial={initial} defaultDay={day} recurring={recurring} plans={plans} onSave={async (items, repeat) => { await onSave(items, repeat); close() }} onCancel={close} />
  </dialog>
}
