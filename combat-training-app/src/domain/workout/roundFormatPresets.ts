export const ROUND_FORMAT_PRESETS = [
  {
    id: 'three-by-three-rest-60',
    label: '3 × 3:00 · przerwa 1:00',
    roundCount: 3,
    roundDurationSeconds: 180,
    restBetweenRoundsSeconds: 60,
  },
  {
    id: 'three-by-three-rest-30',
    label: '3 × 3:00 · przerwa 0:30',
    description: 'Przerwa treningowa',
    roundCount: 3,
    roundDurationSeconds: 180,
    restBetweenRoundsSeconds: 30,
  },
  {
    id: 'three-by-two-rest-60',
    label: '3 × 2:00 · przerwa 1:00',
    roundCount: 3,
    roundDurationSeconds: 120,
    restBetweenRoundsSeconds: 60,
  },
] as const

export type RoundFormatId = (typeof ROUND_FORMAT_PRESETS)[number]['id']
export type RoundFormatPreset = (typeof ROUND_FORMAT_PRESETS)[number]
