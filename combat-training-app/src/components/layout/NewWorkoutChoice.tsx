import { useId, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { newWorkoutLabels as labels } from './newWorkoutLabels'

const choiceIcons = {
  timer: <><circle cx="12" cy="14" r="8" /><path d="M9 2h6M12 2v4m5 1 2-2M12 10v5l3 2" /></>,
  journal: <path d="M5 3h14v18H5zM8 8h8m-8 4h8m-8 4h5" />,
  plan: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM16.5 13v7M13 16.5h7" />,
}

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
      className="new-workout-dialog fixed inset-x-0 top-auto bottom-0 m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-sm border border-bd border-t-2 border-t-ember bg-bg px-4 pt-2 pb-5 text-ink md:inset-0 md:m-auto md:w-[calc(100%_-_2rem)] md:max-w-sm md:rounded-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id={titleId} className="font-display text-xl leading-[normal] font-bold">{labels.title}</h2>
        <button type="button" onClick={close} aria-label={labels.close} className="-mr-2.5 flex size-11 shrink-0 items-center justify-center">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="space-y-2.5 pb-[env(safe-area-inset-bottom,0px)]">
        {labels.choices.map((choice) => <Link key={choice.to} to={choice.to} onClick={close}
          className="flex min-h-touch items-center gap-4 rounded-sm border border-bd bg-[var(--app-home-surface)] p-4 text-ink hover:bg-elevated">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-6 shrink-0 text-crimson-ink">
            {choiceIcons[choice.icon]}
          </svg>
          <span><span className="block font-display text-sm leading-[normal] font-semibold">{choice.label}</span><span className="mt-1 block text-xs leading-normal text-muted">{choice.description}</span></span>
        </Link>)}
      </div>
    </dialog>
  </>
}
