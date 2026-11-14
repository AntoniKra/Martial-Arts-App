export interface WriteTiming {
  id: string
  clickedAt: number
  localAt: number | null
  onlineAt: number | null
  syncedAt: number | null
}

export function calculateWriteTimes(marks: WriteTiming) {
  function elapsed(start: number | null, end: number | null): number | null {
    return start !== null && end !== null && Number.isFinite(start) && Number.isFinite(end) && end >= start ? end - start : null
  }
  return { localMs: elapsed(marks.clickedAt, marks.localAt), syncMs: elapsed(marks.onlineAt, marks.syncedAt) }
}

export function observeWriteSnapshot(marks: WriteTiming, snapshot: {
  at: number; present: boolean; pending: boolean; hasPendingWrites: boolean; fromCache: boolean
}): WriteTiming {
  if (!snapshot.present) return marks
  const localAt = marks.localAt ?? (snapshot.pending ? snapshot.at : null)
  const syncedAt = marks.syncedAt ?? (localAt !== null && marks.onlineAt !== null && !snapshot.hasPendingWrites && !snapshot.fromCache ? snapshot.at : null)
  return { ...marks, localAt, syncedAt }
}
