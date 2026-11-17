import type { APIRequestContext } from '@playwright/test'
import { workoutPlanDocumentSchema, workoutSessionDocumentSchema } from '../../src/infrastructure/firebase/workoutDocumentSchemas'
import { workoutDocumentVersion } from '../../src/infrastructure/firebase/workoutDocumentVersion'
import { focusSkillDocumentSchema } from '../../src/infrastructure/firebase/focusSkillDocumentSchema'
import { storedWeekPlanDocuments } from '../../src/infrastructure/firebase/weekPlanDocumentSchema'
import { recurringWeekRecords } from '../../src/infrastructure/firebase/recurringWeekDocumentSchema'
import { profileDocumentSchema, bodyWeightDocumentSchema } from '../../src/infrastructure/firebase/profileDocumentSchemas'
import { wellbeingDocumentSchema } from '../../src/infrastructure/firebase/wellbeingDocumentSchema'
import { exerciseDocumentSchema } from '../../src/infrastructure/firebase/exerciseDocumentSchema'
import { createDemoData, type DemoData } from './data'
import { assertDemoTarget, demoProjectId, demoFirestoreOrigin, encodeFields } from './emulator'

/** Parse everything before writing; retain the same wire documents for both entry points. */
export function demoDocuments(data: DemoData, empty = false) {
  const profile = empty ? { ...data.demoProfile, healthDataConsent: null, wellbeingConsent: null, weightClassLabel: null } : data.demoProfile
  const documents = [{ path: '', data: profileDocumentSchema.parse({ ...profile, schemaVersion: 1 }) }]
  if (empty) return documents
  return [
    ...documents,
    ...data.demoPlans.map((value) => ({ path: `workoutPlans/${value.id}`, data: workoutPlanDocumentSchema.parse({ ...value, schemaVersion: 1 }) })),
    ...data.demoSessions.map((value) => ({ path: `workoutSessions/${value.id}`, data: workoutSessionDocumentSchema.parse({ ...value, schemaVersion: workoutDocumentVersion(value) }) })),
    ...data.demoSkills.map((value) => ({ path: `focusSkills/${value.id}`, data: focusSkillDocumentSchema.parse({ ...value, schemaVersion: workoutDocumentVersion(value) }) })),
    ...data.demoWeights.map((value) => ({ path: `bodyWeights/${value.date}`, data: bodyWeightDocumentSchema.parse({ ...value, schemaVersion: 1 }) })),
    ...data.demoWellbeing.map((value) => ({ path: `readiness/${value.date}`, data: wellbeingDocumentSchema.parse({ ...value, schemaVersion: 1 }) })),
    ...data.demoExercises.map((value) => ({ path: `exercises/${value.id}`, data: exerciseDocumentSchema.parse({ ...value, schemaVersion: 1 }) })),
    ...data.demoWeeks.flatMap((week) => storedWeekPlanDocuments(week).map((value) => ({ path: `weekPlans/${value.id}`, data: value.data }))),
    ...recurringWeekRecords(data.demoRecurring).map((value) => ({ path: `recurringWeeks/${value.id}`, data: value })),
  ]
}

export async function seedDemo(request: APIRequestContext, account: { uid: string; idToken: string }, data = createDemoData(), empty = false) {
  const documents = demoDocuments(data, empty)
  for (const document of documents) {
    assertDemoTarget(demoProjectId, demoFirestoreOrigin)
    const url = `${demoFirestoreOrigin}/v1/projects/${demoProjectId}/databases/(default)/documents/users/${account.uid}${document.path ? `/${document.path}` : ''}`
    // Use the verified athlete identity, never the owner bypass. Consent is written first.
    const response = await request.patch(url, {
      headers: { Authorization: `Bearer ${account.idToken}` }, data: { fields: encodeFields(document.data) },
    })
    if (!response.ok()) throw new Error(`Demo write failed: ${document.path || 'profile'} (${response.status()})`)
  }
}
