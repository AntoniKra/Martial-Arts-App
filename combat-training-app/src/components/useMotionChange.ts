import { useState } from 'react'

type MotionValue = { key: string; value: string }

/** Keep presentation feedback above rows whose IDs can change after an edit. */
export function useMotionChanges(values: readonly MotionValue[] | null): ReadonlySet<string> {
  const signature = values === null ? null : JSON.stringify(values)
  const [observed, setObserved] = useState({ signature, values, changed: new Set<string>() })
  if (observed.signature !== signature) {
    const before = new Map(observed.values?.map(({ key, value }) => [key, value]))
    const changed = new Set(observed.values === null ? [] : values?.filter(({ key, value }) => before.get(key) !== value).map(({ key }) => key))
    setObserved({ signature, values, changed })
  }
  return observed.changed
}

/** Enable status feedback after a change, never on a screen's initial render. */
export function useMotionChange(value: string): boolean {
  return useMotionChanges([{ key: 'status', value }]).has('status')
}
