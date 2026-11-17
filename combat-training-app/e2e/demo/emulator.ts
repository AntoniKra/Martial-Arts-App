export const demoProjectId = 'demo-combat-training'
export const demoAuthOrigin = 'http://127.0.0.1:9099'
export const demoFirestoreOrigin = 'http://127.0.0.1:8080'

/** Call before every fixture write, including privileged local account verification. */
export function assertDemoTarget(projectId: string, origin: string) {
  if (!projectId.startsWith('demo-') || ![demoAuthOrigin, demoFirestoreOrigin].includes(origin)) {
    throw new Error('Demo writes require a demo- project and a fixed loopback emulator')
  }
}

export function encodeFirestore(value: unknown): object {
  if (value === null) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeFirestore) } }
  if (typeof value === 'object') return { mapValue: { fields: encodeFields(value) } }
  throw new Error('Unsupported demo value')
}

export function encodeFields(value: object): Record<string, object> {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeFirestore(item)]))
}
