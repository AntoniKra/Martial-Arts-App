import { useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { routes } from '@/app/routes'
import { useWorkoutData } from '@/application/workoutDataContext'
import { Button } from '@/components/ui/Button'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import { hasFocusSkillEntries, selectFocusSkillPlans } from '@/domain/focus-skill/focusSkillProgress'
import { progressActionLabels as labels } from './progressLabels'

export function FocusSkillActions({ skill }: { skill: FocusSkill }) {
  const { plans, sessions, focusSkills, focusSkillRepository, retry } = useWorkoutData()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const inFlight = useRef(false)
  const titleId = useId(), descriptionId = useId()
  const ready = plans.status === 'ready' && sessions.status === 'ready' && focusSkills.status === 'ready'
    && plans.invalidDocumentIds.length + sessions.invalidDocumentIds.length + focusSkills.invalidDocumentIds.length === 0
  const used = hasFocusSkillEntries(skill.id, sessions.items)
  const affected = selectFocusSkillPlans(skill.id, plans.items)
  const archived = skill.archivedAt !== null

  function close() {
    if (inFlight.current) return
    dialogRef.current?.close()
    triggerRef.current?.focus()
  }

  async function apply() {
    if (!ready || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError(false)
    try {
      const now = new Date().toISOString()
      if (archived) await focusSkillRepository.restore(skill.id, now)
      else if (used) await focusSkillRepository.archive(skill.id, now)
      else await focusSkillRepository.deleteUnused(skill.id, now)
      dialogRef.current?.close()
      if (!archived) await navigate(routes.progress, { replace: true })
    } catch { setError(true) }
    finally { inFlight.current = false; setBusy(false) }
  }

  return <section className="space-y-3 border-t border-bd pt-5">
    {!ready && <p role="status" className="text-sm text-muted">{labels.unavailable} <button type="button" onClick={retry} className="min-h-touch underline">{labels.retry}</button></p>}
    <button type="button" ref={triggerRef} className={getButtonClassName({ variant: archived ? 'secondary' : 'danger', disabled: busy || !ready })} disabled={busy || !ready} onClick={() => {
      setError(false)
      if (archived) void apply()
      else { dialogRef.current?.showModal(); cancelRef.current?.focus() }
    }}>{archived ? labels.restore : used ? labels.archive : labels.delete}</button>
    {archived && <p className="text-sm leading-relaxed text-muted">{labels.restoreHint}</p>}
    {error && archived && <p role="alert" className="text-sm text-crimson-ink">{labels.error}</p>}
    <dialog ref={dialogRef} aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); close() }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
        const first = buttons[0], last = buttons.at(-1)
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-sm overflow-y-auto border border-bd bg-surface p-5 text-ink backdrop:bg-bg/80">
      <h2 id={titleId} className="font-display text-xl font-bold">{used ? labels.archive : labels.delete}</h2>
      <div id={descriptionId} className="mt-3 space-y-3 text-sm leading-relaxed text-muted">
        {!used && <p>{labels.deleteQuestion}</p>}
        {affected.length > 0 ? <>
          <p>{labels.inPlans}</p>
          <ul className="list-inside list-disc">{affected.map((plan) => <li key={plan.id} className="break-words">{plan.nameSnapshot}</li>)}</ul>
          <p>{used ? labels.archivePlans : labels.deletePlans}</p>
        </> : used && <p>{labels.archiveUnused}</p>}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-crimson-ink">{labels.error}</p>}
      <div className="mt-6 flex flex-col gap-3">
        <Button variant="danger" loading={busy} disabled={busy || !ready} onClick={() => void apply()}>{used ? affected.length ? labels.archiveAndDetach : labels.archiveShort : labels.deleteShort}</Button>
        <button type="button" ref={cancelRef} className={getButtonClassName({ variant: 'secondary', disabled: busy })} disabled={busy} onClick={close}>{labels.cancel}</button>
      </div>
    </dialog>
  </section>
}
