import { expect, type APIRequestContext } from '@playwright/test'
import { seedPlan, seedSession, seedFocusSkill, seedWeekPlan, seedBodyWeight, seedRawAccountDocument } from '../firestoreEmulator'
import { workoutPlanDocumentSchema, workoutSessionDocumentSchema } from '../../src/infrastructure/firebase/workoutDocumentSchemas'
import { focusSkillDocumentSchema } from '../../src/infrastructure/firebase/focusSkillDocumentSchema'
import { weekPlanDocumentSchema } from '../../src/infrastructure/firebase/weekPlanDocumentSchema'
import { profileDocumentSchema, bodyWeightDocumentSchema } from '../../src/infrastructure/firebase/profileDocumentSchemas'
import { demoPlans, demoSessions, demoSkills, demoWeeks, demoWeights, demoProfile } from './data'

export async function seedDemo(request: APIRequestContext, uid: string) {
  // These helpers have hardcoded localhost endpoints and a demo- project ID.
  // Validate the whole history before seeding, so invalid fixtures cannot produce empty screenshots.
  for (const plan of demoPlans) expect(workoutPlanDocumentSchema.safeParse({ ...plan, schemaVersion: 1 }).success, plan.id).toBe(true)
  for (const session of demoSessions) expect(workoutSessionDocumentSchema.safeParse({ ...session, schemaVersion: 1 }).success, session.id).toBe(true)
  expect(demoSessions).toHaveLength(27)
  expect(demoWeights).toHaveLength(20)
  expect(profileDocumentSchema.safeParse({ ...demoProfile, schemaVersion: 1 }).success).toBe(true)
  for (const skill of demoSkills) expect(focusSkillDocumentSchema.safeParse({ ...skill, schemaVersion: 1 }).success, skill.id).toBe(true)
  for (const week of demoWeeks) expect(weekPlanDocumentSchema.safeParse({ ...week, schemaVersion: 1 }).success, week.weekStart).toBe(true)
  for (const weight of demoWeights) expect(bodyWeightDocumentSchema.safeParse({ ...weight, schemaVersion: 1 }).success, weight.date).toBe(true)
  await seedRawAccountDocument(request, uid, '', { ...demoProfile, healthDataConsent: null, weightClassLabel: null, schemaVersion: 1 })
  for (const skill of demoSkills) await seedFocusSkill(request, uid, skill)
  for (const plan of demoPlans) await seedPlan(request, uid, plan)
  for (const session of demoSessions) await seedSession(request, uid, session)
  for (const week of demoWeeks) await seedWeekPlan(request, uid, week)
  for (const weight of demoWeights) await seedBodyWeight(request, uid, weight)
}
