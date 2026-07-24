import { useState, useEffect, useCallback } from 'react'

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Discipline = 'Boxing' | 'Kickboxing' | 'Muay Thai' | 'K-1' | 'MMA Striking'
type BlockType =
  | 'Warm-up'
  | 'Technique'
  | 'Pads'
  | 'Heavy Bag'
  | 'Sparring'
  | 'Conditioning'
  | 'Strength & Athletic'
type Screen =
  | 'home'
  | 'workouts'
  | 'create'
  | 'library'
  | 'configure'
  | 'preview'
  | 'active'
  | 'post-workout'
  | 'report'

interface Exercise {
  id: string
  name: string
  rounds: number
  roundDuration: number
  restBetweenRounds: number
  instruction?: string
}

interface WorkoutBlock {
  id: string
  type: BlockType
  exercises: Exercise[]
}

interface WorkoutPlan {
  id: string
  name: string
  discipline: Discipline
  goal?: string
  blocks: WorkoutBlock[]
  createdAt: string
}

interface ExerciseRating {
  exerciseId: string
  exerciseName: string
  blockType: BlockType
  rating: number
}

interface CompletedWorkout {
  id: string
  planId: string
  name: string
  discipline: Discipline
  goal?: string
  startTime: string
  duration: number
  plannedRounds: number
  completedRounds: number
  plannedExercises: number
  completedExercises: number
  rpe?: number
  concentration?: number
  discomfort?: number
  goalCompletion?: number
  perceivedProgress?: number
  conclusions?: string
  exerciseRatings: ExerciseRating[]
  skippedExercises: string[]
}

interface TimerEl {
  id: string
  type: 'work' | 'rest'
  duration: number
  exerciseName: string
  blockType: BlockType
  round: number
  totalRounds: number
  exerciseId: string
}

interface Combo {
  id: string
  name: string
  disciplines: Discipline[]
  blockTypes: BlockType[]
}

// ─── SAMPLE DATA ──────────────────────────────────────────────────────────────

const PLANS: WorkoutPlan[] = [
  {
    id: 'p1',
    name: 'Orthodox Fundamentals',
    discipline: 'Boxing',
    goal: 'Sharpen jab-cross timing and head movement',
    createdAt: '2026-07-15T10:00:00Z',
    blocks: [
      {
        id: 'b1-1',
        type: 'Warm-up',
        exercises: [
          { id: 'e1-1-1', name: 'Shadow Boxing', rounds: 3, roundDuration: 180, restBetweenRounds: 60 },
        ],
      },
      {
        id: 'b1-2',
        type: 'Technique',
        exercises: [
          { id: 'e1-2-1', name: 'Jab → Cross', rounds: 3, roundDuration: 120, restBetweenRounds: 30 },
          { id: 'e1-2-2', name: 'Jab → Cross → Lead Hook', rounds: 3, roundDuration: 120, restBetweenRounds: 30 },
        ],
      },
      {
        id: 'b1-3',
        type: 'Heavy Bag',
        exercises: [
          {
            id: 'e1-3-1',
            name: 'Jab → Cross → Lead Hook → Cross',
            rounds: 3,
            roundDuration: 180,
            restBetweenRounds: 60,
            instruction: 'Stay compact. Reset guard between combinations.',
          },
          {
            id: 'e1-3-2',
            name: 'Lead Body Hook → Cross → Lead Hook',
            rounds: 3,
            roundDuration: 180,
            restBetweenRounds: 60,
          },
        ],
      },
      {
        id: 'b1-4',
        type: 'Pads',
        exercises: [
          { id: 'e1-4-1', name: 'Jab → Cross → Lead Hook → Body Cross', rounds: 4, roundDuration: 180, restBetweenRounds: 60 },
        ],
      },
      {
        id: 'b1-5',
        type: 'Conditioning',
        exercises: [
          { id: 'e1-5-1', name: 'Jump Rope Intervals', rounds: 3, roundDuration: 180, restBetweenRounds: 60 },
        ],
      },
    ],
  },
  {
    id: 'p2',
    name: 'Muay Thai Artillery',
    discipline: 'Muay Thai',
    goal: 'Build powerful low kick and teep combination flow',
    createdAt: '2026-07-18T09:00:00Z',
    blocks: [
      {
        id: 'b2-1',
        type: 'Warm-up',
        exercises: [
          { id: 'e2-1-1', name: 'Shadow Boxing with Kicks', rounds: 3, roundDuration: 180, restBetweenRounds: 60 },
        ],
      },
      {
        id: 'b2-2',
        type: 'Technique',
        exercises: [
          { id: 'e2-2-1', name: 'Jab → Cross → Low Kick', rounds: 3, roundDuration: 120, restBetweenRounds: 30 },
          { id: 'e2-2-2', name: 'Lead Teep → Cross → Lead Round Kick', rounds: 3, roundDuration: 120, restBetweenRounds: 30 },
        ],
      },
      {
        id: 'b2-3',
        type: 'Heavy Bag',
        exercises: [
          {
            id: 'e2-3-1',
            name: 'Rear Low Kick → Jab → Cross',
            rounds: 3,
            roundDuration: 180,
            restBetweenRounds: 60,
          },
          {
            id: 'e2-3-2',
            name: 'Lead Hook → Cross → Lead Knee',
            rounds: 3,
            roundDuration: 180,
            restBetweenRounds: 60,
            instruction: 'Drive through the knee. Clinch position finish.',
          },
        ],
      },
      {
        id: 'b2-4',
        type: 'Pads',
        exercises: [
          { id: 'e2-4-1', name: 'Jab → Cross → Lead Elbow', rounds: 5, roundDuration: 180, restBetweenRounds: 60 },
        ],
      },
      {
        id: 'b2-5',
        type: 'Sparring',
        exercises: [
          { id: 'e2-5-1', name: 'Technical Sparring', rounds: 3, roundDuration: 180, restBetweenRounds: 60 },
        ],
      },
    ],
  },
  {
    id: 'p3',
    name: 'MMA Striking Integration',
    discipline: 'MMA Striking',
    goal: 'Integrate striking with level changes and takedown threats',
    createdAt: '2026-07-20T08:00:00Z',
    blocks: [
      {
        id: 'b3-1',
        type: 'Warm-up',
        exercises: [
          { id: 'e3-1-1', name: 'Dynamic Striking Warm-up', rounds: 2, roundDuration: 300, restBetweenRounds: 60 },
        ],
      },
      {
        id: 'b3-2',
        type: 'Technique',
        exercises: [
          { id: 'e3-2-1', name: 'Jab → Cross → Level Change', rounds: 3, roundDuration: 120, restBetweenRounds: 30 },
          {
            id: 'e3-2-2',
            name: 'Jab → Cross → Lead Hook → Takedown Feint',
            rounds: 3,
            roundDuration: 120,
            restBetweenRounds: 30,
          },
        ],
      },
      {
        id: 'b3-3',
        type: 'Heavy Bag',
        exercises: [
          {
            id: 'e3-3-1',
            name: 'Lead Body Kick → Cross → Lead Hook',
            rounds: 3,
            roundDuration: 300,
            restBetweenRounds: 60,
            instruction: 'Reset stance fully between reps. Control the distance.',
          },
        ],
      },
      {
        id: 'b3-4',
        type: 'Pads',
        exercises: [
          { id: 'e3-4-1', name: 'Jab → Rear Head Kick → Lead Hook', rounds: 5, roundDuration: 300, restBetweenRounds: 60 },
        ],
      },
      {
        id: 'b3-5',
        type: 'Conditioning',
        exercises: [
          { id: 'e3-5-1', name: 'Sprawl Intervals', rounds: 5, roundDuration: 60, restBetweenRounds: 30 },
        ],
      },
    ],
  },
]

