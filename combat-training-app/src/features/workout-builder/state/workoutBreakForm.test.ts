import { describe, expect, it } from 'vitest'

import {
  BREAK_DURATION_MAX_SECONDS,
  BREAK_DURATION_PRESETS,
  commitBreakEntry,
  DEFAULT_BREAK_DURATION_SECONDS,
  normalizeBreakInstruction,
  parseBreakEntry,
  resolveBreakSubmit,
  stepBreakDuration,
} from './workoutBreakForm'

describe('workoutBreakForm', () => {
  it('exposes the approved presets, default 1:00 duration and 60:00 cap', () => {
    expect(BREAK_DURATION_PRESETS).toEqual([30, 60, 120, 180])
    expect(DEFAULT_BREAK_DURATION_SECONDS).toBe(60)
    expect(BREAK_DURATION_MAX_SECONDS).toBe(3_600)
  })

  it('normalizes break instruction by trimming whitespace', () => {
    expect(normalizeBreakInstruction('')).toBeNull()
    expect(normalizeBreakInstruction('   ')).toBeNull()
    expect(normalizeBreakInstruction('  Woda i reset oddechu  ')).toBe('Woda i reset oddechu')
  })

  it('commits valid m:ss or seconds entries up to 60:00 and rejects values above 60:00 or malformed input', () => {
    expect(commitBreakEntry('1:30')).toEqual({ ok: true, durationSeconds: 90 })
    expect(commitBreakEntry('90')).toEqual({ ok: true, durationSeconds: 90 })
    expect(commitBreakEntry('0:00')).toEqual({ ok: true, durationSeconds: 0 })
    expect(commitBreakEntry('60:00')).toEqual({ ok: true, durationSeconds: BREAK_DURATION_MAX_SECONDS })
    expect(commitBreakEntry('3600')).toEqual({ ok: true, durationSeconds: BREAK_DURATION_MAX_SECONDS })
    expect(commitBreakEntry('60:15')).toEqual({
      ok: false,
      entry: { text: '60:15', invalid: true, error: 'rest' },
    })
    expect(commitBreakEntry('3601')).toEqual({
      ok: false,
      entry: { text: '3601', invalid: true, error: 'rest' },
    })
    expect(commitBreakEntry('1:75')).toEqual({
      ok: false,
      entry: { text: '1:75', invalid: true, error: 'rest' },
    })
    expect(parseBreakEntry('60:00')).toEqual({ ok: true, value: 3_600 })
    expect(parseBreakEntry('60:15')).toEqual({ ok: false })
  })

  it('steps duration by 15 s, snapping off-grid values and respecting the 0:00–60:00 limits', () => {
    expect(stepBreakDuration(60, null, 1)).toBe(75)
    expect(stepBreakDuration(60, null, -1)).toBe(45)
    expect(stepBreakDuration(100, null, 1)).toBe(105)
    expect(stepBreakDuration(100, null, -1)).toBe(90)
    expect(stepBreakDuration(15, null, -1)).toBe(0)
    expect(stepBreakDuration(0, null, -1)).toBe(0)
    expect(stepBreakDuration(3_585, null, 1)).toBe(BREAK_DURATION_MAX_SECONDS)
    expect(stepBreakDuration(BREAK_DURATION_MAX_SECONDS, null, 1)).toBe(BREAK_DURATION_MAX_SECONDS)
    expect(stepBreakDuration(BREAK_DURATION_MAX_SECONDS, null, -1)).toBe(3_585)
    // Lowering a previously saved break longer than 60:00 brings it back within the 60:00 cap.
    expect(stepBreakDuration(5_400, null, -1)).toBe(BREAK_DURATION_MAX_SECONDS)
  })

  it('applies a valid typed entry before stepping and ignores an invalid entry when stepping', () => {
    expect(stepBreakDuration(60, { text: '1:30', invalid: false, error: null }, 1)).toBe(105)
    expect(stepBreakDuration(60, { text: '1:75', invalid: true, error: 'rest' }, 1)).toBe(75)
    expect(stepBreakDuration(60, { text: '60:15', invalid: true, error: 'rest' }, 1)).toBe(75)
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

  it('rejects malformed, above-60:00 typed entries, and legacy breaks above 60:00 on submit', () => {
    expect(resolveBreakSubmit(60, { text: '1:75', invalid: false, error: null })).toEqual({
      ok: false,
      durationSeconds: 60,
      entry: { text: '1:75', invalid: true, error: 'rest' },
    })
    expect(resolveBreakSubmit(60, { text: '60:15', invalid: false, error: null })).toEqual({
      ok: false,
      durationSeconds: 60,
      entry: { text: '60:15', invalid: true, error: 'rest' },
    })
    expect(resolveBreakSubmit(5_400, null)).toEqual({
      ok: false,
      durationSeconds: 5_400,
      entry: { text: '90:00', invalid: true, error: 'rest' },
    })
  })

  it('accepts a valid positive duration up to 60:00 on submit', () => {
    expect(resolveBreakSubmit(90, null)).toEqual({ ok: true, durationSeconds: 90 })
    expect(resolveBreakSubmit(BREAK_DURATION_MAX_SECONDS, null)).toEqual({
      ok: true,
      durationSeconds: BREAK_DURATION_MAX_SECONDS,
    })
    expect(resolveBreakSubmit(60, { text: '60:00', invalid: false, error: null })).toEqual({
      ok: true,
      durationSeconds: BREAK_DURATION_MAX_SECONDS,
    })
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
