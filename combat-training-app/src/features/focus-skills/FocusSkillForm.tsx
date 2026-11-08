import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { FOCUS_SKILL_CRITERION_MAX_LENGTH, FOCUS_SKILL_NAME_MAX_LENGTH } from '@/domain/focus-skill/focusSkill.types'
import { focusSkillLabels as labels } from './focusSkillLabels'
import { validateFocusSkillForm, type FocusSkillFormErrors, type FocusSkillFormValues } from './validateFocusSkillForm'

const fieldClass = 'min-h-touch w-full border border-bd bg-input px-3 py-2 text-[16px] text-ink placeholder:text-faint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]'
const labelClass = 'mb-1.5 block font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-muted'

export function FocusSkillForm({ initialValues, busy, onSave, onCancel }: {
  initialValues?: FocusSkillFormValues
  busy: boolean
  onSave: (values: FocusSkillFormValues) => Promise<void>
  onCancel: () => void
}) {
  const id = useId()
  const nameRef = useRef<HTMLInputElement>(null)
  const criterionRef = useRef<HTMLTextAreaElement>(null)
  const inFlight = useRef(false)
  const [values, setValues] = useState<FocusSkillFormValues>(initialValues ?? { name: '', criterion: '' })
  const [errors, setErrors] = useState<FocusSkillFormErrors>({})
  const [saveError, setSaveError] = useState(false)
  useEffect(() => { nameRef.current?.focus() }, [])

  function updateField(field: keyof FocusSkillFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSaveError(false)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || inFlight.current) return
    const result = validateFocusSkillForm(values)
    if (!result.ok) {
      setErrors(result.errors)
      if (result.errors.name) nameRef.current?.focus()
      else criterionRef.current?.focus()
      return
    }
    setErrors({})
    setSaveError(false)
    inFlight.current = true
    try { await onSave(result.values) }
    catch { setSaveError(true) }
    finally { inFlight.current = false }
  }

  return <form onSubmit={(event) => void submit(event)} noValidate aria-label={initialValues ? labels.editHeading : labels.new} className="mt-3 space-y-4 border border-bd bg-surface p-3">
    <h4 className="font-display text-[14px] font-semibold text-ink">{initialValues ? labels.editHeading : labels.new}</h4>
    <fieldset disabled={busy} className="min-w-0 space-y-4">
      <div>
        <label htmlFor={`${id}-name`} className={labelClass}>{labels.name}</label>
        <input ref={nameRef} id={`${id}-name`} value={values.name} maxLength={FOCUS_SKILL_NAME_MAX_LENGTH}
          placeholder={labels.namePlaceholder} className={fieldClass} required
          aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? `${id}-name-error` : undefined}
          onChange={(event) => updateField('name', event.target.value)} />
        {errors.name && <p id={`${id}-name-error`} className="mt-1 text-[13px] text-crimson-ink">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor={`${id}-criterion`} className={labelClass}>{labels.criterion}</label>
        <textarea ref={criterionRef} id={`${id}-criterion`} value={values.criterion} rows={3}
          maxLength={FOCUS_SKILL_CRITERION_MAX_LENGTH} placeholder={labels.criterionPlaceholder} required
          className={`${fieldClass} resize-y`} aria-invalid={Boolean(errors.criterion)}
          aria-describedby={`${id}-hint${errors.criterion ? ` ${id}-criterion-error` : ''}`}
          onChange={(event) => updateField('criterion', event.target.value)} />
        {errors.criterion && <p id={`${id}-criterion-error`} className="mt-1 text-[13px] text-crimson-ink">{errors.criterion}</p>}
      </div>
      <p id={`${id}-hint`} className="text-[13px] leading-relaxed text-muted">{labels.hint}</p>
      {initialValues && <p className="text-[12px] leading-relaxed text-muted">{labels.sharedEditHint}</p>}
      {saveError && <p role="alert" className="text-[13px] text-crimson-ink">{labels.saveError}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" variant="primary" className="uppercase tracking-[0.04em]" loading={busy} disabled={busy}>{busy ? labels.saving : labels.save}</Button>
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onCancel}>{labels.cancel}</Button>
      </div>
    </fieldset>
  </form>
}
