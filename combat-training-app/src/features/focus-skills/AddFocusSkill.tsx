import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useWorkoutData } from '@/application/workoutDataContext'
import { Button } from '@/components/ui/Button'
import { FocusSkillForm } from './FocusSkillForm'

function SkillDialog({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const trigger = useRef(document.activeElement)
  useEffect(() => {
    ref.current?.showModal()
    const previous = trigger.current
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus() }
  }, [])
  return createPortal(<dialog ref={ref} aria-label="Nowy element do poprawy" onCancel={onClose} onSubmit={(event) => event.stopPropagation()}
    className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto border border-bd bg-surface p-4 text-ink backdrop:bg-black/60 md:inset-auto md:m-auto md:max-w-lg">{children}</dialog>, document.body)
}

export function AddFocusSkill({ manual = false, empty = false }: { manual?: boolean; empty?: boolean }) {
  const { focusSkillRepository } = useWorkoutData()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  return <div>
    <Button variant={empty ? 'primary' : 'secondary'} size={manual || empty ? 'md' : 'sm'} className={manual ? undefined : 'progress-add-skill'}
      aria-expanded={open} onClick={() => setOpen(!open)}>{manual || empty ? '+ Dodaj element do poprawy' : '+ Dodaj'}</Button>
    {open && <SkillDialog onClose={() => setOpen(false)}><FocusSkillForm busy={busy} onCancel={() => setOpen(false)} onSave={async (values) => {
      setBusy(true)
      try {
        const now = new Date().toISOString()
        await focusSkillRepository.save({ ...values, id: crypto.randomUUID(), openCorrection: null, archivedAt: null, createdAt: now, updatedAt: now })
        setOpen(false)
      } finally { setBusy(false) }
    }} /></SkillDialog>}
  </div>
}
