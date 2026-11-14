/** Parts are introduced only for manual v2; timed and untouched legacy entries stay v1. */
export function workoutDocumentVersion(value: object): 1 | 2 {
  return 'source' in value && value.source === 'manual' && 'parts' in value && value.parts !== undefined ? 2 : 1
}
