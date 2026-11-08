import * as z from 'zod/mini'
import { FOCUS_SKILL_CRITERION_MAX_LENGTH, FOCUS_SKILL_NAME_MAX_LENGTH } from '@/domain/focus-skill/focusSkill.types'
import { instantSchema } from './workoutDocumentSchemas'

const id = z.string().check(z.minLength(1), z.refine((value) => !value.includes('/')))

export const focusSkillDocumentSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id,
  name: z.string().check(z.minLength(1), z.maxLength(FOCUS_SKILL_NAME_MAX_LENGTH)),
  criterion: z.string().check(z.minLength(1), z.maxLength(FOCUS_SKILL_CRITERION_MAX_LENGTH)),
  openCorrection: z.nullable(z.strictObject({
    problem: z.string().check(z.minLength(1), z.maxLength(200)),
    fix: z.string().check(z.minLength(1), z.maxLength(200)),
    sessionId: id,
    workoutDate: z.iso.date(),
  })),
  archivedAt: z.nullable(instantSchema),
  createdAt: instantSchema,
  updatedAt: instantSchema,
})
