import { describe, expect, it } from 'vitest'
import { parseMp4Metadata, parseStts, readMp4Metadata, summarizeSampleTiming } from './mp4Metadata'

function concat(...arrays: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(arrays.reduce((sum, array) => sum + array.length, 0))
  let offset = 0
  for (const array of arrays) { result.set(array, offset); offset += array.length }
  return result
}
const uints = (...values: number[]) => {
  const bytes = new Uint8Array(values.length * 4)
  values.forEach((value, index) => new DataView(bytes.buffer).setUint32(index * 4, value))
  return bytes
}
const string = (value: string) => new TextEncoder().encode(value)
const box = (type: string, ...contents: Uint8Array[]) => {
  const payload = concat(...contents)
  return concat(uints(8 + payload.length), string(type), payload)
}
const stts = (...pairs: number[]) => uints(0, pairs.length / 2, ...pairs)
function track({ handler = 'vide', version = 0, edits = false, fps = 240, timing = stts(240, 100) } = {}) {
  const header = version === 0 ? uints(0, 0, 0, fps * 100, 24000, 0) : concat(uints(0x01000000, 0, 0, 0, 0, fps * 100, 0, 24000, 0))
  return box('trak', ...(edits ? [box('edts', box('elst', uints(0, 0)))] : []), box('mdia',
    box('hdlr', uints(0, 0), string(handler)), box('mdhd', header),
    box('minf', box('stbl', box('stts', timing))),
  ))
}

describe('stts parsing and source fps', () => {
  it('reads all entries and weights fps by sample count and duration', () => {
    const entries = parseStts(stts(100, 100, 50, 200).buffer)
    expect(entries).toEqual([{ sampleCount: 100, sampleDelta: 100 }, { sampleCount: 50, sampleDelta: 200 }])
    expect(summarizeSampleTiming(entries, 24000)).toEqual({ sampleCount: 150, sampleDurationTicks: 20000, sampleDurationSeconds: 20000 / 24000, fps: 180, variableFrameRate: true })
  })
  it.each([30, 60, 120, 240])('reads %s fps from sample timing', (fps) => {
    expect(parseMp4Metadata(box('moov', track({ fps })).buffer)[0].fps).toBe(fps)
  })
  it.each([new Uint8Array(), uints(0), uints(0, 0), uints(0, 2, 1, 100), stts(1, 0), stts(0, 100), uints(0x01000000, 1, 1, 1)])('rejects truncated, unsupported and empty timing tables', (bytes) => {
    expect(() => parseStts(bytes.buffer)).toThrow()
  })
  it('rejects zero timescale and unsafe sample totals', () => {
    expect(() => summarizeSampleTiming([{ sampleCount: 1, sampleDelta: 100 }], 0)).toThrow()
    expect(() => summarizeSampleTiming([{ sampleCount: 0xffffffff, sampleDelta: 0xffffffff }], 24000)).toThrow()
  })
})

describe('MP4/MOV container metadata', () => {
  it('ignores audio, reads mdhd v1, flags elst and preserves all video tracks', () => {
    const result = parseMp4Metadata(box('moov', track({ handler: 'soun' }), track({ edits: true, version: 1 }), track({ fps: 120 })).buffer)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ fps: 240, timescale: 24000, durationSeconds: 1, hasEditList: true, sampleCount: 240, variableFrameRate: false })
    expect(result[1]).toMatchObject({ fps: 120, hasEditList: false })
  })
  it('reads moov after mdat without loading the whole recording', async () => {
    const movie = box('moov', track({ edits: true }))
    const file = new Blob([box('ftyp', string('qt  ')), box('mdat', new Uint8Array(1_000_000)), movie])
    const reads: number[] = []
    const original = file.slice.bind(file)
    file.slice = (start, end, type) => { reads.push((end ?? file.size) - (start ?? 0)); return original(start, end, type) }
    expect((await readMp4Metadata(file))[0].fps).toBe(240)
    expect(Math.max(...reads)).toBe(movie.byteLength)
    expect(reads.reduce((sum, size) => sum + size, 0)).toBeLessThan(1000)
  })
  it('supports extended-size and to-end boxes', async () => {
    const regular = box('moov', track())
    const extended = concat(uints(1), string('moov'), uints(0, regular.length + 8), regular.slice(8))
    expect((await readMp4Metadata(new Blob([extended])))[0].fps).toBe(240)
    const toEnd = concat(uints(0), regular.slice(4))
    expect(parseMp4Metadata(toEnd.buffer)[0].fps).toBe(240)
  })
  it('rejects malformed sizes, missing moov and missing video', async () => {
    for (const bytes of [uints(1), concat(uints(2), string('moov')), box('moov', concat(uints(99999), string('trak'))), box('moov', track({ handler: 'soun' }))]) {
      expect(() => parseMp4Metadata(bytes.buffer)).toThrow()
    }
    await expect(readMp4Metadata(new Blob([string('not an mp4')]))).rejects.toThrow()
    await expect(readMp4Metadata(new Blob([box('ftyp', string('qt  '))]))).rejects.toThrow('moov')
  })
})
