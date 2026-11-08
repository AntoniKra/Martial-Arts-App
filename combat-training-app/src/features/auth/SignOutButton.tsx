import { useId, useRef } from 'react'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { useAuth } from './authContext'
import { authLabels } from './authLabels'

/** Reports the sign-out result to the screen, which shows the error next to its own content. */
export function SignOutButton({ hasPendingWrites = false, disabled = false, onError }: {
  hasPendingWrites?: boolean
  disabled?: boolean
  onError: (message: string | null) => void
}) {
  const auth = useAuth()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const busy = auth.busy || disabled

  function closeDialog() {
    dialogRef.current?.close()
    triggerRef.current?.focus()
  }

  async function signOut() {
    closeDialog()
    onError(await auth.execute(() => auth.service.signOut()))
  }

  return <>
    <button ref={triggerRef} type="button" disabled={busy}
      className={getButtonClassName({ variant: 'ghost', size: 'sm', disabled: busy })}
      onClick={() => {
        if (hasPendingWrites) {
          dialogRef.current?.showModal()
          cancelRef.current?.focus()
        } else {
          void signOut()
        }
      }}>{authLabels.logout}</button>
    <dialog ref={dialogRef} aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); closeDialog() }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
        const first = buttons[0]
        const last = buttons[buttons.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-sm overflow-y-auto border border-bd bg-surface p-5 text-ink backdrop:bg-bg/80"
    >
      <h2 id={titleId} className="font-display text-xl font-bold">{authLabels.logoutTitle}</h2>
      <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-muted">{authLabels.logoutPendingWarning}</p>
      <div className="mt-6 flex flex-col gap-3">
        <button type="button" disabled={auth.busy}
          className={getButtonClassName({ variant: 'danger', size: 'lg', disabled: auth.busy })}
          onClick={() => void signOut()}>{authLabels.logoutAnyway}</button>
        <button ref={cancelRef} type="button" className={getButtonClassName({ variant: 'secondary', size: 'lg' })}
          onClick={closeDialog}>{authLabels.cancelLogout}</button>
      </div>
    </dialog>
  </>
}
