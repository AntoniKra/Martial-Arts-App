import { describe, expect, it } from 'vitest'
import { calculateWriteTimes, observeWriteSnapshot, type WriteTiming } from './writeTimings'

const marks: WriteTiming = { id: 'new-entry', clickedAt: 10, localAt: null, onlineAt: null, syncedAt: null }
const snapshot = { at: 35, present: true, pending: true, hasPendingWrites: true, fromCache: true }

describe('offline write measurements', () => {
  it('measures click to first local pending snapshot and reconnect to server acknowledgement', () => {
    const local = observeWriteSnapshot(marks, snapshot)
    expect(calculateWriteTimes(local)).toEqual({ localMs: 25, syncMs: null })
    expect(observeWriteSnapshot(local, { ...snapshot, at: 70 }).localAt).toBe(35)
    const later = observeWriteSnapshot({ ...local, onlineAt: 1000 }, { ...snapshot, at: 1200, pending: false, hasPendingWrites: false, fromCache: false })
    expect(calculateWriteTimes(later)).toEqual({ localMs: 25, syncMs: 200 })
    expect(observeWriteSnapshot(later, { ...snapshot, at: 1400 })).toEqual(later)
  })
  it('does not mistake unrelated, cached or still queued snapshots for acknowledgement', () => {
    expect(observeWriteSnapshot(marks, { ...snapshot, present: false })).toEqual(marks)
    expect(observeWriteSnapshot(marks, { ...snapshot, pending: false }).localAt).toBeNull()
    const local = { ...marks, localAt: 35, onlineAt: 1000 }
    expect(observeWriteSnapshot(local, { ...snapshot, at: 1100, pending: false, hasPendingWrites: false }).syncedAt).toBeNull()
    expect(observeWriteSnapshot(local, { ...snapshot, at: 1100, pending: false, fromCache: false }).syncedAt).toBeNull()
    expect(observeWriteSnapshot({ ...local, onlineAt: null }, { ...snapshot, pending: false, hasPendingWrites: false, fromCache: false }).syncedAt).toBeNull()
  })
  it('keeps zero durations and rejects reversed, missing or invalid timestamps', () => {
    expect(calculateWriteTimes({ ...marks, localAt: 10, onlineAt: 50, syncedAt: 50 })).toEqual({ localMs: 0, syncMs: 0 })
    expect(calculateWriteTimes({ ...marks, localAt: 5, onlineAt: NaN, syncedAt: 50 })).toEqual({ localMs: null, syncMs: null })
    expect(calculateWriteTimes(marks)).toEqual({ localMs: null, syncMs: null })
  })
})
