import { useEffect, useId, useRef, useState } from 'react'
import { mapWorkoutSessionSaveError } from '@/app/mapWorkoutSessionSaveError'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { workoutPlayerLabels as labels } from '../workoutPlayerLabels'

export function InterruptedWorkoutDialog({ planName, lastSeenAt, onSave, onDiscard }: {
  planName: string
  lastSeenAt: number
  onSave: () => Promise<void>
  onDiscard: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const saveButtonRef = useRef<HTMLButtonElement>(null)
  const pendingRef = useRef(false)
  const titleId = useId()
  const descriptionId = useId()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { dialogRef.current?.showModal(); saveButtonRef.current?.focus() }, [])

  async function save() {
    if (pendingRef.current) return
    pendingRef.current = true
    setSaving(true)
    setError(null)
    try { await onSave() } catch (cause) {
      setError(mapWorkoutSessionSaveError(cause))
      pendingRef.current = false
      setSaving(false)
    }
  }

  return <main className="min-h-dvh bg-bg">
    <dialog ref={dialogRef} aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
        const first = buttons[0]
        const last = buttons[buttons.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-sm overflow-y-auto border border-bd bg-surface p-5 text-ink backdrop:bg-bg/80"
    >
      <h1 id={titleId} className="font-display text-xl font-bold">{labels.interruptedTitle}</h1>
      <div id={descriptionId} className="mt-3 space-y-2 text-sm leading-relaxed">
        <p className="break-words font-semibold">{planName}</p>
        <p className="text-muted">{labels.lastActivity}: <time dateTime={new Date(lastSeenAt).toISOString()}>
          {new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' }).format(lastSeenAt)}
        </time></p>
      </div>
      {error ? <p role="alert" className="mt-3 text-sm text-crimson-ink">{error}</p> : null}
      {saving ? <p role="status" className="mt-3 text-sm text-muted">{labels.saving}</p> : null}
      <div className="mt-6 flex flex-col gap-3">
        <button ref={saveButtonRef} type="button" disabled={saving} onClick={() => void save()}
          className={getButtonClassName({ variant: 'primary', size: 'lg', disabled: saving })}>{labels.saveInterrupted}</button>
        <button type="button" disabled={saving} onClick={onDiscard}
          className={getButtonClassName({ variant: 'danger', size: 'lg', disabled: saving })}>{labels.discard}</button>
      </div>
    </dialog>
  </main>
}
