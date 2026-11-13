import { useEffect, useId, useRef, useState } from 'react'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { profileLabels as labels } from './profileLabels'

export function ProfileConfirmDialog({ title, description, confirm, onConfirm, onClose, failureMessage }: {
  title: string; description: string; confirm: string; onConfirm: () => Promise<void>; onClose: () => void; failureMessage: () => string
}) {
  const ref = useRef<HTMLDialogElement>(null), cancelRef = useRef<HTMLButtonElement>(null)
  const pending = useRef(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null)
  const titleId = useId(), descriptionId = useId()
  useEffect(() => {
    const trigger = document.activeElement
    ref.current?.showModal(); cancelRef.current?.focus()
    return () => { if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus() }
  }, [])
  async function submit() {
    if (pending.current) return
    pending.current = true; setBusy(true); setError(null)
    try { await onConfirm(); onClose() } catch {
      setError(failureMessage()); pending.current = false; setBusy(false)
    }
  }
  return <dialog ref={ref} aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={(event) => { event.preventDefault(); if (!pending.current) onClose() }}
    onKeyDown={(event) => {
      if (event.key !== 'Tab') return
      const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
      const first = buttons[0], last = buttons.at(-1)
      if (!first) { event.preventDefault(); return }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }}
    className="fixed inset-0 m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-sm overflow-y-auto border border-bd bg-surface p-5 text-ink backdrop:bg-bg/80">
    <h2 id={titleId} className="font-display text-xl font-bold">{title}</h2>
    <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-muted">{description}</p>
    {error && <p role="alert" className="mt-3 text-sm text-crimson-ink">{error}</p>}
    {busy && <p role="status" className="mt-3 text-sm text-muted">{labels.deleting}</p>}
    <div className="mt-6 flex flex-col gap-3">
      <button type="button" disabled={busy} className={getButtonClassName({ variant: 'danger', disabled: busy })} onClick={() => void submit()}>{confirm}</button>
      <button ref={cancelRef} type="button" disabled={busy} className={getButtonClassName({ variant: 'secondary', disabled: busy })} onClick={onClose}>{labels.cancel}</button>
    </div>
  </dialog>
}
