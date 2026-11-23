import { ChoiceTile } from '@/components/ui/ChoiceTile'
import { useId, useLayoutEffect, useRef, useState } from 'react'
import { useWorkoutData } from '@/application/workoutDataContext'
import { Button } from '@/components/ui/Button'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { MAX_PLAN_FOCUS_EXERCISES, type FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import { selectAvailableFocusSkills } from '@/domain/focus-skill/focusSkillSelectors'
import { FocusSkillForm } from './FocusSkillForm'
import { focusSkillLabels as labels } from './focusSkillLabels'
import type { FocusSkillFormValues } from './validateFocusSkillForm'

export function FocusSkillPicker({ focusSkillId, focusExerciseCount, onChange, exerciseId }: {
  focusSkillId: string | null
  exerciseId?: string | null
  focusExerciseCount: number
  onChange: (id: string | null) => void
}) {
  const { focusSkills, focusSkillRepository } = useWorkoutData()
  const id = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const changeRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLFieldSetElement>(null)
  const focusTarget = useRef<'list' | 'change' | null>(null)
  const [choosing, setChoosing] = useState(false)
  const [editor, setEditor] = useState<{ skill: FocusSkill | null } | null>(null)
  const [saving, setSaving] = useState(false)
  const enabled = focusSkillId !== null || choosing
  const limitReached = focusSkillId === null && focusExerciseCount >= MAX_PLAN_FOCUS_EXERCISES
  const ready = focusSkills.status === 'ready'
  const skills = selectAvailableFocusSkills(focusSkills.items)
  const selected = focusSkills.items.find((skill) => skill.id === focusSkillId)
  const listOpen = !selected || choosing || editor !== null

  useLayoutEffect(() => {
    if (focusTarget.current === 'list' && listOpen) {
      const list = listRef.current
      const option = list?.querySelector<HTMLInputElement>('input:checked') ?? list?.querySelector<HTMLInputElement>('input')
      option?.focus()
    } else if (focusTarget.current === 'change' && !listOpen) {
      changeRef.current?.focus()
    }
    focusTarget.current = null
  }, [listOpen])

  function closeEditor() {
    setEditor(null)
    toggleRef.current?.focus()
  }

  async function saveSkill(values: FocusSkillFormValues) {
    if (!editor || limitReached) return
    const now = new Date().toISOString()
    const skill: FocusSkill = editor.skill
      ? { ...editor.skill, ...values, updatedAt: now }
      : { ...values, ...(exerciseId ? { exerciseId } : {}), id: crypto.randomUUID(), openCorrection: null, archivedAt: null, createdAt: now, updatedAt: now }
    setSaving(true)
    try {
      await focusSkillRepository.save(skill)
      onChange(skill.id)
      setChoosing(false)
      closeEditor()
    } finally { setSaving(false) }
  }

  return <div role="group" aria-label={labels.title} className="mt-3 border-t border-bd pt-3">
    <button ref={toggleRef} type="button" role="switch" aria-checked={enabled} aria-label={labels.switch}
      aria-describedby={limitReached ? `${id}-limit` : undefined}
      disabled={saving || (!enabled && (!ready || limitReached))}
      onClick={() => {
        if (enabled) { onChange(null); setChoosing(false); setEditor(null) }
        else setChoosing(true)
      }}
      className="flex min-h-touch w-full items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]">
      <span><span className="block font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">{labels.title}</span>
        <span className="mt-0.5 block text-[12px] text-muted">{labels.subtitle}</span></span>
      <span aria-hidden="true" className={`switch-track ${enabled ? 'is-on' : ''}`} />
    </button>
    {limitReached && <p id={`${id}-limit`} className="mt-2 text-[12px] leading-relaxed text-muted">{labels.limit}</p>}
    {!ready && <p role="status" className="mt-2 text-[13px] text-muted">{focusSkills.status === 'loading' ? labels.loading : labels.loadError}</p>}
    {focusSkills.invalidDocumentIds.length > 0 && <p role="status" className="mt-2 text-[12px] text-muted">{labels.invalidData}</p>}
    {enabled && <>
      {focusSkillId !== null && ready && !selected && <p role="alert" className="mt-2 text-[13px] text-crimson-ink">{labels.missing}</p>}
      {selected && !listOpen && <div className="mt-3 flex items-center justify-between gap-2 border border-bd bg-surface pl-3">
        <p className="min-w-0 wrap-anywhere text-[13px] font-semibold text-ink">
          {selected.name}{selected.archivedAt && ` · ${labels.archived}`}
          {focusSkills.pendingIds.has(selected.id) && <span className="text-[12px] font-normal text-muted"> · {labels.pending}</span>}
        </p>
        <button ref={changeRef} type="button" className={getButtonClassName({ size: 'sm', variant: 'ghost', className: 'shrink-0', disabled: !ready || saving })} aria-expanded={false}
          aria-controls={`${id}-skills`} disabled={!ready || saving} onClick={() => {
            focusTarget.current = 'list'
            setChoosing(true)
          }}>{labels.change}</button>
      </div>}
      {listOpen && selected?.archivedAt && <div className="mt-3 space-y-1 border border-bd bg-surface p-3 text-sm">
        <p className="break-words font-semibold">{selected.name} · {labels.archived}</p>
        <p className="break-words text-muted">{selected.criterion}</p>
        <p className="text-xs text-muted">{labels.archivedHint}</p>
      </div>}
      <fieldset ref={listRef} id={`${id}-skills`} hidden={!listOpen} disabled={!ready || saving || limitReached} className="mt-3 min-w-0 space-y-2">
        <legend className="mb-2 text-[13px] font-semibold text-ink">{labels.question}</legend>
        {skills.map((skill) => <ChoiceTile key={skill.id} className="described-choice" name={`${id}-skill`} value={skill.id} checked={focusSkillId === skill.id && !editor}
            onChange={() => { focusTarget.current = 'change'; onChange(skill.id); setChoosing(false); setEditor(null) }}>
          <span className="min-w-0 break-words"><span className="block text-[13px] font-semibold text-ink">{skill.name}</span>
            <span className="mt-1 block text-[12px] leading-relaxed text-muted">{skill.criterion}</span>
            {focusSkills.pendingIds.has(skill.id) && <span className="mt-1 block text-[12px] text-muted">{labels.pending}</span>}</span>
        </ChoiceTile>)}
        <ChoiceTile value="new" className="described-choice" name={`${id}-skill`} checked={editor?.skill === null} onChange={() => setEditor({ skill: null })}>
          <span><span className="block text-[13px] font-semibold text-ink">{labels.new}</span>
            <span className="mt-1 block text-[12px] text-muted">{labels.newDescription}</span></span>
        </ChoiceTile>
      </fieldset>
      {listOpen && selected && selected.archivedAt === null && !editor && <Button type="button" size="sm" variant="ghost" disabled={!ready || saving} onClick={() => setEditor({ skill: selected })}>{labels.edit}</Button>}
      {editor && !limitReached && <FocusSkillForm key={editor.skill?.id ?? 'new'} initialValues={editor.skill ?? undefined}
        busy={saving} onSave={saveSkill} onCancel={closeEditor} />}
    </>}
  </div>
}
