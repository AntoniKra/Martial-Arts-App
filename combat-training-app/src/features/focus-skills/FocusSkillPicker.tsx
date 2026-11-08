import { useId, useRef, useState } from 'react'
import { useWorkoutData } from '@/application/workoutDataContext'
import { Button } from '@/components/ui/Button'
import { MAX_PLAN_FOCUS_EXERCISES, type FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import { selectAvailableFocusSkills } from '@/domain/focus-skill/focusSkillSelectors'
import { FocusSkillForm } from './FocusSkillForm'
import { focusSkillLabels as labels } from './focusSkillLabels'
import type { FocusSkillFormValues } from './validateFocusSkillForm'

export function FocusSkillPicker({ focusSkillId, focusExerciseCount, onChange }: {
  focusSkillId: string | null
  focusExerciseCount: number
  onChange: (id: string | null) => void
}) {
  const { focusSkills, focusSkillRepository } = useWorkoutData()
  const id = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const [choosing, setChoosing] = useState(false)
  const [editor, setEditor] = useState<{ skill: FocusSkill | null } | null>(null)
  const [saving, setSaving] = useState(false)
  const enabled = focusSkillId !== null || choosing
  const limitReached = focusSkillId === null && focusExerciseCount >= MAX_PLAN_FOCUS_EXERCISES
  const ready = focusSkills.status === 'ready'
  const skills = selectAvailableFocusSkills(focusSkills.items)
  const selected = skills.find((skill) => skill.id === focusSkillId)

  function closeEditor() {
    setEditor(null)
    toggleRef.current?.focus()
  }

  async function saveSkill(values: FocusSkillFormValues) {
    if (!editor || limitReached) return
    const now = new Date().toISOString()
    const skill: FocusSkill = editor.skill
      ? { ...editor.skill, ...values, updatedAt: now }
      : { ...values, id: crypto.randomUUID(), openCorrection: null, archivedAt: null, createdAt: now, updatedAt: now }
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
      aria-describedby={`${id}-count${limitReached ? ` ${id}-limit` : ''}`}
      disabled={saving || (!enabled && (!ready || limitReached))}
      onClick={() => {
        if (enabled) { onChange(null); setChoosing(false); setEditor(null) }
        else setChoosing(true)
      }}
      className="flex min-h-touch w-full items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]">
      <span><span className="block font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">{labels.title}</span>
        <span className="mt-0.5 block text-[12px] text-muted">{labels.subtitle}</span></span>
      <span aria-hidden="true" className={`flex h-6 w-10 shrink-0 items-center border px-0.5 ${enabled ? 'justify-end border-crimson bg-crimson' : 'justify-start border-bd bg-elevated'}`}>
        <span className={`h-4 w-4 ${enabled ? 'bg-on-accent' : 'bg-muted'}`} />
      </span>
    </button>
    <p id={`${id}-count`} className="mt-1 text-[12px] tabular-nums text-muted">{labels.count(focusExerciseCount)}</p>
    {limitReached && <p id={`${id}-limit`} className="mt-2 text-[12px] leading-relaxed text-muted">{labels.limit}</p>}
    {!ready && <p role="status" className="mt-2 text-[13px] text-muted">{focusSkills.status === 'loading' ? labels.loading : labels.loadError}</p>}
    {focusSkills.invalidDocumentIds.length > 0 && <p role="status" className="mt-2 text-[12px] text-muted">{labels.invalidData}</p>}
    {enabled && <>
      {focusSkillId !== null && ready && !selected && <p role="alert" className="mt-2 text-[13px] text-crimson-ink">{labels.missing}</p>}
      <fieldset disabled={!ready || saving || limitReached} className="mt-3 min-w-0 space-y-2">
        <legend className="mb-2 text-[13px] font-semibold text-ink">{labels.question}</legend>
        {skills.map((skill) => <label key={skill.id} className={`flex min-h-touch cursor-pointer items-start gap-3 border p-3 ${focusSkillId === skill.id && !editor ? 'border-crimson bg-surface' : 'border-bd'}`}>
          <input type="radio" name={`${id}-skill`} value={skill.id} checked={focusSkillId === skill.id && !editor}
            onChange={() => { onChange(skill.id); setChoosing(false); setEditor(null) }}
            className="mt-1 shrink-0 accent-crimson focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]" />
          <span className="min-w-0 break-words"><span className="block text-[13px] font-semibold text-ink">{skill.name}</span>
            <span className="mt-1 block text-[12px] leading-relaxed text-muted">{skill.criterion}</span>
            {focusSkills.pendingIds.has(skill.id) && <span className="mt-1 block text-[12px] text-muted">{labels.pending}</span>}</span>
        </label>)}
        <label className={`flex min-h-touch cursor-pointer items-start gap-3 border p-3 ${editor?.skill === null ? 'border-crimson bg-surface' : 'border-bd'}`}>
          <input type="radio" name={`${id}-skill`} checked={editor?.skill === null} onChange={() => setEditor({ skill: null })}
            className="mt-1 shrink-0 accent-crimson focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]" />
          <span><span className="block text-[13px] font-semibold text-ink">{labels.new}</span>
            <span className="mt-1 block text-[12px] text-muted">{labels.newDescription}</span></span>
        </label>
      </fieldset>
      {selected && !editor && <Button type="button" size="sm" variant="ghost" disabled={!ready || saving} onClick={() => setEditor({ skill: selected })}>{labels.edit}</Button>}
      {editor && !limitReached && <FocusSkillForm key={editor.skill?.id ?? 'new'} initialValues={editor.skill ?? undefined}
        busy={saving} onSave={saveSkill} onCancel={closeEditor} />}
    </>}
  </div>
}
