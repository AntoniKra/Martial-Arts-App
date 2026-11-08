import { expect, type APIRequestContext } from '@playwright/test'
import type { WorkoutPlan } from '../src/domain/workout/workout.types'
import type { WorkoutSession } from '../src/domain/workout-session/workoutSession.types'

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
export async function readSessions(request: APIRequestContext, uid: string): Promise<WorkoutSession[]> {
  const response = await request.get(`${root}/users/${uid}/workoutSessions`, { headers: { Authorization: 'Bearer owner' } })
  expect(response.ok()).toBe(true)
  const body = await response.json() as { documents?: { fields: Record<string, Value> }[] }
  return (body.documents ?? []).map((document) => decode({ mapValue: { fields: document.fields } }) as WorkoutSession)
}