const HISTORY: CompletedWorkout[] = [
  {
    id: 'h1',
    planId: 'p1',
    name: 'Orthodox Fundamentals',
    discipline: 'Boxing',
    goal: 'Sharpen jab-cross timing and head movement',
    startTime: '2026-07-20T10:15:00Z',
    duration: 3060,
    plannedRounds: 22,
    completedRounds: 20,
    plannedExercises: 7,
    completedExercises: 6,
    rpe: 7,
    concentration: 4,
    discomfort: 2,
    goalCompletion: 4,
    perceivedProgress: 5,
    conclusions:
      'Body hook timing is improving. Still dropping the right hand after the jab. Focus on chin tuck next session.',
    exerciseRatings: [
      { exerciseId: 'e1-1-1', exerciseName: 'Shadow Boxing', blockType: 'Warm-up', rating: 4 },
      { exerciseId: 'e1-2-1', exerciseName: 'Jab → Cross', blockType: 'Technique', rating: 5 },
      { exerciseId: 'e1-2-2', exerciseName: 'Jab → Cross → Lead Hook', blockType: 'Technique', rating: 4 },
      { exerciseId: 'e1-3-1', exerciseName: 'Jab → Cross → Lead Hook → Cross', blockType: 'Heavy Bag', rating: 3 },
      { exerciseId: 'e1-3-2', exerciseName: 'Lead Body Hook → Cross → Lead Hook', blockType: 'Heavy Bag', rating: 4 },
      {
        exerciseId: 'e1-4-1',
        exerciseName: 'Jab → Cross → Lead Hook → Body Cross',
        blockType: 'Pads',
        rating: 4,
      },
    ],
    skippedExercises: ['e1-5-1'],
  },
  {
    id: 'h2',
    planId: 'p2',
    name: 'Muay Thai Artillery',
    discipline: 'Muay Thai',
    goal: 'Build powerful low kick and teep combination flow',
    startTime: '2026-07-18T09:30:00Z',
    duration: 3480,
    plannedRounds: 20,
    completedRounds: 20,
    plannedExercises: 7,
    completedExercises: 7,
    rpe: 8,
    concentration: 5,
    discomfort: 3,
    goalCompletion: 5,
    perceivedProgress: 6,
    conclusions:
      'Best session in two weeks. Teep-to-low kick transition felt natural. Elbow accuracy still needs work — practice slow-motion drilling separately.',
    exerciseRatings: [
      { exerciseId: 'e2-1-1', exerciseName: 'Shadow Boxing with Kicks', blockType: 'Warm-up', rating: 4 },
      { exerciseId: 'e2-2-1', exerciseName: 'Jab → Cross → Low Kick', blockType: 'Technique', rating: 5 },
      {
        exerciseId: 'e2-2-2',
        exerciseName: 'Lead Teep → Cross → Lead Round Kick',
        blockType: 'Technique',
        rating: 5,
      },
      { exerciseId: 'e2-3-1', exerciseName: 'Rear Low Kick → Jab → Cross', blockType: 'Heavy Bag', rating: 4 },
      { exerciseId: 'e2-3-2', exerciseName: 'Lead Hook → Cross → Lead Knee', blockType: 'Heavy Bag', rating: 4 },
      { exerciseId: 'e2-4-1', exerciseName: 'Jab → Cross → Lead Elbow', blockType: 'Pads', rating: 3 },
      { exerciseId: 'e2-5-1', exerciseName: 'Technical Sparring', blockType: 'Sparring', rating: 5 },
    ],
    skippedExercises: [],
  },
  {
    id: 'h3',
    planId: 'p3',
    name: 'MMA Striking Integration',
    discipline: 'MMA Striking',
    goal: 'Integrate striking with level changes and takedown threats',
    startTime: '2026-07-15T08:00:00Z',
    duration: 2820,
    plannedRounds: 18,
    completedRounds: 14,
    plannedExercises: 7,
    completedExercises: 5,
    rpe: 9,
    concentration: 3,
    discomfort: 4,
    goalCompletion: 3,
    perceivedProgress: 4,
    conclusions: 'Fatigue hit hard in the last pad round. Level changes too slow under pressure.',
    exerciseRatings: [
      { exerciseId: 'e3-1-1', exerciseName: 'Dynamic Striking Warm-up', blockType: 'Warm-up', rating: 4 },
      { exerciseId: 'e3-2-1', exerciseName: 'Jab → Cross → Level Change', blockType: 'Technique', rating: 3 },
      {
        exerciseId: 'e3-2-2',
        exerciseName: 'Jab → Cross → Lead Hook → Takedown Feint',
        blockType: 'Technique',
        rating: 3,
      },
      { exerciseId: 'e3-3-1', exerciseName: 'Lead Body Kick → Cross → Lead Hook', blockType: 'Heavy Bag', rating: 4 },
      { exerciseId: 'e3-4-1', exerciseName: 'Jab → Rear Head Kick → Lead Hook', blockType: 'Pads', rating: 2 },
    ],
    skippedExercises: ['e3-5-1', 'e3-4-1'],
  },
]

const COMBOS: Combo[] = [
  { id: 'c1', name: 'Jab → Cross', disciplines: ['Boxing', 'Kickboxing', 'Muay Thai', 'K-1', 'MMA Striking'], blockTypes: ['Technique', 'Heavy Bag', 'Pads'] },
  { id: 'c2', name: 'Jab → Cross → Lead Hook', disciplines: ['Boxing', 'Kickboxing', 'Muay Thai', 'K-1', 'MMA Striking'], blockTypes: ['Technique', 'Heavy Bag', 'Pads'] },
  { id: 'c3', name: 'Jab → Cross → Lead Hook → Cross', disciplines: ['Boxing', 'Kickboxing', 'Muay Thai', 'K-1', 'MMA Striking'], blockTypes: ['Technique', 'Heavy Bag', 'Pads'] },
  { id: 'c4', name: 'Cross → Lead Hook → Cross', disciplines: ['Boxing', 'Kickboxing', 'K-1'], blockTypes: ['Technique', 'Heavy Bag', 'Pads'] },
  { id: 'c5', name: 'Jab → Lead Hook → Cross', disciplines: ['Boxing', 'Kickboxing', 'Muay Thai', 'K-1', 'MMA Striking'], blockTypes: ['Technique', 'Heavy Bag', 'Pads'] },
  { id: 'c6', name: 'Jab × 2 → Cross → Lead Hook', disciplines: ['Boxing', 'Kickboxing'], blockTypes: ['Technique', 'Heavy Bag', 'Pads'] },
  { id: 'c7', name: 'Lead Hook → Cross → Lead Hook', disciplines: ['Boxing', 'Kickboxing', 'K-1'], blockTypes: ['Technique', 'Heavy Bag', 'Pads'] },
  { id: 'c8', name: 'Overhand Right → Lead Hook → Cross', disciplines: ['Boxing', 'Kickboxing', 'K-1', 'MMA Striking'], blockTypes: ['Technique', 'Heavy Bag', 'Pads'] },
  { id: 'c9', name: 'Lead Body Hook → Cross → Lead Hook', disciplines: ['Boxing', 'Kickboxing', 'Muay Thai', 'K-1', 'MMA Striking'], blockTypes: ['Technique', 'Heavy Bag', 'Pads'] },
  { id: 'c10', name: 'Jab → Cross → Lead Body Hook', disciplines: ['Boxing', 'Kickboxing', 'Muay Thai', 'K-1', 'MMA Striking'], blockTypes: ['Technique', 'Heavy Bag', 'Pads'] },
  { id: 'c11', name: 'Jab → Cross → Low Kick', disciplines: ['Muay Thai', 'K-1', 'Kickboxing'], blockTypes: ['Technique', 'Heavy Bag', 'Pads'] },
  { id: 'c12', name: 'Lead Teep → Cross → Lead Round Kick', disciplines: ['Muay Thai'], blockTypes: ['Technique', 'Heavy Bag', 'Pads'] },
  { id: 'c13', name: 'Lead Hook → Cross → Lead Knee', disciplines: ['Muay Thai', 'MMA Striking'], blockTypes: ['Technique', 'Heavy Bag', 'Pads'] },
  { id: 'c14', name: 'Jab → Cross → Lead Elbow', disciplines: ['Muay Thai'], blockTypes: ['Technique', 'Heavy Bag', 'Pads'] },
  { id: 'c15', name: 'Rear Low Kick → Jab → Cross', disciplines: ['Muay Thai', 'K-1', 'Kickboxing'], blockTypes: ['Technique', 'Heavy Bag', 'Pads'] },
  { id: 'c16', name: 'Body Cross → Lead High Kick', disciplines: ['Muay Thai', 'K-1'], blockTypes: ['Technique', 'Heavy Bag', 'Pads'] },
  { id: 'c17', name: 'Jab → Cross → Level Change', disciplines: ['MMA Striking'], blockTypes: ['Technique', 'Heavy Bag', 'Pads'] },
  { id: 'c18', name: 'Jab → Cross → Lead Hook → Takedown Feint', disciplines: ['MMA Striking'], blockTypes: ['Technique', 'Heavy Bag', 'Pads'] },
  { id: 'c19', name: 'Lead Body Kick → Cross → Lead Hook', disciplines: ['MMA Striking', 'Muay Thai', 'K-1'], blockTypes: ['Technique', 'Heavy Bag', 'Pads'] },
  { id: 'c20', name: 'Jab → Rear Head Kick → Lead Hook', disciplines: ['MMA Striking', 'Muay Thai', 'K-1'], blockTypes: ['Technique', 'Heavy Bag', 'Pads'] },
  { id: 'c21', name: 'Shadow Boxing', disciplines: ['Boxing', 'Kickboxing', 'Muay Thai', 'K-1', 'MMA Striking'], blockTypes: ['Warm-up'] },
  { id: 'c22', name: 'Shadow Boxing with Kicks', disciplines: ['Muay Thai', 'K-1', 'Kickboxing', 'MMA Striking'], blockTypes: ['Warm-up'] },
  { id: 'c23', name: 'Jump Rope', disciplines: ['Boxing', 'Kickboxing', 'Muay Thai', 'K-1', 'MMA Striking'], blockTypes: ['Warm-up', 'Conditioning'] },
  { id: 'c24', name: 'Jump Rope Intervals', disciplines: ['Boxing', 'Kickboxing', 'Muay Thai', 'K-1', 'MMA Striking'], blockTypes: ['Conditioning'] },
  { id: 'c25', name: 'Sprawl Intervals', disciplines: ['MMA Striking'], blockTypes: ['Conditioning'] },
  { id: 'c26', name: 'Technical Sparring', disciplines: ['Boxing', 'Kickboxing', 'Muay Thai', 'K-1', 'MMA Striking'], blockTypes: ['Sparring'] },
  { id: 'c27', name: 'Slip Lead → Cross → Lead Hook → Cross', disciplines: ['Boxing', 'Kickboxing'], blockTypes: ['Technique', 'Pads'] },
  { id: 'c28', name: 'Jab → Cross → Lead Uppercut → Cross', disciplines: ['Boxing', 'Kickboxing', 'K-1', 'MMA Striking'], blockTypes: ['Technique', 'Heavy Bag', 'Pads'] },
]

