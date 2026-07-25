import type { Combination } from '@/domain/combination/combination.types'
import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import type { WorkoutBlockType } from '@/domain/workout/workout.types'

/** All five standing disciplines — boxing through MMA striking. */
const ALL_STRIKING = [
  'boxing',
  'kickboxing',
  'muay_thai',
  'k1',
  'mma_striking',
] as const satisfies readonly DisciplineKey[]

/** Boxing-style hand combinations — excludes Muay Thai–specific entries. */
const BOXING_STYLE = ['boxing', 'kickboxing', 'k1', 'mma_striking'] as const satisfies readonly DisciplineKey[]

/** Disciplines that allow kicks (low kick, body kick, teep) — excludes boxing. */
const KICKING_STRIKING = [
  'kickboxing',
  'muay_thai',
  'k1',
  'mma_striking',
] as const satisfies readonly DisciplineKey[]

/** Muay Thai, K-1 and MMA — knees, elbows and extended clinch work. */
const MUAY_K1_MMA = ['muay_thai', 'k1', 'mma_striking'] as const satisfies readonly DisciplineKey[]

function fixture(
  id: string,
  combinationKey: string,
  namePl: string,
  disciplineKeys: readonly DisciplineKey[],
  blockTypes: readonly WorkoutBlockType[],
): Combination {
  return {
    id,
    combinationKey,
    namePl,
    nameEn: null,
    disciplineKeys: [...disciplineKeys],
    blockTypes: [...blockTypes],
    isSystem: true,
    isActive: true,
  }
}

