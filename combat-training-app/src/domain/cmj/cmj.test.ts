import { describe, expect, it } from 'vitest'
import { estimateFrameRate, frameFlightSeconds, jumpHeightCm } from './cmj'

describe('CMJ flight calculations', () => {
  it('uses h = g * t^2 / 8 and reports centimetres', () => {
    expect(jumpHeightCm(0.5)).toBeCloseTo(30.65625)
    expect(frameFlightSeconds(12, 132, 240)).toBe(0.5)
    expect(frameFlightSeconds(12, 72, 120)).toBe(0.5)
    expect(frameFlightSeconds(0, 15, 30)).toBe(0.5)
    expect(frameFlightSeconds(0, 30, 60)).toBe(0.5)
  })
  it.each([0, -1, NaN, Infinity, -Infinity])('rejects invalid flight time %s', (time) => {
    expect(jumpHeightCm(time)).toBeNull()
  })
  it.each([[1, 1, 240], [2, 1, 240], [-1, 2, 240], [1.5, 2, 240], [0, 2.5, 240], [0, 2, 0], [0, 2, NaN], [0, Infinity, 240]])('rejects invalid frame marks %s/%s/%s', (takeoff, landing, fps) => {
    expect(frameFlightSeconds(takeoff, landing, fps)).toBeNull()
  })
})

describe('rVFC media-time fps estimate', () => {
  it.each([30, 60, 120, 240])('estimates %s source fps without multiplying by playback rate', (fps) => {
    expect(estimateFrameRate(Array.from({ length: 8 }, (_, index) => ({ mediaTime: index / fps, presentedFrames: index })))).toBeCloseTo(fps)
  })
  it('excludes dropped callbacks, repeated timestamps and backwards seeks', () => {
    expect(estimateFrameRate([
      { mediaTime: 1, presentedFrames: 1 }, { mediaTime: 2, presentedFrames: 11 },
      { mediaTime: 2, presentedFrames: 12 }, { mediaTime: 0, presentedFrames: 13 },
      ...Array.from({ length: 5 }, (_, index) => ({ mediaTime: (index + 1) / 120, presentedFrames: index + 14 })),
    ])).toBeCloseTo(120)
  })
  it('requires at least three consecutive positive deltas', () => {
    expect(estimateFrameRate([])).toBeNull()
    expect(estimateFrameRate([{ mediaTime: 0, presentedFrames: 1 }, { mediaTime: 1 / 240, presentedFrames: 2 }])).toBeNull()
  })
})