const DISCIPLINES: Discipline[] = ['Boxing', 'Kickboxing', 'Muay Thai', 'K-1', 'MMA Striking']
const BLOCK_TYPES: BlockType[] = ['Warm-up', 'Technique', 'Pads', 'Heavy Bag', 'Sparring', 'Conditioning', 'Strength & Athletic']
const ROUND_PRESETS = [1, 2, 3, 4, 5]
const DURATION_PRESETS = [60, 90, 120, 180]
const REST_PRESETS = [30, 60, 90, 120]
const RPE_LABELS = ['Rest', 'Very Easy', 'Easy', 'Moderate', 'Somewhat Hard', 'Hard', 'Hard+', 'Very Hard', 'Very Hard+', 'Max Effort', 'All Out']
const EXEC_LABELS = ['', 'Unable to follow', 'Many mistakes', 'Partially correct', 'Good, repeatable', 'Very good, fluid']
const PROGRESS_LABELS = ['', 'Much worse', 'Worse', 'Slightly worse', 'No change', 'Slightly better', 'Better', 'Much better']
const CONC_LABELS = ['', 'Completely distracted', 'Mostly distracted', 'Mixed focus', 'Mostly focused', 'Full concentration']

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmtTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function fmtDuration(s: number) {
  if (s < 3600) {
    const m = Math.floor(s / 60)
    return `${m} min`
  }
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

function calcPlanStats(plan: WorkoutPlan) {
  let totalRounds = 0
  let workTime = 0
  let restTime = 0
  let exercises = 0
  for (const block of plan.blocks) {
    for (const ex of block.exercises) {
      exercises++
      totalRounds += ex.rounds
      workTime += ex.rounds * ex.roundDuration
      restTime += (ex.rounds - 1) * ex.restBetweenRounds
    }
  }
  return { totalRounds, workTime, restTime, exercises, estimated: workTime + restTime }
}

function buildSequence(plan: WorkoutPlan): TimerEl[] {
  const seq: TimerEl[] = []
  for (const block of plan.blocks) {
    for (const ex of block.exercises) {
      for (let r = 1; r <= ex.rounds; r++) {
        seq.push({
          id: uid(),
          type: 'work',
          duration: ex.roundDuration,
          exerciseName: ex.name,
          blockType: block.type,
          round: r,
          totalRounds: ex.rounds,
          exerciseId: ex.id,
        })
        if (r < ex.rounds) {
          seq.push({
            id: uid(),
            type: 'rest',
            duration: ex.restBetweenRounds,
            exerciseName: ex.name,
            blockType: block.type,
            round: r,
            totalRounds: ex.rounds,
            exerciseId: ex.id,
          })
        }
      }
    }
  }
  return seq
}

function relativeDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function completionPct(c: CompletedWorkout) {
  return Math.round((c.completedExercises / c.plannedExercises) * 100)
}

function avgRating(ratings: ExerciseRating[]) {
  if (!ratings.length) return null
  return (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
}

// ─── ICONS ───────────────────────────────────────────────────────────────────

function Icon({ d, size = 20, className = '' }: { d: string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={d} />
    </svg>
  )
}

const IHome = () => <Icon d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
const IList = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
)
const IPlus = () => <Icon d="M12 5v14M5 12h14" />
const IChevLeft = () => <Icon d="M15 18l-6-6 6-6" />
const IChevRight = () => <Icon d="M9 18l6-6-6-6" />
const IChevDown = () => <Icon d="M6 9l6 6 6-6" />
const IPlay = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="5,3 19,12 5,21" />
  </svg>
)
const IPause = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
)
const ISkipBack = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="19,20 9,12 19,4" fill="currentColor" stroke="none" />
    <line x1="5" y1="19" x2="5" y2="5" />
  </svg>
)
const ISkipFwd = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5,4 15,12 5,20" fill="currentColor" stroke="none" />
    <line x1="19" y1="5" x2="19" y2="19" />
  </svg>
)
const IX = () => <Icon d="M18 6L6 18M6 6l12 12" />
const ITarget = () => <Icon d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
const ICopy = () => <Icon d="M8 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2M16 8h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2" />
const ITrash = () => <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
const IArrowUp = () => <Icon d="M12 19V5M5 12l7-7 7 7" />
const IArrowDown = () => <Icon d="M12 5v14M5 12l7 7 7-7" />

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────

function RedAccent({ className = '' }: { className?: string }) {
  return <div className={`h-px bg-crimson ${className}`} />
}

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`text-[10px] font-display font-semibold tracking-[0.14em] uppercase text-muted ${className}`}>
      {children}
    </span>
  )
}

function DisciplineBadge({ d }: { d: Discipline }) {
  const colors: Record<Discipline, string> = {
    Boxing: 'text-[#E8A030]',
    Kickboxing: 'text-[#6BAF8A]',
    'Muay Thai': 'text-crimson',
    'K-1': 'text-[#7B9FD4]',
    'MMA Striking': 'text-muted',
  }
  return (
    <span className={`text-[10px] font-display font-semibold tracking-[0.12em] uppercase ${colors[d]}`}>{d}</span>
  )
}

function BlockBadge({ type }: { type: BlockType }) {
  return (
    <span className="text-[9px] font-display font-semibold tracking-[0.12em] uppercase text-faint border border-bd px-1.5 py-0.5">
      {type}
    </span>
  )
}

