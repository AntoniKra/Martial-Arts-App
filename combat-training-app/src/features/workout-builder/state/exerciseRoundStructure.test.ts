import { describe, expect, it } from 'vitest'

import { buildRoundStructure } from './exerciseRoundStructure'

describe('buildRoundStructure', () => {
  it('lists every round and every rest between rounds with the total time', () => {
    expect(buildRoundStructure({ roundCount: 3, roundDurationSeconds: 180, restSeconds: 60 })).toEqual({
      segments: [
        { kind: 'work', seconds: 180 },
        { kind: 'rest', seconds: 60 },
        { kind: 'work', seconds: 180 },
        { kind: 'rest', seconds: 60 },
        { kind: 'work', seconds: 180 },
      ],
      workSeconds: 540,
      restSeconds: 120,
      totalSeconds: 660,
      compact: false,
    })
  })

  it('leaves out rests of zero seconds and the rest after the last round', () => {
    expect(buildRoundStructure({ roundCount: 2, roundDurationSeconds: 60, restSeconds: 0 }).segments)
      .toEqual([{ kind: 'work', seconds: 60 }, { kind: 'work', seconds: 60 }])
    expect(buildRoundStructure({ roundCount: 1, roundDurationSeconds: 90, restSeconds: 60 })).toMatchObject({
      segments: [{ kind: 'work', seconds: 90 }],
      restSeconds: 0,
      totalSeconds: 90,
    })
  })

  it('packs the bar without gaps above 12 rounds', () => {
    expect(buildRoundStructure({ roundCount: 12, roundDurationSeconds: 60, restSeconds: 30 }).compact).toBe(false)
    const many = buildRoundStructure({ roundCount: 13, roundDurationSeconds: 60, restSeconds: 30 })
    expect(many.compact).toBe(true)
    expect(many.segments).toHaveLength(25)
    expect(many.totalSeconds).toBe(13 * 60 + 12 * 30)
  })
})
