import { describe, expect, it } from 'vitest'

import { STEPPER_DURATION_MAX_SECONDS } from '@/features/workout-builder/state/exerciseStepper'

import {
  BREAK_DURATION_PRESETS,
  commitBreakEntry,
  DEFAULT_BREAK_DURATION_SECONDS,
  normalizeBreakInstruction,
  resolveBreakSubmit,
  stepBreakDuration,
} from './workoutBreakForm'

describe('workoutBreakForm', () => {
  it('exposes the approved presets and default 1:00 duration', () => {
    expect(BREAK_DURATION_PRESETS).toEqual([30, 60, 120, 180])
    expect(DEFAULT_BREAK_DURATION_SECONDS).toBe(60)
  })

  it('normalizes break instruction by trimming whitespace', () => {
    expect(normalizeBreakInstruction('')).toBeNull()
    expect(normalizeBreakInstruction('   ')).toBeNull()
    expect(normalizeBreakInstruction('  Woda i reset oddechu  ')).toBe('Woda i reset oddechu')
  })

  it('commits valid m:ss or seconds entries and rejects invalid input such as 1:75', () => {
    expect(commitBreakEntry('1:30')).toEqual({ ok: true, durationSeconds: 90 })
    expect(commitBreakEntry('90')).toEqual({ ok: true, durationSeconds: 90 })
    expect(commitBreakEntry('0:00')).toEqual({ ok: true, durationSeconds: 0 })
    expect(commitBreakEntry('1440:00')).toEqual({ ok: true, durationSeconds: STEPPER_DURATION_MAX_SECONDS })
    expect(commitBreakEntry('1:75')).toEqual({
      ok: false,
      entry: { text: '1:75', invalid: true, error: 'rest' },
    })
  })

  it('steps duration by 15 s, snapping off-grid values and respecting limits', () => {
    expect(stepBreakDuration(60, null, 1)).toBe(75)
    expect(stepBreakDuration(60, null, -1)).toBe(45)
    expect(stepBreakDuration(100, null, 1)).toBe(105)
    expect(stepBreakDuration(100, null, -1)).toBe(90)
    expect(stepBreakDuration(15, null, -1)).toBe(0)
    expect(stepBreakDuration(0, null, -1)).toBe(0)
    expect(stepBreakDuration(STEPPER_DURATION_MAX_SECONDS, null, 1)).toBe(STEPPER_DURATION_MAX_SECONDS)
  })

  it('applies a valid typed entry before stepping and ignores an invalid entry when stepping', () => {
    expect(stepBreakDuration(60, { text: '1:30', invalid: false, error: null }, 1)).toBe(105)
    expect(stepBreakDuration(60, { text: '1:75', invalid: true, error: 'rest' }, 1)).toBe(75)
  })

  it('rejects zero duration on submit whether stepped or typed', () => {
    expect(resolveBreakSubmit(0, null)).toEqual({
      ok: false,
      durationSeconds: 0,
      entry: { text: '0:00', invalid: true, error: 'zero' },
    })
    expect(resolveBreakSubmit(60, { text: '0:00', invalid: false, error: null })).toEqual({
      ok: false,
      durationSeconds: 0,
      entry: { text: '0:00', invalid: true, error: 'zero' },
    })
    expect(resolveBreakSubmit(60, { text: '0', invalid: false, error: null })).toEqual({
      ok: false,
      durationSeconds: 0,
      entry: { text: '0', invalid: true, error: 'zero' },
    })
  })

  it('rejects malformed typed entry on submit and keeps the previous duration', () => {
    expect(resolveBreakSubmit(60, { text: '1:75', invalid: false, error: null })).toEqual({
      ok: false,
      durationSeconds: 60,
      entry: { text: '1:75', invalid: true, error: 'rest' },
    })
  })

  it('accepts a valid positive duration from stepper state or typed entry on submit', () => {
    expect(resolveBreakSubmit(90, null)).toEqual({ ok: true, durationSeconds: 90 })
    expect(resolveBreakSubmit(60, { text: '2:15', invalid: false, error: null })).toEqual({
      ok: true,
      durationSeconds: 135,
    })
    expect(resolveBreakSubmit(60, { text: '45', invalid: false, error: null })).toEqual({
      ok: true,
      durationSeconds: 45,
    })
  })
})
