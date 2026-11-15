import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import * as z from 'zod/mini'

const source = new URL('../docs/exercise-library-draft.csv', import.meta.url)
const target = new URL('../src/features/workout-builder/data/exerciseLibraryFixtures.ts', import.meta.url)

// Handle quoted fields, escaped quotes, CRLF and the UTF-8 BOM used by Excel.
function readCsv(text) {
  const rows = []
  let row = [], field = '', quoted = false
  const input = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    if (char === '"') {
      if (quoted && input[index + 1] === '"') { field += '"'; index += 1 }
      else quoted = !quoted
    } else if (!quoted && (char === ';' || char === '\n')) {
      row.push(field); field = ''
      if (char === '\n') { rows.push(row); row = [] }
    } else field += char
  }
  if (quoted) throw new Error('Unclosed CSV quote')
  if (field || row.length) rows.push([...row, field])
  const [headers, ...records] = rows
  const expected = ['id', 'namePl', 'type', 'blockTypes', 'disciplines', 'category', 'defaultMode', 'defaultRounds', 'defaultWorkSec', 'defaultRestSec', 'existingId', 'note']
  if (JSON.stringify(headers) !== JSON.stringify(expected)) throw new Error('Unexpected CSV headers')
  return records.map((cells, index) => {
    if (cells.length !== headers.length) throw new Error(`Invalid CSV row ${index + 2}`)
    return Object.fromEntries(headers.map((header, column) => [header, cells[column]]))
  })
}

const text = z.string().check(z.minLength(1))
const duration = z.number().check(z.int(), z.minimum(1), z.maximum(86400))
const schema = z.object({
  id: text,
  combinationKey: text,
  namePl: z.string().check(z.minLength(1), z.maxLength(100)),
  type: z.enum(['combination', 'drill', 'continuous']),
  disciplineKeys: z.array(z.enum(['boxing', 'kickboxing', 'muay_thai', 'k1', 'mma_striking'])).check(z.minLength(1)),
  blockTypes: z.array(z.enum(['warmup', 'technique', 'pads', 'bag', 'sparring', 'conditioning', 'strengthAndConditioning', 'cooldown'])).check(z.minLength(1)),
  category: text,
  defaultConfiguration: z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('rounds'), roundCount: z.number().check(z.int(), z.minimum(1), z.maximum(99)),
      roundDurationSeconds: duration, restBetweenRoundsSeconds: z.number().check(z.int(), z.minimum(0), z.maximum(86400)) }),
    z.object({ mode: z.literal('continuous'), durationSeconds: duration }),
  ]),
})
const exercises = readCsv(readFileSync(source, 'utf8')).map((row) => {
  if (!['rounds', 'continuous'].includes(row.defaultMode)) throw new Error(`Invalid mode: ${row.id}`)
  if (row.defaultMode === 'rounds' ? !row.defaultRounds || !row.defaultRestSec : row.defaultRounds || row.defaultRestSec) {
    throw new Error(`Invalid configuration fields: ${row.id}`)
  }
  const id = row.existingId || row.id
  const exercise = z.parse(schema, {
    id,
    combinationKey: row.existingId ? id.replace(/^combo-/, '') : id,
    namePl: row.namePl,
    type: row.type,
    disciplineKeys: row.disciplines.split('|'),
    blockTypes: row.blockTypes.split('|'),
    category: row.category,
    defaultConfiguration: row.defaultMode === 'rounds'
      ? { mode: 'rounds', roundCount: Number(row.defaultRounds), roundDurationSeconds: Number(row.defaultWorkSec), restBetweenRoundsSeconds: Number(row.defaultRestSec) }
      : { mode: 'continuous', durationSeconds: Number(row.defaultWorkSec) },
  })
  for (const values of [exercise.disciplineKeys, exercise.blockTypes]) {
    if (new Set(values).size !== values.length) throw new Error(`Duplicate assignment: ${id}`)
  }
  return exercise
})
if (new Set(exercises.map(({ id }) => id)).size !== exercises.length) throw new Error('Duplicate exercise IDs')

const output = `// Generated from docs/exercise-library-draft.csv. Run: node scripts/generate-exercise-library.mjs
import type { Combination } from '@/domain/combination/combination.types'

export const EXERCISE_LIBRARY_FIXTURES: Combination[] = [
${exercises.map((exercise) => `  {
    id: ${JSON.stringify(exercise.id)}, combinationKey: ${JSON.stringify(exercise.combinationKey)},
    namePl: ${JSON.stringify(exercise.namePl)}, nameEn: null,
    type: ${JSON.stringify(exercise.type)}, category: ${JSON.stringify(exercise.category)},
    disciplineKeys: ${JSON.stringify(exercise.disciplineKeys)},
    blockTypes: ${JSON.stringify(exercise.blockTypes)},
    defaultConfiguration: ${JSON.stringify(exercise.defaultConfiguration)},
    isSystem: true, isActive: true,
  },`).join('\n')}
]
`
if (process.argv[2] === '--check') {
  if (readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== output) {
    throw new Error('Exercise library differs from CSV. Run: node scripts/generate-exercise-library.mjs')
  }
  console.log(`Exercise library matches CSV (${exercises.length} entries).`)
} else if (process.argv.length === 2) {
  writeFileSync(target, output)
  console.log(`Generated ${exercises.length} entries: ${fileURLToPath(target)}`)
} else throw new Error('Usage: node scripts/generate-exercise-library.mjs [--check]')
