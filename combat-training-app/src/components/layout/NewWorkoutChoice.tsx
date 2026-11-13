import { useId, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { newWorkoutLabels as labels } from './newWorkoutLabels'

export function NewWorkoutChoice({ children, className, active }: { children: ReactNode; className?: string; active: boolean }) {
  const trigger = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const close = () => dialog.current?.close()
  return <>
    <button ref={trigger} type="button" aria-haspopup="dialog" aria-current={active ? 'page' : undefined} className={className}
      onClick={() => { dialog.current?.showModal(); dialog.current?.querySelector<HTMLAnchorElement>('a')?.focus() }}>{children}</button>
    <dialog ref={dialog} aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); close() }} onClose={() => trigger.current?.focus()}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('a, button')]
        const first = controls[0], last = controls.at(-1)
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }}
      className="new-workout-dialog fixed inset-x-0 top-auto bottom-0 m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto border border-bd bg-surface p-5 text-ink backdrop:bg-bg/80 md:inset-0 md:m-auto md:w-[calc(100%_-_2rem)] md:max-w-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={titleId} className="font-display text-xl font-bold">{labels.title}</h2>
        <button type="button" onClick={close} className="min-h-touch px-3 text-sm font-semibold text-muted">{labels.close}</button>
      </div>
      <div className="space-y-3 pb-[env(safe-area-inset-bottom,0px)]">
        {labels.choices.map((choice) => <Link key={choice.to} to={choice.to} onClick={close}
          className="flex min-h-touch items-center gap-4 border border-bd p-4 text-ink hover:bg-elevated">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-6 shrink-0 text-crimson-ink">
            {choice.icon === 'timer' ? <><circle cx="12" cy="14" r="8" /><path d="M9 2h6M12 2v4m5 1 2-2M12 10v5l3 2" /></>
              : choice.icon === 'plan' ? <><path d="M8 3H4v18h16V3h-4M8 3v4h8V3H8Zm0 9h8m-8 5h8" /></>
              : <><path d="M5 3h14v18H5zM8 8h8m-8 4h8m-8 4h5" /></>}
          </svg>
          <span><span className="block font-display text-sm font-semibold">{choice.label}</span><span className="mt-1 block text-xs leading-relaxed text-muted">{choice.description}</span></span>
        </Link>)}
      </div>
    </dialog>
  </>
}