export const EXERCISE_LIBRARY_FIXTURES: Combination[] = [
  // Technika — bogata biblioteka
  fixture('combo-jab-cross', 'jab-cross', 'Jab → prawy prosty', ALL_STRIKING, [
    'technique',
    'pads',
    'bag',
  ]),
  fixture(
    'combo-jab-cross-hook',
    'jab-cross-hook',
    'Jab → prawy prosty → lewy sierpowy',
    ALL_STRIKING,
    ['technique', 'pads', 'bag'],
  ),
  fixture(
    'combo-jab-slip-cross',
    'jab-slip-cross',
    'Jab → zejście pod prawy sierpowy → prawy prosty',
    BOXING_STYLE,
    ['technique'],
  ),
  fixture(
    'combo-double-jab-cross',
    'double-jab-cross',
    'Podwójny jab → prawy prosty',
    ALL_STRIKING,
    ['technique', 'pads'],
  ),
  fixture(
    'combo-jab-body-cross',
    'jab-body-cross',
    'Jab → prosty w korpus → prawy prosty',
    ALL_STRIKING,
    ['technique'],
  ),
  fixture(
    'combo-cross-hook-cross',
    'cross-hook-cross',
    'Prawy prosty → lewy sierpowy → prawy prosty',
    ALL_STRIKING,
    ['technique'],
  ),
  fixture(
    'combo-jab-cross-low-kick',
    'jab-cross-low-kick',
    'Jab → prawy prosty → lewy low kick',
    KICKING_STRIKING,
    ['technique', 'pads', 'bag'],
  ),
  fixture(
    'combo-jab-cross-body-kick',
    'jab-cross-body-kick',
    'Jab → prawy prosty → lewe kopnięcie na korpus',
    KICKING_STRIKING,
    ['technique', 'pads', 'bag'],
  ),
  fixture(
    'combo-teep-jab-cross',
    'teep-jab-cross',
    'Kopnięcie frontalne → jab → prawy prosty',
    KICKING_STRIKING,
    ['technique'],
  ),
  fixture(
    'combo-check-hook',
    'check-hook',
    'Check → lewy sierpowy',
    KICKING_STRIKING,
    ['technique'],
  ),
  fixture(
    'combo-jab-cross-knee',
    'jab-cross-knee',
    'Jab → prawy prosty → prawe kolano',
    MUAY_K1_MMA,
    ['technique'],
  ),
  fixture(
    'combo-footwork-angles',
    'footwork-angles',
    'Praca nóg — zmiana kąta po kombinacji',
    ALL_STRIKING,
    ['technique'],
  ),

  // Tarcze — unikalne kombinacje
  fixture(
    'pads-hook-cross-hook',
    'pads-hook-cross-hook',
    'Lewy sierpowy → prawy prosty → lewy sierpowy',
    ALL_STRIKING,
    ['pads'],
  ),
  fixture(
    'pads-counter-cross',
    'pads-counter-cross',
    'Kontra — prawy prosty po jabie trenera',
    ALL_STRIKING,
    ['pads'],
  ),
  fixture(
    'pads-burst-6',
    'pads-burst-6',
    'Seria sześciu uderzeń — dowolna kombinacja',
    ALL_STRIKING,
    ['pads'],
  ),

  // Worek
  fixture(
    'bag-free-combinations',
    'bag-free-combinations',
    'Wolne kombinacje — utrzymanie tempa',
    ALL_STRIKING,
    ['bag'],
  ),
  fixture(
    'bag-power-crosses',
    'bag-power-crosses',
    'Seria mocnych prostych',
    ALL_STRIKING,
    ['bag'],
  ),
  fixture(
    'bag-body-work',
    'bag-body-work',
    'Praca w korpus — jab i prosty na tułów',
    ALL_STRIKING,
    ['bag'],
  ),
  fixture(
    'bag-defence-counter',
    'bag-defence-counter',
    'Obrona → kontra na worek',
    ALL_STRIKING,
    ['bag'],
  ),

  // Rozgrzewka
  fixture(
    'warmup-shadowboxing',
    'warmup-shadowboxing',
    'Shadowboxing — lekka praca rąk i nóg',
    ALL_STRIKING,
    ['warmup'],
  ),
  fixture(
    'warmup-jump-rope',
    'warmup-jump-rope',
    'Skakanka — rytm i mobilność stóp',
    ALL_STRIKING,
    ['warmup'],
  ),
  fixture(
    'warmup-dynamic-stretch',
    'warmup-dynamic-stretch',
    'Mobilizacja dynamiczna — barki i biodra',
    ALL_STRIKING,
    ['warmup'],
  ),
  fixture(
    'warmup-footwork-ladder',
    'warmup-footwork-ladder',
    'Drabinka koordynacyjna',
    ALL_STRIKING,
    ['warmup'],
  ),

  // Sparing
  fixture(
    'sparring-technical',
    'sparring-technical',
    'Sparing techniczny — kontrolowane tempo',
    ALL_STRIKING,
    ['sparring'],
  ),
  fixture(
    'sparring-light',
    'sparring-light',
    'Sparing lekki — praca na dystans',
    ALL_STRIKING,
    ['sparring'],
  ),
  fixture(
    'sparring-position',
    'sparring-position',
    'Sparing pozycyjny — presja na linii',
    ALL_STRIKING,
    ['sparring'],
  ),

  // Kondycja
  fixture(
    'cond-shuttle-runs',
    'cond-shuttle-runs',
    'Bieg wahadłowy — interwały',
    ALL_STRIKING,
    ['conditioning'],
  ),
  fixture(
    'cond-burpees',
    'cond-burpees',
    'Seria burpees',
    ALL_STRIKING,
    ['conditioning'],
  ),
  fixture(
    'cond-core-circuit',
    'cond-core-circuit',
    'Obwód core — plank i rotacje',
    ALL_STRIKING,
    ['conditioning'],
  ),
  fixture(
    'cond-assault-bike',
    'cond-assault-bike',
    'Rower air — interwały wysokiej intensywności',
    ALL_STRIKING,
    ['conditioning'],
  ),

  // Siła i motoryka
  fixture(
    'snc-kettlebell-swings',
    'snc-kettlebell-swings',
    'Swing kettlebell — seria powtórzeń',
    ALL_STRIKING,
    ['strengthAndConditioning'],
  ),
  fixture(
    'snc-push-pull-circuit',
    'snc-push-pull-circuit',
    'Obwód pchnięcie — przyciąganie',
    ALL_STRIKING,
    ['strengthAndConditioning'],
  ),
  fixture(
    'snc-med-ball-throws',
    'snc-med-ball-throws',
    'Rzuty piłką lekarską — eksplozja',
    ALL_STRIKING,
    ['strengthAndConditioning'],
  ),
  fixture(
    'snc-sled-push',
    'snc-sled-push',
    'Pchnięcie sanek — moc nóg',
    ALL_STRIKING,
    ['strengthAndConditioning'],
  ),
]
