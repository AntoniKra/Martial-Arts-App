import { expect, type APIRequestContext } from '@playwright/test'
import type { WorkoutPlan } from '../src/domain/workout/workout.types'
import type { WorkoutSession } from '../src/domain/workout-session/workoutSession.types'
import type { FocusSkill } from '../src/domain/focus-skill/focusSkill.types'
import type { WeekPlan } from '../src/domain/week-plan/weekPlan.types'
import type { AthleteProfile, BodyWeight } from '../src/domain/profile/profile.types'

// Fixed local demo endpoint. Test inspection/seeding bypasses rules; app writes always use its verified identity.
const root = 'http://127.0.0.1:8080/v1/projects/demo-combat-training/databases/(default)/documents'
type Value = { nullValue?: null; stringValue?: string; integerValue?: string; doubleValue?: number; booleanValue?: boolean;
  arrayValue?: { values?: Value[] }; mapValue?: { fields?: Record<string, Value> } }
function encode(value: unknown): Value {
  if (value === null) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } }
  if (typeof value === 'object' && value !== null) return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) } }
  throw new Error('Unsupported test value')
}
function decode(value: Value): unknown {
  if ('nullValue' in value) return null
  if ('stringValue' in value) return value.stringValue
  if ('booleanValue' in value) return value.booleanValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if (value.arrayValue) return (value.arrayValue.values ?? []).map(decode)
  return Object.fromEntries(Object.entries(value.mapValue?.fields ?? {}).map(([key, item]) => [key, decode(item)]))
}
export async function seedPlan(request: APIRequestContext, uid: string, plan: WorkoutPlan) {
  const response = await request.patch(`${root}/users/${uid}/workoutPlans/${plan.id}`, {
    headers: { Authorization: 'Bearer owner' }, data: encode({ ...plan, schemaVersion: 1 }).mapValue,
  })
  expect(response.ok()).toBe(true)
}
export async function seedFocusSkill(request: APIRequestContext, uid: string, skill: FocusSkill) {
  const response = await request.patch(`${root}/users/${uid}/focusSkills/${skill.id}`, {
    headers: { Authorization: 'Bearer owner' }, data: encode({ ...skill, schemaVersion: 1 }).mapValue,
  })
  expect(response.ok()).toBe(true)
}
export async function readFocusSkills(request: APIRequestContext, uid: string): Promise<FocusSkill[]> {
  const response = await request.get(`${root}/users/${uid}/focusSkills`, { headers: { Authorization: 'Bearer owner' } })
  expect(response.ok()).toBe(true)
  const body = await response.json() as { documents?: { fields: Record<string, Value> }[] }
  return (body.documents ?? []).map((document) => decode({ mapValue: { fields: document.fields } }) as FocusSkill)
}
export async function readSessions(request: APIRequestContext, uid: string): Promise<WorkoutSession[]> {
  const response = await request.get(`${root}/users/${uid}/workoutSessions`, { headers: { Authorization: 'Bearer owner' } })
  expect(response.ok()).toBe(true)
  const body = await response.json() as { documents?: { fields: Record<string, Value> }[] }
  return (body.documents ?? []).map((document) => decode({ mapValue: { fields: document.fields } }) as WorkoutSession)
}

export async function seedSession(request: APIRequestContext, uid: string, session: WorkoutSession) {
  const response = await request.patch(`${root}/users/${uid}/workoutSessions/${session.id}`, {
    headers: { Authorization: 'Bearer owner' }, data: encode({ ...session, schemaVersion: 1 }).mapValue,
  })
  expect(response.ok()).toBe(true)
}

export async function readPlans(request: APIRequestContext, uid: string): Promise<WorkoutPlan[]> {
  const response = await request.get(`${root}/users/${uid}/workoutPlans`, { headers: { Authorization: 'Bearer owner' } })
  expect(response.ok()).toBe(true)
  const body = await response.json() as { documents?: { fields: Record<string, Value> }[] }
  return (body.documents ?? []).map((document) => decode({ mapValue: { fields: document.fields } }) as WorkoutPlan)
}

export async function seedWeekPlan(request: APIRequestContext, uid: string, plan: WeekPlan) {
  const response = await request.patch(`${root}/users/${uid}/weekPlans/${plan.weekStart}`, {
    headers: { Authorization: 'Bearer owner' }, data: encode({ ...plan, schemaVersion: 1 }).mapValue,
  })
  expect(response.ok()).toBe(true)
}

export async function seedInvalidWeekPlan(request: APIRequestContext, uid: string, weekStart: string) {
  const response = await request.patch(`${root}/users/${uid}/weekPlans/${weekStart}`, {
    headers: { Authorization: 'Bearer owner' }, data: encode({ schemaVersion: 2, weekStart, items: 'invalid' }).mapValue,
  })
  expect(response.ok()).toBe(true)
}

export async function readWeekPlans(request: APIRequestContext, uid: string): Promise<WeekPlan[]> {
  const response = await request.get(`${root}/users/${uid}/weekPlans`, { headers: { Authorization: 'Bearer owner' } })
  expect(response.ok()).toBe(true)
  const body = await response.json() as { documents?: { fields: Record<string, Value> }[] }
  return (body.documents ?? []).map((document) => decode({ mapValue: { fields: document.fields } }) as WeekPlan)
}

export async function removeWorkoutDocument(request: APIRequestContext, uid: string, collection: 'workoutPlans' | 'workoutSessions', id: string) {
  const response = await request.delete(`${root}/users/${uid}/${collection}/${id}`, { headers: { Authorization: 'Bearer owner' } })
  expect(response.ok()).toBe(true)
}

export async function readProfile(request: APIRequestContext, uid: string): Promise<AthleteProfile | null> {
  const response = await request.get(`${root}/users/${uid}`, { headers: { Authorization: 'Bearer owner' } })
  if (response.status() === 404) return null
  expect(response.ok()).toBe(true)
  const body = await response.json() as { fields: Record<string, Value> }
  return decode({ mapValue: { fields: body.fields } }) as AthleteProfile
}

export async function readBodyWeights(request: APIRequestContext, uid: string): Promise<BodyWeight[]> {
  const response = await request.get(`${root}/users/${uid}/bodyWeights`, { headers: { Authorization: 'Bearer owner' } })
  expect(response.ok()).toBe(true)
  const body = await response.json() as { documents?: { fields: Record<string, Value> }[] }
  return (body.documents ?? []).map((document) => decode({ mapValue: { fields: document.fields } }) as BodyWeight)
}

export async function seedBodyWeight(request: APIRequestContext, uid: string, weight: BodyWeight) {
  const response = await request.patch(`${root}/users/${uid}/bodyWeights/${weight.date}`, {
    headers: { Authorization: 'Bearer owner' }, data: encode({ ...weight, schemaVersion: 1 }).mapValue,
  })
  expect(response.ok()).toBe(true)
}
