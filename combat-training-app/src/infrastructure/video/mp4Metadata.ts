export interface TimeToSampleEntry { sampleCount: number; sampleDelta: number }
export interface Mp4VideoTrack {
  timescale: number
  durationSeconds: number
  sampleCount: number
  sampleDurationTicks: number
  sampleDurationSeconds: number
  stts: TimeToSampleEntry[]
  fps: number
  variableFrameRate: boolean
  hasEditList: boolean
}

interface Box { type: string; start: number; end: number }
const invalid = () => new Error('Nieprawidłowa lub nieobsługiwana struktura MP4/MOV.')
const text = (view: DataView, start: number) => String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + start, 4))
const uint64 = (view: DataView, start: number) => {
  const value = Number(view.getBigUint64(start))
  if (!Number.isSafeInteger(value)) throw invalid()
  return value
}

function boxHeader(view: DataView, start: number, limit: number): Box {
  if (start + 8 > view.byteLength) throw invalid()
  const size32 = view.getUint32(start)
  const headerSize = size32 === 1 ? 16 : 8
  if (start + headerSize > view.byteLength) throw invalid()
  const size = size32 === 0 ? limit - start : size32 === 1 ? uint64(view, start + 8) : size32
  if (size < headerSize || !Number.isSafeInteger(start + size) || start + size > limit) throw invalid()
  return { type: text(view, start + 4), start: start + headerSize, end: start + size }
}

function boxes(view: DataView, start: number, end: number): Box[] {
  const result: Box[] = []
  while (start < end) {
    const box = boxHeader(view, start, end)
    result.push(box)
    start = box.end
  }
  return result
}

function child(view: DataView, parent: Box, type: string): Box {
  const box = boxes(view, parent.start, parent.end).find((item) => item.type === type)
  if (!box) throw invalid()
  return box
}

export function parseStts(data: ArrayBuffer): TimeToSampleEntry[] {
  const view = new DataView(data)
  if (view.byteLength < 8 || view.getUint32(0) !== 0) throw invalid()
  const count = view.getUint32(4)
  if (!count || 8 + count * 8 !== view.byteLength) throw invalid()
  return Array.from({ length: count }, (_, index) => {
    const sampleCount = view.getUint32(8 + index * 8)
    const sampleDelta = view.getUint32(12 + index * 8)
    if (!sampleCount || !sampleDelta) throw invalid()
    return { sampleCount, sampleDelta }
  })
}

export function summarizeSampleTiming(entries: TimeToSampleEntry[], timescale: number) {
  if (!entries.length || !Number.isSafeInteger(timescale) || timescale <= 0) throw invalid()
  let sampleCount = 0
  let sampleDurationTicks = 0
  for (const entry of entries) {
    if (![entry.sampleCount, entry.sampleDelta].every((value) => Number.isSafeInteger(value) && value > 0)) throw invalid()
    sampleCount += entry.sampleCount
    sampleDurationTicks += entry.sampleCount * entry.sampleDelta
  }
  if (!Number.isSafeInteger(sampleCount) || !Number.isSafeInteger(sampleDurationTicks)) throw invalid()
  return {
    sampleCount, sampleDurationTicks,
    sampleDurationSeconds: sampleDurationTicks / timescale,
    fps: sampleCount * timescale / sampleDurationTicks,
    variableFrameRate: new Set(entries.map((entry) => entry.sampleDelta)).size > 1,
  }
}

export function parseMp4Metadata(data: ArrayBuffer): Mp4VideoTrack[] {
  const view = new DataView(data)
  const movie = boxes(view, 0, view.byteLength).find((box) => box.type === 'moov')
  if (!movie) throw invalid()
  const tracks: Mp4VideoTrack[] = []
  for (const track of boxes(view, movie.start, movie.end).filter((box) => box.type === 'trak')) {
    const media = child(view, track, 'mdia')
    const handler = child(view, media, 'hdlr')
    if (handler.end - handler.start < 12) throw invalid()
    if (text(view, handler.start + 8) !== 'vide') continue
    const header = child(view, media, 'mdhd')
    const version = view.getUint8(header.start)
    if (version > 1 || header.end - header.start < (version === 1 ? 36 : 24)) throw invalid()
    const timescale = view.getUint32(header.start + (version === 1 ? 20 : 12))
    const duration = version === 1 ? uint64(view, header.start + 24) : view.getUint32(header.start + 16)
    const table = child(view, child(view, media, 'minf'), 'stbl')
    const timing = child(view, table, 'stts')
    const stts = parseStts(data.slice(timing.start, timing.end))
    const edits = boxes(view, track.start, track.end).find((box) => box.type === 'edts')
    tracks.push({
      timescale, durationSeconds: duration / timescale, stts,
      ...summarizeSampleTiming(stts, timescale),
      hasEditList: edits ? boxes(view, edits.start, edits.end).some((box) => box.type === 'elst') : false,
    })
  }
  if (!tracks.length) throw new Error('Brak ścieżki wideo z tabelą stts w MP4/MOV.')
  return tracks
}

// Skip mdat without reading the recording into RAM. iPhones may put moov after the video data.
export async function readMp4Metadata(file: Blob): Promise<Mp4VideoTrack[]> {
  let offset = 0
  while (offset < file.size) {
    const bytes = await file.slice(offset, offset + 16).arrayBuffer()
    const box = boxHeader(new DataView(bytes), 0, file.size - offset)
    if (box.type === 'moov') {
      if (box.end > 32 * 1024 * 1024) throw new Error('Pudełko moov przekracza limit odczytu 32 MiB.')
      return parseMp4Metadata(await file.slice(offset, offset + box.end).arrayBuffer())
    }
    offset += box.end
  }
  throw new Error('Nie znaleziono moov. Wybierz plik MP4 lub MOV; inne kontenery nie są obsługiwane.')
}
