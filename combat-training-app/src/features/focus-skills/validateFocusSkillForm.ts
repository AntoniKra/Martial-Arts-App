import * as z from 'zod/mini'
import { FOCUS_SKILL_CRITERION_MAX_LENGTH, FOCUS_SKILL_NAME_MAX_LENGTH } from '@/domain/focus-skill/focusSkill.types'
import { focusSkillLabels as labels } from './focusSkillLabels'

export interface FocusSkillFormValues { name: string; criterion: string }
export type FocusSkillFormErrors = Partial<Record<keyof FocusSkillFormValues, string>>
export type FocusSkillFormResult = { ok: true; values: FocusSkillFormValues } | { ok: false; errors: FocusSkillFormErrors }

const nameSchema = z.string().check(z.minLength(1), z.maxLength(FOCUS_SKILL_NAME_MAX_LENGTH))
const criterionSchema = z.string().check(z.minLength(1), z.maxLength(FOCUS_SKILL_CRITERION_MAX_LENGTH))

export function validateFocusSkillForm(values: FocusSkillFormValues): FocusSkillFormResult {
  const name = values.name.trim()
  const criterion = values.criterion.trim()
  const errors: FocusSkillFormErrors = {}
  if (!nameSchema.safeParse(name).success) errors.name = labels.invalidName
  if (!criterionSchema.safeParse(criterion).success) errors.criterion = labels.invalidCriterion
  return errors.name || errors.criterion ? { ok: false, errors } : { ok: true, values: { name, criterion } }
}
