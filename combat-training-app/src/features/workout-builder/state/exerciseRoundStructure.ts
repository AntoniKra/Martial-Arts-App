export interface RoundStructureSegment {
  kind: 'work' | 'rest'
  seconds: number
}

export interface RoundStructure {
  segments: RoundStructureSegment[]
  workSeconds: number
  restSeconds: number
  totalSeconds: number
  /** Many rounds: segments are drawn without gaps so the bar stays readable. */
  compact: boolean
}

const COMPACT_ROUND_COUNT = 12

export function buildRoundStructure({ roundCount, roundDurationSeconds, restSeconds }: {
  roundCount: number
  roundDurationSeconds: number
  restSeconds: number
}): RoundStructure {
  const segments: RoundStructureSegment[] = []
  for (let round = 1; round <= roundCount; round += 1) {
    segments.push({ kind: 'work', seconds: roundDurationSeconds })
    if (round < roundCount && restSeconds > 0) segments.push({ kind: 'rest', seconds: restSeconds })
  }
  const workSeconds = roundCount * roundDurationSeconds
  const totalRestSeconds = (roundCount - 1) * restSeconds
  return {
    segments,
    workSeconds,
    restSeconds: totalRestSeconds,
    totalSeconds: workSeconds + totalRestSeconds,
    compact: roundCount > COMPACT_ROUND_COUNT,
  }
}
