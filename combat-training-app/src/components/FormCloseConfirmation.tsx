import { useEffect, useId, useRef } from 'react'
import { Button } from './ui/Button'
import { workoutBuilderLabels as labels } from '@/features/workout-builder/workoutBuilderLabels'

export function FormCloseConfirmation({ onCancel, onDiscard }: { onCancel: () => void; onDiscard: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), cancel = useRef<HTMLButtonElement>(null)
  const trigger = useRef(document.activeElement), id = useId()
  useEffect(() => {
    dialog.current?.showModal()
    cancel.current?.focus()
    const previous = trigger.current
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus() }
  }, [])
  return <dialog ref={dialog} aria-labelledby={id} onCancel={(event) => { event.preventDefault(); onCancel() }}
    className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-sm space-y-4 border border-bd bg-surface p-5 text-ink backdrop:bg-bg/80">
    <h2 id={id} className="font-display text-xl font-bold">{labels.discardTitle}</h2>
    <p className="text-sm text-muted">{labels.discardDescription}</p>
    <Button variant="danger" className="w-full" onClick={onDiscard}>{labels.discardChanges}</Button>
    <button ref={cancel} type="button" onClick={onCancel} className="min-h-touch w-full border border-bd text-sm font-semibold">{labels.returnToEditing}</button>
  </dialog>
}