function Btn({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  disabled?: boolean
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-display font-semibold transition-colors cursor-pointer select-none'
  const sizes = { sm: 'px-3 py-2 text-[12px] tracking-[0.06em]', md: 'px-4 py-3 text-[13px] tracking-[0.06em]', lg: 'px-6 py-4 text-[14px] tracking-[0.08em]' }
  const variants = {
    primary: 'bg-crimson text-ink hover:bg-crimson-hi active:bg-crimson',
    secondary: 'bg-elevated text-ink border border-bd hover:bg-bd active:bg-elevated',
    ghost: 'text-muted hover:text-ink',
    danger: 'bg-crimson/10 text-crimson border border-crimson/30 hover:bg-crimson/20',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  )
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex bg-elevated border border-bd rounded-[4px] overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-2 text-[12px] font-display font-semibold tracking-[0.06em] uppercase transition-colors cursor-pointer
            ${value === opt.value ? 'bg-crimson text-ink' : 'text-muted hover:text-ink'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function QuickSelect({
  label,
  options,
  value,
  onChange,
  format,
}: {
  label: string
  options: number[]
  value: number
  onChange: (v: number) => void
  format: (v: number) => string
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-3 py-2 text-[12px] font-display font-semibold tracking-[0.04em] border transition-colors cursor-pointer
              ${value === opt ? 'border-crimson bg-crimson/10 text-ink' : 'border-bd text-muted hover:text-ink hover:border-muted'}`}
          >
            {format(opt)}
          </button>
        ))}
      </div>
    </div>
  )
}

function StarRating({ value, onChange, max = 5, labels }: { value: number; onChange: (v: number) => void; max?: number; labels?: string[] }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`flex-1 py-3 text-[13px] font-display font-bold border transition-all cursor-pointer
            ${value === n ? 'border-crimson bg-crimson text-ink' : 'border-bd text-muted hover:border-muted hover:text-ink'}`}
          title={labels?.[n]}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function CircularTimer({
  total,
  remaining,
  type,
}: {
  total: number
  remaining: number
  type: 'work' | 'rest'
}) {
  const size = 260
  const sw = 10
  const r = (size - sw) / 2
  const circ = 2 * Math.PI * r
  const progress = total > 0 ? remaining / total : 0
  const offset = circ * (1 - progress)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
        className="absolute"
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2A2A2E" strokeWidth={sw} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={type === 'work' ? '#C1122F' : '#525255'}
          strokeWidth={sw}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="butt"
          className="timer-ring"
        />
      </svg>
      <div className="relative flex flex-col items-center">
        <span
          className="text-[64px] font-display font-bold text-ink tabular-nums leading-none"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {fmtTime(remaining)}
        </span>
        <span className={`text-[10px] font-display font-semibold tracking-[0.18em] uppercase mt-2 ${type === 'work' ? 'text-crimson' : 'text-faint'}`}>
          {type === 'work' ? 'WORK' : 'REST'}
        </span>
      </div>
    </div>
  )
}

// ─── PLAN CARD ────────────────────────────────────────────────────────────────

function PlanCard({ plan, onStart, onPreview }: { plan: WorkoutPlan; onStart: () => void; onPreview: () => void }) {
  const stats = calcPlanStats(plan)
  return (
    <div className="bg-surface border border-bd overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <DisciplineBadge d={plan.discipline} />
            <h3 className="font-display font-semibold text-[15px] text-ink mt-1 leading-snug">{plan.name}</h3>
            {plan.goal && <p className="text-[12px] text-muted mt-0.5 leading-snug">{plan.goal}</p>}
          </div>
        </div>
        <div className="flex gap-4 text-[11px] text-muted font-display">
          <span><span className="text-ink font-semibold">{stats.exercises}</span> exercises</span>
          <span><span className="text-ink font-semibold">{stats.totalRounds}</span> rounds</span>
          <span><span className="text-ink font-semibold">~{Math.round(stats.estimated / 60)}</span> min</span>
        </div>
      </div>
      <div className="border-t border-bd flex">
        <button onClick={onPreview} className="flex-1 py-2.5 text-[11px] font-display font-semibold text-muted tracking-[0.06em] uppercase hover:text-ink transition-colors cursor-pointer">
          Preview
        </button>
        <div className="w-px bg-bd" />
        <button onClick={onStart} className="flex-1 py-2.5 text-[11px] font-display font-semibold text-crimson tracking-[0.06em] uppercase hover:bg-crimson/10 transition-colors cursor-pointer">
          Start
        </button>
      </div>
    </div>
  )
}

function HistoryCard({ cw, onView }: { cw: CompletedWorkout; onView: () => void }) {
  const pct = completionPct(cw)
  const avg = avgRating(cw.exerciseRatings)
  return (
    <button
      onClick={onView}
      className="w-full bg-surface border border-bd text-left overflow-hidden hover:border-muted/50 transition-colors"
    >
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-1">
          <DisciplineBadge d={cw.discipline} />
          <span className="text-[10px] text-muted">{relativeDate(cw.startTime)}</span>
        </div>
        <h3 className="font-display font-semibold text-[14px] text-ink mt-1">{cw.name}</h3>
        <div className="flex gap-4 mt-2 text-[11px] text-muted font-display">
          <span><span className="text-ink font-semibold">{fmtDuration(cw.duration)}</span></span>
          <span><span className="text-ink font-semibold">{pct}%</span> completion</span>
          {cw.rpe != null && <span>RPE <span className="text-ink font-semibold">{cw.rpe}</span></span>}
          {avg && <span>Avg <span className="text-ink font-semibold">{avg}</span>/5</span>}
        </div>
      </div>
      <div className="h-0.5 bg-elevated">
        <div className="h-full bg-crimson transition-all" style={{ width: `${pct}%` }} />
      </div>
    </button>
  )
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────

function BottomNav({
  active,
  navigate,
}: {
  active: Screen
  navigate: (s: Screen) => void
}) {
  return (
    <nav className="shrink-0 bg-surface border-t border-bd safe-area-pb">
      <div className="flex items-stretch h-16 max-w-lg mx-auto">
        <NavItem icon={<IHome />} label="Home" active={active === 'home'} onClick={() => navigate('home')} />
        <NavItem icon={<IList />} label="Workouts" active={active === 'workouts'} onClick={() => navigate('workouts')} />
        <button
          onClick={() => navigate('create')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors
            ${active === 'create' ? 'text-crimson' : 'text-faint hover:text-muted'}`}
        >
          <div className={`w-9 h-9 flex items-center justify-center border ${active === 'create' ? 'border-crimson bg-crimson/10' : 'border-bd'} transition-colors`}>
            <IPlus />
          </div>
          <span className="text-[9px] font-display font-semibold tracking-[0.1em] uppercase">New</span>
        </button>
      </div>
    </nav>
  )
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-1 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors
        ${active ? 'text-ink' : 'text-faint hover:text-muted'}`}
    >
      {icon}
      <span className="text-[9px] font-display font-semibold tracking-[0.1em] uppercase">{label}</span>
      {active && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-crimson" />}
    </button>
  )
}

// ─── SCREEN: HOME ─────────────────────────────────────────────────────────────

function HomeScreen({
  plans,
  history,
  onStart,
  navigate,
  onViewReport,
}: {
  plans: WorkoutPlan[]
  history: CompletedWorkout[]
  onStart: (p: WorkoutPlan) => void
  navigate: (s: Screen) => void
  onViewReport: (c: CompletedWorkout) => void
}) {
  const featured = plans[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Morning session' : hour < 17 ? 'Afternoon session' : 'Evening session'

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-4 space-y-6">
        {/* Header */}
        <div>
          <Label>{greeting}</Label>
          <h1 className="font-display font-bold text-[28px] text-ink mt-1 leading-tight">Ready to train?</h1>
          <RedAccent className="mt-3 w-8" />
        </div>

        {/* Featured plan */}
        {featured && (
          <div>
            <Label className="mb-3 block">Active Plan</Label>
            <div className="bg-surface border border-bd overflow-hidden">
              <div className="px-4 pt-4 pb-1">
                <DisciplineBadge d={featured.discipline} />
                <h2 className="font-display font-bold text-[20px] text-ink mt-1 leading-snug">{featured.name}</h2>
                {featured.goal && (
                  <p className="text-[12px] text-muted mt-1 leading-snug">{featured.goal}</p>
                )}
                {(() => {
                  const s = calcPlanStats(featured)
                  return (
                    <div className="flex gap-5 mt-3 pb-3">
                      {[
                        ['Exercises', s.exercises],
                        ['Rounds', s.totalRounds],
                        ['~Min', Math.round(s.estimated / 60)],
                      ].map(([l, v]) => (
                        <div key={l as string}>
                          <div className="text-[18px] font-display font-bold text-ink tabular-nums">{v}</div>
                          <div className="text-[10px] text-muted font-display tracking-[0.06em] uppercase">{l}</div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
              <RedAccent />
              <button
                onClick={() => onStart(featured)}
                className="w-full py-4 bg-crimson text-ink font-display font-bold text-[14px] tracking-[0.1em] uppercase hover:bg-crimson-hi active:bg-crimson transition-colors cursor-pointer"
              >
                Start Workout
              </button>
            </div>
          </div>
        )}

        {/* Create new */}
        <button
          onClick={() => navigate('create')}
          className="w-full flex items-center justify-between px-4 py-3 bg-elevated border border-bd hover:border-muted/50 transition-colors cursor-pointer"
        >
          <span className="font-display font-semibold text-[13px] text-muted tracking-[0.04em]">Create new workout</span>
          <IChevRight />
        </button>

        {/* Recent sessions */}
        {history.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Recent sessions</Label>
              <button onClick={() => navigate('workouts')} className="text-[10px] text-crimson font-display font-semibold tracking-[0.08em] uppercase cursor-pointer">
                See all
              </button>
            </div>
            <div className="space-y-2">
              {history.slice(0, 3).map((cw) => (
                <HistoryCard key={cw.id} cw={cw} onView={() => onViewReport(cw)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SCREEN: WORKOUTS ─────────────────────────────────────────────────────────

function WorkoutsScreen({
  plans,
  history,
  onStart,
  onPreview,
  onViewReport,
}: {
  plans: WorkoutPlan[]
  history: CompletedWorkout[]
  onStart: (p: WorkoutPlan) => void
  onPreview: (p: WorkoutPlan) => void
  onViewReport: (c: CompletedWorkout) => void
}) {
  const [tab, setTab] = useState<'plans' | 'history'>('plans')
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 pt-6 pb-0 shrink-0 max-w-lg mx-auto w-full">
        <h1 className="font-display font-bold text-[24px] text-ink mb-4">Workouts</h1>
        <SegmentedControl
          options={[{ label: 'Plans', value: 'plans' }, { label: 'History', value: 'history' }]}
          value={tab}
          onChange={setTab}
        />
        <RedAccent className="mt-4" />
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
          {tab === 'plans' ? (
            plans.length > 0
              ? plans.map((p) => <PlanCard key={p.id} plan={p} onStart={() => onStart(p)} onPreview={() => onPreview(p)} />)
              : <EmptyState message="No workout plans yet" action="Create your first workout" />
          ) : (
            history.length > 0
              ? history.map((cw) => <HistoryCard key={cw.id} cw={cw} onView={() => onViewReport(cw)} />)
              : <EmptyState message="No completed workouts" action="Start your first session" />
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ message, action }: { message: string; action: string }) {
  return (
    <div className="py-16 flex flex-col items-center text-center">
      <div className="w-12 h-12 border border-bd flex items-center justify-center mb-4 text-faint">
        <ITarget />
      </div>
      <p className="text-muted font-display font-semibold text-[14px]">{message}</p>
      <p className="text-faint text-[12px] mt-1">{action}</p>
    </div>
  )
}

// ─── SCREEN: CREATE WORKOUT ───────────────────────────────────────────────────

function CreateWorkoutScreen({
  onBack,
  onPreview,
  onAddExercise,
  draft,
  setDraft,
}: {
  onBack: () => void
  onPreview: (plan: WorkoutPlan) => void
  onAddExercise: (blockIdx: number, blockType: BlockType) => void
  draft: WorkoutPlan
  setDraft: (fn: (prev: WorkoutPlan) => WorkoutPlan) => void
}) {
  const [showBlockPicker, setShowBlockPicker] = useState(false)
  const disciplineLocked = draft.blocks.some((b) => b.exercises.length > 0)
  const stats = calcPlanStats(draft)

  function addBlock(type: BlockType) {
    setDraft((p) => ({
      ...p,
      blocks: [...p.blocks, { id: uid(), type, exercises: [] }],
    }))
    setShowBlockPicker(false)
  }

  function removeExercise(bIdx: number, eIdx: number) {
    setDraft((p) => {
      const blocks = p.blocks.map((b, i) =>
        i === bIdx ? { ...b, exercises: b.exercises.filter((_, j) => j !== eIdx) } : b
      )
      return { ...p, blocks: blocks.filter((b) => b.exercises.length > 0 || true) }
    })
  }

  function moveExercise(bIdx: number, eIdx: number, dir: -1 | 1) {
    setDraft((p) => {
      const blocks = [...p.blocks]
      const exs = [...blocks[bIdx].exercises]
      const target = eIdx + dir
      if (target < 0 || target >= exs.length) return p
      ;[exs[eIdx], exs[target]] = [exs[target], exs[eIdx]]
      blocks[bIdx] = { ...blocks[bIdx], exercises: exs }
      return { ...p, blocks }
    })
  }

  function duplicateExercise(bIdx: number, eIdx: number) {
    setDraft((p) => {
      const blocks = [...p.blocks]
      const exs = [...blocks[bIdx].exercises]
      const copy = { ...exs[eIdx], id: uid() }
      exs.splice(eIdx + 1, 0, copy)
      blocks[bIdx] = { ...blocks[bIdx], exercises: exs }
      return { ...p, blocks }
    })
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 bg-surface border-b border-bd px-4 py-3 flex items-center gap-3 max-w-lg mx-auto w-full">
        <button onClick={onBack} className="text-muted hover:text-ink transition-colors cursor-pointer p-1 -ml-1">
          <IChevLeft />
        </button>
        <h1 className="font-display font-bold text-[16px] text-ink flex-1">Create Workout</h1>
        {stats.exercises > 0 && (
          <button
            onClick={() => onPreview(draft)}
            className="text-[11px] font-display font-semibold text-crimson tracking-[0.08em] uppercase cursor-pointer"
          >
            Preview
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
          {/* Discipline */}
          <div>
            <Label className="mb-2 block">Discipline {disciplineLocked && <span className="text-faint normal-case tracking-normal font-normal">· locked</span>}</Label>
            <div className="flex flex-wrap gap-2">
              {DISCIPLINES.map((d) => (
                <button
                  key={d}
                  disabled={disciplineLocked}
                  onClick={() => !disciplineLocked && setDraft((p) => ({ ...p, discipline: d }))}
                  className={`px-3 py-2 text-[11px] font-display font-semibold tracking-[0.06em] border transition-colors cursor-pointer
                    ${draft.discipline === d ? 'border-crimson bg-crimson/10 text-ink' : 'border-bd text-muted hover:text-ink hover:border-muted'}
                    ${disciplineLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <Label className="mb-2 block">Workout Name</Label>
            <input
              value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Monday Bag Work"
              className="w-full bg-elevated border border-bd text-ink text-[14px] px-3 py-3 placeholder:text-faint focus:border-muted outline-none transition-colors font-sans"
            />
          </div>

          {/* Goal */}
          <div>
            <Label className="mb-2 block">Goal <span className="text-faint normal-case tracking-normal font-normal">· optional</span></Label>
            <input
              value={draft.goal ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, goal: e.target.value }))}
              placeholder="e.g. Improve left hook timing"
              className="w-full bg-elevated border border-bd text-ink text-[14px] px-3 py-3 placeholder:text-faint focus:border-muted outline-none transition-colors font-sans"
            />
          </div>

          <RedAccent />

          {/* Workout timeline */}
          <div className="space-y-4">
            {draft.blocks.map((block, bIdx) => (
              <div key={block.id} className="bg-surface border border-bd overflow-hidden">
                <div className="px-3 py-2 bg-elevated flex items-center justify-between border-b border-bd">
                  <BlockBadge type={block.type} />
                  <span className="text-[10px] text-faint">{block.exercises.length} exercises</span>
                </div>
                <div className="divide-y divide-bd">
                  {block.exercises.map((ex, eIdx) => (
                    <div key={ex.id} className="px-3 py-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-ink font-semibold leading-snug truncate">{ex.name}</p>
                          <p className="text-[11px] text-muted mt-0.5">
                            {ex.rounds}×{fmtTime(ex.roundDuration)} · Rest {fmtTime(ex.restBetweenRounds)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => moveExercise(bIdx, eIdx, -1)} disabled={eIdx === 0} className="p-1.5 text-faint hover:text-muted disabled:opacity-30 cursor-pointer"><IArrowUp /></button>
                          <button onClick={() => moveExercise(bIdx, eIdx, 1)} disabled={eIdx === block.exercises.length - 1} className="p-1.5 text-faint hover:text-muted disabled:opacity-30 cursor-pointer"><IArrowDown /></button>
                          <button onClick={() => duplicateExercise(bIdx, eIdx)} className="p-1.5 text-faint hover:text-muted cursor-pointer"><ICopy /></button>
                          <button onClick={() => removeExercise(bIdx, eIdx)} className="p-1.5 text-faint hover:text-crimson cursor-pointer"><ITrash /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => onAddExercise(bIdx, block.type)}
                  className="w-full py-2.5 text-[11px] font-display font-semibold text-muted tracking-[0.06em] uppercase hover:text-ink border-t border-bd transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <IPlus /> Add exercise
                </button>
              </div>
            ))}
          </div>

          {/* Add block */}
          {showBlockPicker ? (
            <div className="bg-surface border border-bd overflow-hidden">
              <div className="px-3 py-2 border-b border-bd flex items-center justify-between">
                <Label>Choose block type</Label>
                <button onClick={() => setShowBlockPicker(false)} className="text-faint hover:text-muted cursor-pointer"><IX /></button>
              </div>
              <div className="divide-y divide-bd">
                {BLOCK_TYPES.map((bt) => (
                  <button
                    key={bt}
                    onClick={() => addBlock(bt)}
                    className="w-full px-4 py-3 text-left text-[13px] font-display font-semibold text-muted hover:text-ink hover:bg-elevated transition-colors cursor-pointer"
                  >
                    {bt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowBlockPicker(true)}
              className="w-full py-3 border border-dashed border-bd text-muted text-[12px] font-display font-semibold tracking-[0.06em] uppercase hover:border-muted/60 hover:text-ink transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <IPlus /> Add workout block
            </button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      {stats.exercises > 0 && (
        <div className="shrink-0 bg-surface border-t border-bd">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex gap-4 text-[11px] font-display text-muted">
              <span><span className="text-ink font-semibold">{stats.exercises}</span> ex</span>
              <span><span className="text-ink font-semibold">{stats.totalRounds}</span> rds</span>
              <span><span className="text-ink font-semibold">{fmtDuration(stats.estimated)}</span></span>
            </div>
            <Btn variant="primary" size="sm" onClick={() => onPreview(draft)}>Preview</Btn>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SCREEN: EXERCISE LIBRARY ─────────────────────────────────────────────────

function ExerciseLibraryScreen({
  discipline,
  blockType,
  onBack,
  onSelect,
}: {
  discipline: Discipline
  blockType: BlockType
  onBack: () => void
  onSelect: (combo: Combo) => void
}) {
  const [tab, setTab] = useState<'library' | 'custom'>('library')
  const [query, setQuery] = useState('')
  const [customName, setCustomName] = useState('')

  const filtered = COMBOS.filter(
    (c) =>
      (c.disciplines.includes(discipline) || c.disciplines.length === DISCIPLINES.length) &&
      c.blockTypes.includes(blockType) &&
      (query === '' || c.name.toLowerCase().includes(query.toLowerCase()))
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="shrink-0 bg-surface border-b border-bd px-4 py-3 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="text-muted hover:text-ink cursor-pointer p-1 -ml-1"><IChevLeft /></button>
          <div className="flex-1">
            <Label>Add exercise</Label>
            <div className="flex items-center gap-2">
              <BlockBadge type={blockType} />
              <span className="text-[10px] text-faint">·</span>
              <DisciplineBadge d={discipline} />
            </div>
          </div>
        </div>
        <SegmentedControl
          options={[{ label: 'Library', value: 'library' }, { label: 'Custom', value: 'custom' }]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'library' && (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search combinations…"
            className="mt-3 w-full bg-elevated border border-bd text-ink text-[13px] px-3 py-2.5 placeholder:text-faint focus:border-muted outline-none transition-colors"
          />
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-3">
          {tab === 'library' ? (
            filtered.length > 0 ? (
              <div className="space-y-1.5">
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c)}
                    className="w-full flex items-center justify-between px-4 py-3.5 bg-surface border border-bd hover:border-muted/50 hover:bg-elevated text-left transition-colors cursor-pointer"
                  >
                    <span className="font-display font-semibold text-[13px] text-ink">{c.name}</span>
                    <IPlus />
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState message="No exercises found" action="Try the Custom tab" />
            )
          ) : (
            <div className="space-y-4 pt-2">
              <div>
                <Label className="mb-2 block">Exercise name</Label>
                <input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Describe the exercise…"
                  className="w-full bg-elevated border border-bd text-ink text-[14px] px-3 py-3 placeholder:text-faint focus:border-muted outline-none transition-colors"
                />
              </div>
              <Btn
                variant="primary"
                size="md"
                disabled={!customName.trim()}
                onClick={() => onSelect({ id: uid(), name: customName.trim(), disciplines: DISCIPLINES, blockTypes: BLOCK_TYPES })}
                className="w-full"
              >
                Continue
              </Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── SCREEN: CONFIGURE EXERCISE ───────────────────────────────────────────────

function ConfigureExerciseScreen({
  combo,
  prevExercise,
  onBack,
  onAdd,
}: {
  combo: Combo
  prevExercise: Exercise | null
  onBack: () => void
  onAdd: (ex: Exercise) => void
}) {
  const [rounds, setRounds] = useState(prevExercise?.rounds ?? 3)
  const [roundDuration, setRoundDuration] = useState(prevExercise?.roundDuration ?? 180)
  const [rest, setRest] = useState(prevExercise?.restBetweenRounds ?? 60)
  const [instruction, setInstruction] = useState('')

  const workTime = rounds * roundDuration
  const restTime = (rounds - 1) * rest
  const totalTime = workTime + restTime

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="shrink-0 bg-surface border-b border-bd px-4 py-3 flex items-center gap-3 max-w-lg mx-auto w-full">
        <button onClick={onBack} className="text-muted hover:text-ink cursor-pointer p-1 -ml-1"><IChevLeft /></button>
        <h1 className="font-display font-bold text-[15px] text-ink flex-1">Configure Exercise</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-5 space-y-6">
          {/* Exercise name */}
          <div>
            <Label className="mb-1 block">Exercise</Label>
            <p className="font-display font-bold text-[18px] text-ink">{combo.name}</p>
          </div>

          <RedAccent />

          <QuickSelect
            label="Number of rounds"
            options={ROUND_PRESETS}
            value={rounds}
            onChange={setRounds}
            format={(v) => String(v)}
          />

          <QuickSelect
            label="Round duration"
            options={DURATION_PRESETS}
            value={roundDuration}
            onChange={setRoundDuration}
            format={fmtTime}
          />

          <QuickSelect
            label="Rest between rounds"
            options={REST_PRESETS}
            value={rest}
            onChange={setRest}
            format={fmtTime}
          />

          {/* Instruction */}
          <div>
            <Label className="mb-2 block">Instruction <span className="text-faint normal-case tracking-normal font-normal">· optional</span></Label>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={2}
              placeholder="Coaching notes for this exercise…"
              className="w-full bg-elevated border border-bd text-ink text-[13px] px-3 py-3 placeholder:text-faint focus:border-muted outline-none transition-colors resize-none"
            />
          </div>

          {/* Summary */}
          <div className="bg-elevated border border-bd px-4 py-3 space-y-2">
            <Label className="mb-2 block">Summary</Label>
            {[
              ['Work', fmtDuration(workTime)],
              ['Rest', fmtDuration(restTime)],
              ['Total', fmtDuration(totalTime)],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between text-[13px]">
                <span className="text-muted">{l}</span>
                <span className="text-ink font-semibold tabular-nums">{v}</span>
              </div>
            ))}
          </div>

          <Btn
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() =>
              onAdd({
                id: uid(),
                name: combo.name,
                rounds,
                roundDuration,
                restBetweenRounds: rest,
                instruction: instruction || undefined,
              })
            }
          >
            Add to Workout
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ─── SCREEN: PREVIEW ─────────────────────────────────────────────────────────

function PreviewScreen({
  plan,
  onBack,
  onSave,
  onStart,
}: {
  plan: WorkoutPlan
  onBack: () => void
  onSave: () => void
  onStart: () => void
}) {
  const stats = calcPlanStats(plan)
  const [expanded, setExpanded] = useState<string[]>(plan.blocks.map((b) => b.id))

  function toggle(id: string) {
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="shrink-0 bg-surface border-b border-bd px-4 py-3 flex items-center gap-3 max-w-lg mx-auto w-full">
        <button onClick={onBack} className="text-muted hover:text-ink cursor-pointer p-1 -ml-1"><IChevLeft /></button>
        <h1 className="font-display font-bold text-[16px] text-ink flex-1">Workout Preview</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
          {/* Header */}
          <div>
            <DisciplineBadge d={plan.discipline} />
            <h2 className="font-display font-bold text-[22px] text-ink mt-1">{plan.name || 'Unnamed Workout'}</h2>
            {plan.goal && <p className="text-[12px] text-muted mt-1">{plan.goal}</p>}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              ['Exercises', stats.exercises],
              ['Rounds', stats.totalRounds],
              ['Duration', `~${Math.round(stats.estimated / 60)}m`],
            ].map(([l, v]) => (
              <div key={l as string} className="bg-elevated border border-bd px-3 py-3 text-center">
                <div className="text-[20px] font-display font-bold text-ink tabular-nums">{v}</div>
                <div className="text-[9px] text-muted font-display tracking-[0.1em] uppercase mt-0.5">{l}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Active Work', fmtDuration(stats.workTime)],
              ['Total Rest', fmtDuration(stats.restTime)],
            ].map(([l, v]) => (
              <div key={l as string} className="bg-elevated border border-bd px-3 py-2 text-center">
                <div className="text-[15px] font-display font-bold text-ink">{v}</div>
                <div className="text-[9px] text-muted font-display tracking-[0.08em] uppercase mt-0.5">{l}</div>
              </div>
            ))}
          </div>

          <RedAccent />

          {/* Blocks */}
          <div className="space-y-2">
            {plan.blocks.map((block) => (
              <div key={block.id} className="bg-surface border border-bd overflow-hidden">
                <button
                  onClick={() => toggle(block.id)}
                  className="w-full px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-elevated transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BlockBadge type={block.type} />
                    <span className="text-[11px] text-muted">{block.exercises.length} exercises</span>
                  </div>
                  <IChevDown />
                </button>
                {expanded.includes(block.id) && (
                  <div className="border-t border-bd divide-y divide-bd">
                    {block.exercises.map((ex) => (
                      <div key={ex.id} className="px-4 py-3">
                        <p className="text-[13px] text-ink font-semibold">{ex.name}</p>
                        <p className="text-[11px] text-muted mt-0.5">
                          {ex.rounds} rounds · {fmtTime(ex.roundDuration)} work · {fmtTime(ex.restBetweenRounds)} rest
                        </p>
                        {ex.instruction && (
                          <p className="text-[11px] text-faint mt-1 italic">{ex.instruction}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pb-4">
            <Btn variant="secondary" size="md" onClick={onSave} className="w-full">Save for Later</Btn>
            <Btn variant="primary" size="md" onClick={onStart} className="w-full">Start Now</Btn>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SCREEN: ACTIVE WORKOUT ───────────────────────────────────────────────────

function ActiveWorkoutScreen({
  sequence,
  onComplete,
  onExit,
}: {
  sequence: TimerEl[]
  onComplete: (ratings: ExerciseRating[]) => void
  onExit: () => void
}) {
  const [idx, setIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(sequence[0]?.duration ?? 0)
  const [isRunning, setIsRunning] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [ratings, setRatings] = useState<ExerciseRating[]>([])
  const [showRate, setShowRate] = useState(false)
  const [prevPressTime, setPrevPressTime] = useState(0)
  const totalDuration = sequence[idx]?.duration ?? 1

  // Timer tick
  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearTimeout(id)
  }, [isRunning, timeLeft])

  // Advance when done
  useEffect(() => {
    if (timeLeft !== 0 || !isRunning || !sequence.length) return
    const id = setTimeout(() => {
      if (idx + 1 < sequence.length) {
        setIdx((i) => i + 1)
        setTimeLeft(sequence[idx + 1]?.duration ?? 0)
        setShowRate(false)
      } else {
        setIsRunning(false)
        onComplete(ratings)
      }
    }, 500)
    return () => clearTimeout(id)
  }, [timeLeft, isRunning, idx])

  function handlePrev() {
    const now = Date.now()
    const timeSincePrev = now - prevPressTime
    setPrevPressTime(now)
    if (timeSincePrev < 1000 && idx > 0) {
      setIdx((i) => i - 1)
      setTimeLeft(sequence[idx - 1]?.duration ?? 0)
    } else {
      setTimeLeft(sequence[idx]?.duration ?? 0)
    }
  }

  function handleNext() {
    if (idx + 1 < sequence.length) {
      setIdx((i) => i + 1)
      setTimeLeft(sequence[idx + 1]?.duration ?? 0)
      setShowRate(false)
    } else {
      setIsRunning(false)
      onComplete(ratings)
    }
  }

  function handleAdjust(delta: number) {
    setTimeLeft((t) => Math.max(0, Math.min(t + delta, totalDuration)))
  }

  function handleRate(rating: number) {
    const el = sequence[idx]
    setRatings((prev) => {
      const existing = prev.findIndex((r) => r.exerciseId === el.exerciseId)
      const entry: ExerciseRating = {
        exerciseId: el.exerciseId,
        exerciseName: el.exerciseName,
        blockType: el.blockType,
        rating,
      }
      if (existing >= 0) {
        const next = [...prev]
        next[existing] = entry
        return next
      }
      return [...prev, entry]
    })
    setShowRate(false)
  }

  const el = sequence[idx]
  if (!el) return null

  const nextEl = sequence[idx + 1]
  const workRoundsCompleted = sequence
    .slice(0, idx)
    .filter((e) => e.type === 'work').length
  const totalWorkRounds = sequence.filter((e) => e.type === 'work').length

  return (
    <div className="flex-1 flex flex-col bg-bg overflow-hidden relative">
      {/* Header */}
      <div className="shrink-0 px-5 pt-5 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-crimson tracking-[0.16em]">{el.blockType}</Label>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-faint font-display">
              {workRoundsCompleted}/{totalWorkRounds} rounds
            </span>
            <button
              onClick={() => setShowMenu(true)}
              className="text-faint hover:text-muted text-[20px] cursor-pointer leading-none pb-0.5"
            >
              ···
            </button>
          </div>
        </div>
      </div>

      {/* Exercise name */}
      <div className="shrink-0 px-5 py-3 text-center">
        <h2 className="font-display font-bold text-[18px] text-ink leading-snug">{el.exerciseName}</h2>
        {el.type === 'work' && (
          <p className="font-display text-[11px] text-muted tracking-[0.12em] uppercase mt-1">
            Round {el.round} of {el.totalRounds}
          </p>
        )}
      </div>

      {/* Timer */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-2">
        <CircularTimer total={totalDuration} remaining={timeLeft} type={el.type} />
      </div>

      {/* Next element */}
      <div className="shrink-0 px-5 pb-3 text-center">
        {nextEl ? (
          <p className="text-[11px] text-muted">
            Next: <span className="text-ink font-semibold">{nextEl.type === 'rest' ? `Rest — ${fmtTime(nextEl.duration)}` : nextEl.exerciseName}</span>
          </p>
        ) : (
          <p className="text-[11px] text-muted">Last element — almost there</p>
        )}
      </div>

      {/* Rate exercise (during rest) */}
      {el.type === 'rest' && (
        <div className="shrink-0 px-5 pb-2">
          {showRate ? (
            <div className="bg-surface border border-bd p-4 space-y-3">
              <Label className="block">Rate your execution</Label>
              <StarRating value={0} onChange={handleRate} max={5} labels={EXEC_LABELS} />
            </div>
          ) : (
            <button
              onClick={() => setShowRate(true)}
              className="w-full py-2.5 text-[12px] font-display font-semibold text-muted tracking-[0.06em] uppercase border border-bd hover:border-muted/60 hover:text-ink transition-colors cursor-pointer"
            >
              Rate exercise
            </button>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="shrink-0 bg-surface border-t border-bd px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          {/* Adjust -15 */}
          <button
            onClick={() => handleAdjust(-15)}
            className="flex flex-col items-center gap-0.5 text-muted hover:text-ink transition-colors cursor-pointer"
          >
            <span className="text-[18px] font-display font-bold tabular-nums">−15</span>
            <span className="text-[8px] font-display tracking-[0.1em] uppercase">sec</span>
          </button>

          {/* Skip back */}
          <button
            onClick={handlePrev}
            className="w-12 h-12 flex items-center justify-center text-muted hover:text-ink transition-colors cursor-pointer"
          >
            <ISkipBack />
          </button>

          {/* Play/Pause */}
          <button
            onClick={() => setIsRunning((r) => !r)}
            className="w-16 h-16 flex items-center justify-center bg-crimson text-ink hover:bg-crimson-hi active:bg-crimson transition-colors cursor-pointer"
          >
            {isRunning ? <IPause /> : <IPlay />}
          </button>

          {/* Skip forward */}
          <button
            onClick={handleNext}
            className="w-12 h-12 flex items-center justify-center text-muted hover:text-ink transition-colors cursor-pointer"
          >
            <ISkipFwd />
          </button>

          {/* Adjust +15 */}
          <button
            onClick={() => handleAdjust(15)}
            className="flex flex-col items-center gap-0.5 text-muted hover:text-ink transition-colors cursor-pointer"
          >
            <span className="text-[18px] font-display font-bold tabular-nums">+15</span>
            <span className="text-[8px] font-display tracking-[0.1em] uppercase">sec</span>
          </button>
        </div>
      </div>

      {/* Secondary menu */}
      {showMenu && (
        <div className="absolute inset-0 bg-bg/90 flex flex-col justify-end z-50" onClick={() => setShowMenu(false)}>
          <div className="bg-surface border-t border-bd p-4 space-y-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setShowMenu(false); setIsRunning(false); onExit() }}
              className="w-full py-4 text-[14px] font-display font-semibold text-crimson tracking-[0.06em] border border-crimson/40 hover:bg-crimson/10 transition-colors cursor-pointer"
            >
              End Workout
            </button>
            <button
              onClick={() => setShowMenu(false)}
              className="w-full py-3 text-[13px] font-display font-semibold text-muted tracking-[0.06em] cursor-pointer"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SCREEN: POST-WORKOUT ─────────────────────────────────────────────────────

function PostWorkoutScreen({
  partial,
  onSubmit,
}: {
  partial: Partial<CompletedWorkout> & { exerciseRatings: ExerciseRating[] }
  onSubmit: (completed: CompletedWorkout) => void
}) {
  const [ratings, setRatings] = useState<ExerciseRating[]>(partial.exerciseRatings ?? [])
  const [rpe, setRpe] = useState<number>(0)
  const [concentration, setConcentration] = useState(0)
  const [discomfort, setDiscomfort] = useState(0)
  const [goalCompletion, setGoalCompletion] = useState(0)
  const [perceivedProgress, setPerceivedProgress] = useState(0)
  const [conclusions, setConclusions] = useState('')

  function getRating(id: string) {
    return ratings.find((r) => r.exerciseId === id)?.rating ?? 0
  }

  function setRating(exerciseId: string, exerciseName: string, blockType: BlockType, rating: number) {
    setRatings((prev) => {
      const idx = prev.findIndex((r) => r.exerciseId === exerciseId)
      const entry = { exerciseId, exerciseName, blockType, rating }
      if (idx >= 0) { const n = [...prev]; n[idx] = entry; return n }
      return [...prev, entry]
    })
  }

  function submit() {
    const completed: CompletedWorkout = {
      id: uid(),
      planId: partial.planId ?? '',
      name: partial.name ?? '',
      discipline: partial.discipline ?? 'Boxing',
      goal: partial.goal,
      startTime: partial.startTime ?? new Date().toISOString(),
      duration: partial.duration ?? 0,
      plannedRounds: partial.plannedRounds ?? 0,
      completedRounds: partial.completedRounds ?? 0,
      plannedExercises: partial.plannedExercises ?? 0,
      completedExercises: partial.completedExercises ?? 0,
      rpe: rpe || undefined,
      concentration: concentration || undefined,
      discomfort: discomfort || undefined,
      goalCompletion: goalCompletion || undefined,
      perceivedProgress: perceivedProgress || undefined,
      conclusions: conclusions || undefined,
      exerciseRatings: ratings,
      skippedExercises: partial.skippedExercises ?? [],
    }
    onSubmit(completed)
  }

  const allExercises: { id: string; name: string; blockType: BlockType }[] = []
  // We reconstruct from ratings keys we know about (passed in)
  const seenIds = new Set<string>()
  for (const r of partial.exerciseRatings ?? []) {
    if (!seenIds.has(r.exerciseId)) {
      seenIds.add(r.exerciseId)
      allExercises.push({ id: r.exerciseId, name: r.exerciseName, blockType: r.blockType })
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="shrink-0 bg-surface border-b border-bd px-4 py-3 max-w-lg mx-auto w-full">
        <Label className="text-crimson">Workout Complete</Label>
        <h1 className="font-display font-bold text-[20px] text-ink mt-0.5">{partial.name}</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-5 space-y-7">
          {/* Auto stats */}
          <div>
            <Label className="mb-3 block">Session Results</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Duration', fmtDuration(partial.duration ?? 0)],
                ['Completion', `${Math.round(((partial.completedExercises ?? 0) / Math.max(partial.plannedExercises ?? 1, 1)) * 100)}%`],
                ['Rounds done', `${partial.completedRounds ?? 0}/${partial.plannedRounds ?? 0}`],
                ['Exercises', `${partial.completedExercises ?? 0}/${partial.plannedExercises ?? 0}`],
              ].map(([l, v]) => (
                <div key={l as string} className="bg-elevated border border-bd px-4 py-3">
                  <div className="text-[18px] font-display font-bold text-ink tabular-nums">{v}</div>
                  <div className="text-[9px] text-muted font-display tracking-[0.1em] uppercase mt-0.5">{l}</div>
                </div>
              ))}
            </div>
          </div>

          <RedAccent />

          {/* Exercise ratings */}
          {allExercises.length > 0 && (
            <div className="space-y-4">
              <Label className="block">Exercise Execution</Label>
              <p className="text-[11px] text-faint -mt-2">How did you execute each exercise?</p>
              {allExercises.map((ex) => (
                <div key={ex.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BlockBadge type={ex.blockType} />
                    <span className="text-[12px] text-muted font-semibold">{ex.name}</span>
                  </div>
                  <StarRating
                    value={getRating(ex.id)}
                    onChange={(v) => setRating(ex.id, ex.name, ex.blockType, v)}
                    max={5}
                    labels={EXEC_LABELS}
                  />
                </div>
              ))}
            </div>
          )}

          <RedAccent />

          {/* Workout-level feedback */}
          <div className="space-y-6">
            <Label className="block">Workout Feedback</Label>

            {/* RPE */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Perceived Exertion (RPE)</Label>
                {rpe > 0 && <span className="text-[11px] text-muted">{rpe} — {RPE_LABELS[rpe]}</span>}
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 11 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setRpe(i)}
                    className={`flex-1 py-2.5 text-[11px] font-display font-bold border transition-all cursor-pointer
                      ${rpe === i ? 'border-crimson bg-crimson text-ink' : 'border-bd text-faint hover:text-muted hover:border-muted'}`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            {/* Concentration */}
            <div>
              <Label className="mb-2 block">Concentration</Label>
              <StarRating value={concentration} onChange={setConcentration} max={5} labels={CONC_LABELS} />
              {concentration > 0 && <p className="text-[10px] text-muted mt-1">{CONC_LABELS[concentration]}</p>}
            </div>

            {/* Discomfort */}
            <div>
              <Label className="mb-2 block">Discomfort (1–5)</Label>
              <StarRating value={discomfort} onChange={setDiscomfort} max={5} />
            </div>

            {/* Goal completion */}
            {partial.goal && (
              <div>
                <Label className="mb-1 block">Goal Completion</Label>
                <p className="text-[11px] text-muted mb-2 italic">"{partial.goal}"</p>
                <StarRating value={goalCompletion} onChange={setGoalCompletion} max={5} />
              </div>
            )}

            {/* Perceived progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Perceived Progress</Label>
                {perceivedProgress > 0 && <span className="text-[11px] text-muted">{PROGRESS_LABELS[perceivedProgress]}</span>}
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 7 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPerceivedProgress(n)}
                    className={`flex-1 py-3 text-[12px] font-display font-bold border transition-all cursor-pointer
                      ${perceivedProgress === n ? 'border-crimson bg-crimson text-ink' : 'border-bd text-faint hover:text-muted'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Conclusions */}
            <div>
              <Label className="mb-2 block">Workout Conclusions <span className="text-faint normal-case tracking-normal font-normal">· optional</span></Label>
              <textarea
                value={conclusions}
                onChange={(e) => setConclusions(e.target.value)}
                rows={4}
                placeholder={`What worked?\nWhich mistake repeated?\nWhat should you do next time?`}
                className="w-full bg-elevated border border-bd text-ink text-[13px] px-3 py-3 placeholder:text-faint focus:border-muted outline-none transition-colors resize-none leading-relaxed"
              />
            </div>
          </div>

          <Btn variant="primary" size="lg" className="w-full" onClick={submit}>
            Save Workout Report
          </Btn>
          <div className="pb-6" />
        </div>
      </div>
    </div>
  )
}

// ─── SCREEN: WORKOUT REPORT ───────────────────────────────────────────────────

function WorkoutReportScreen({
  cw,
  onBack,
}: {
  cw: CompletedWorkout
  onBack: () => void
}) {
  const pct = completionPct(cw)
  const ratedRatings = cw.exerciseRatings.filter((r) => !cw.skippedExercises.includes(r.exerciseId))
  const avg = avgRating(ratedRatings)
  const [expandedBlocks, setExpandedBlocks] = useState<string[]>([])

  // Group ratings by block type
  const byBlock: Record<string, ExerciseRating[]> = {}
  for (const r of cw.exerciseRatings) {
    if (!byBlock[r.blockType]) byBlock[r.blockType] = []
    byBlock[r.blockType].push(r)
  }

  function toggleBlock(bt: string) {
    setExpandedBlocks((p) => (p.includes(bt) ? p.filter((x) => x !== bt) : [...p, bt]))
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="shrink-0 bg-surface border-b border-bd px-4 py-3 flex items-center gap-3 max-w-lg mx-auto w-full">
        <button onClick={onBack} className="text-muted hover:text-ink cursor-pointer p-1 -ml-1"><IChevLeft /></button>
        <div className="flex-1">
          <Label>Session Report</Label>
          <h1 className="font-display font-bold text-[15px] text-ink leading-tight">{cw.name}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-5 space-y-6">
          {/* Date & discipline */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <DisciplineBadge d={cw.discipline} />
              <span className="text-[11px] text-muted">{new Date(cw.startTime).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            {cw.goal && <p className="text-[12px] text-muted italic">{cw.goal}</p>}
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Duration', fmtDuration(cw.duration)],
              ['Completion', `${pct}%`],
              ['Rounds', `${cw.completedRounds}/${cw.plannedRounds}`],
              ['Avg Rating', avg ? `${avg}/5` : '—'],
            ].map(([l, v]) => (
              <div key={l as string} className="bg-elevated border border-bd px-4 py-3">
                <div className={`text-[20px] font-display font-bold tabular-nums ${l === 'Completion' && pct < 100 ? 'text-muted' : 'text-ink'}`}>{v}</div>
                <div className="text-[9px] text-muted font-display tracking-[0.1em] uppercase mt-0.5">{l}</div>
              </div>
            ))}
          </div>

          {/* Time breakdown */}
          <div className="flex gap-2">
            {[
              ['Active Work', fmtDuration(Math.round(cw.duration * 0.65))],
              ['Rest', fmtDuration(Math.round(cw.duration * 0.35))],
            ].map(([l, v]) => (
              <div key={l as string} className="flex-1 bg-elevated border border-bd px-3 py-2 text-center">
                <div className="text-[14px] font-display font-bold text-ink">{v}</div>
                <div className="text-[9px] text-muted font-display tracking-[0.08em] uppercase mt-0.5">{l}</div>
              </div>
            ))}
          </div>

          <RedAccent />

          {/* Whole-workout feedback */}
          {(cw.rpe != null || cw.concentration != null || cw.perceivedProgress != null) && (
            <div>
              <Label className="mb-3 block">Whole-Workout Feedback</Label>
              <div className="space-y-3">
                {cw.rpe != null && (
                  <div className="flex justify-between items-center py-2 border-b border-bd text-[13px]">
                    <span className="text-muted">RPE</span>
                    <span className="font-display font-bold text-ink">{cw.rpe}/10 <span className="text-muted font-normal text-[11px]">— {RPE_LABELS[cw.rpe]}</span></span>
                  </div>
                )}
                {cw.concentration != null && (
                  <div className="flex justify-between items-center py-2 border-b border-bd text-[13px]">
                    <span className="text-muted">Concentration</span>
                    <span className="font-display font-bold text-ink">{cw.concentration}/5</span>
                  </div>
                )}
                {cw.discomfort != null && (
                  <div className="flex justify-between items-center py-2 border-b border-bd text-[13px]">
                    <span className="text-muted">Discomfort</span>
                    <span className="font-display font-bold text-ink">{cw.discomfort}/5</span>
                  </div>
                )}
                {cw.goalCompletion != null && cw.goal && (
                  <div className="flex justify-between items-center py-2 border-b border-bd text-[13px]">
                    <span className="text-muted">Goal Completion</span>
                    <span className="font-display font-bold text-ink">{cw.goalCompletion}/5</span>
                  </div>
                )}
                {cw.perceivedProgress != null && (
                  <div className="flex justify-between items-center py-2 border-b border-bd text-[13px]">
                    <span className="text-muted">Perceived Progress</span>
                    <span className="font-display font-bold text-ink">{cw.perceivedProgress}/7 <span className="text-muted font-normal text-[11px]">— {PROGRESS_LABELS[cw.perceivedProgress]}</span></span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Block breakdown */}
          <div>
            <Label className="mb-3 block">Workout Blocks</Label>
            <div className="space-y-2">
              {Object.entries(byBlock).map(([bt, blockRatings]) => {
                const ratedInBlock = blockRatings.filter((r) => !cw.skippedExercises.includes(r.exerciseId))
                const blockAvg = avgRating(ratedInBlock)
                const isExp = expandedBlocks.includes(bt)
                return (
                  <div key={bt} className="bg-surface border border-bd overflow-hidden">
                    <button
                      onClick={() => toggleBlock(bt)}
                      className="w-full px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-elevated transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <BlockBadge type={bt as BlockType} />
                        <span className="text-[11px] text-muted">{blockRatings.length} exercises</span>
                        {blockAvg && <span className="text-[11px] text-ink font-semibold">avg {blockAvg}/5</span>}
                      </div>
                      <IChevDown />
                    </button>
                    {isExp && (
                      <div className="border-t border-bd divide-y divide-bd">
                        {blockRatings.map((r) => {
                          const skipped = cw.skippedExercises.includes(r.exerciseId)
                          return (
                            <div key={r.exerciseId} className="px-4 py-3 flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className={`text-[12px] font-semibold truncate ${skipped ? 'text-faint line-through' : 'text-ink'}`}>
                                  {r.exerciseName}
                                </p>
                                {skipped && <span className="text-[9px] text-faint uppercase tracking-[0.1em]">Skipped</span>}
                              </div>
                              {!skipped && r.rating > 0 && (
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: 5 }, (_, i) => (
                                    <div
                                      key={i}
                                      className={`w-4 h-4 border ${i < r.rating ? 'border-crimson bg-crimson' : 'border-bd'}`}
                                    />
                                  ))}
                                  <span className="text-[11px] text-muted ml-1">{r.rating}/5</span>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Conclusions */}
          {cw.conclusions && (
            <div>
              <Label className="mb-2 block">Conclusions</Label>
              <div className="bg-elevated border border-bd px-4 py-4 border-l-2 border-l-crimson">
                <p className="text-[13px] text-muted leading-relaxed whitespace-pre-line">{cw.conclusions}</p>
              </div>
            </div>
          )}

          <div className="pb-6" />
        </div>
      </div>
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

const DEFAULT_DRAFT: WorkoutPlan = {
  id: uid(),
  name: '',
  discipline: 'Boxing',
  blocks: [],
  createdAt: new Date().toISOString(),
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [plans, setPlans] = useState<WorkoutPlan[]>(PLANS)
  const [history, setHistory] = useState<CompletedWorkout[]>(HISTORY)

  // Create workout flow
  const [draft, setDraft] = useState<WorkoutPlan>({ ...DEFAULT_DRAFT, id: uid() })
  const [addingToBlock, setAddingToBlock] = useState<{ blockIdx: number; blockType: BlockType } | null>(null)
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null)

  // Preview / active
  const [previewPlan, setPreviewPlan] = useState<WorkoutPlan | null>(null)
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null)
  const [activeSequence, setActiveSequence] = useState<TimerEl[]>([])

  // Post-workout
  const [postPartial, setPostPartial] = useState<(Partial<CompletedWorkout> & { exerciseRatings: ExerciseRating[] }) | null>(null)

  // Report
  const [viewingReport, setViewingReport] = useState<CompletedWorkout | null>(null)

  const navigate = useCallback((s: Screen) => setScreen(s), [])

  function startWorkout(plan: WorkoutPlan) {
    setActivePlan(plan)
    setActiveSequence(buildSequence(plan))
    setScreen('active')
  }

  function openPreview(plan: WorkoutPlan) {
    setPreviewPlan(plan)
    setScreen('preview')
  }

  function handleWorkoutComplete(plan: WorkoutPlan, ratings: ExerciseRating[]) {
    const stats = calcPlanStats(plan)
    setPostPartial({
      planId: plan.id,
      name: plan.name,
      discipline: plan.discipline,
      goal: plan.goal,
      startTime: new Date().toISOString(),
      duration: stats.estimated,
      plannedRounds: stats.totalRounds,
      completedRounds: stats.totalRounds,
      plannedExercises: stats.exercises,
      completedExercises: stats.exercises,
      exerciseRatings: ratings,
      skippedExercises: [],
    })
    setScreen('post-workout')
  }

  function handlePostSubmit(completed: CompletedWorkout) {
    setHistory((prev) => [completed, ...prev])
    setViewingReport(completed)
    setScreen('report')
  }

  function handleViewReport(cw: CompletedWorkout) {
    setViewingReport(cw)
    setScreen('report')
  }

  function handleAddExercise(blockIdx: number, blockType: BlockType) {
    setAddingToBlock({ blockIdx, blockType })
    setScreen('library')
  }

  function handleComboSelected(combo: Combo) {
    setSelectedCombo(combo)
    setScreen('configure')
  }

  function handleExerciseAdded(ex: Exercise) {
    if (!addingToBlock) return
    setDraft((p) => {
      const blocks = [...p.blocks]
      blocks[addingToBlock.blockIdx] = {
        ...blocks[addingToBlock.blockIdx],
        exercises: [...blocks[addingToBlock.blockIdx].exercises, ex],
      }
      return { ...p, blocks }
    })
    setAddingToBlock(null)
    setSelectedCombo(null)
    setScreen('create')
  }

  function handleSavePlan() {
    setPlans((prev) => {
      const exists = prev.find((p) => p.id === draft.id)
      if (exists) return prev.map((p) => (p.id === draft.id ? draft : p))
      return [draft, ...prev]
    })
    setDraft({ ...DEFAULT_DRAFT, id: uid() })
    setScreen('workouts')
  }

  const showNav = !['active', 'post-workout'].includes(screen)

  return (
    <div className="flex flex-col h-full bg-bg overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {screen === 'home' && (
          <HomeScreen
            plans={plans}
            history={history}
            onStart={startWorkout}
            navigate={navigate}
            onViewReport={handleViewReport}
          />
        )}
        {screen === 'workouts' && (
          <WorkoutsScreen
            plans={plans}
            history={history}
            onStart={startWorkout}
            onPreview={openPreview}
            onViewReport={handleViewReport}
          />
        )}
        {screen === 'create' && (
          <CreateWorkoutScreen
            onBack={() => setScreen('home')}
            onPreview={(p) => { setPreviewPlan(p); setScreen('preview') }}
            onAddExercise={handleAddExercise}
            draft={draft}
            setDraft={setDraft}
          />
        )}
        {screen === 'library' && addingToBlock && (
          <ExerciseLibraryScreen
            discipline={draft.discipline}
            blockType={addingToBlock.blockType}
            onBack={() => setScreen('create')}
            onSelect={handleComboSelected}
          />
        )}
        {screen === 'configure' && selectedCombo && addingToBlock && (
          <ConfigureExerciseScreen
            combo={selectedCombo}
            prevExercise={
              draft.blocks[addingToBlock.blockIdx]?.exercises.at(-1) ?? null
            }
            onBack={() => setScreen('library')}
            onAdd={handleExerciseAdded}
          />
        )}
        {screen === 'preview' && previewPlan && (
          <PreviewScreen
            plan={previewPlan}
            onBack={() => setScreen(previewPlan.id === draft.id ? 'create' : 'workouts')}
            onSave={handleSavePlan}
            onStart={() => startWorkout(previewPlan)}
          />
        )}
        {screen === 'active' && activePlan && activeSequence.length > 0 && (
          <ActiveWorkoutScreen
            sequence={activeSequence}
            onComplete={(ratings) => handleWorkoutComplete(activePlan, ratings)}
            onExit={() => setScreen('home')}
          />
        )}
        {screen === 'post-workout' && postPartial && (
          <PostWorkoutScreen partial={postPartial} onSubmit={handlePostSubmit} />
        )}
        {screen === 'report' && viewingReport && (
          <WorkoutReportScreen
            cw={viewingReport}
            onBack={() => setScreen(history.includes(viewingReport) ? 'workouts' : 'home')}
          />
        )}
      </div>
      {showNav && <BottomNav active={screen} navigate={navigate} />}
    </div>
  )
}
