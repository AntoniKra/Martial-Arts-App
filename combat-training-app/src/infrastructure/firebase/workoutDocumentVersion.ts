/** New links/parts use v2; reading legacy documents does not rewrite them. */
export function workoutDocumentVersion(value: object): 1 | 2 {
  if ('exerciseId' in value && value.exerciseId !== undefined) return 2
  if ('stepResults' in value && Array.isArray(value.stepResults) && value.stepResults.some((step: unknown) =>
    typeof step === 'object' && step !== null && 'combinationId' in step && step.combinationId !== undefined)) return 2
  return 'source' in value && value.source === 'manual' && 'parts' in value && value.parts !== undefined ? 2 : 1
}
