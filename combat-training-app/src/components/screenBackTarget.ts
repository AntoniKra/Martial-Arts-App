/** React Router's index counts entries created inside this application, unlike history.length. */
export function screenBackTarget(state: unknown, fallback: string): -1 | string {
  return typeof state === 'object' && state !== null && 'idx' in state
    && typeof state.idx === 'number' && Number.isInteger(state.idx) && state.idx > 0 ? -1 : fallback
}
