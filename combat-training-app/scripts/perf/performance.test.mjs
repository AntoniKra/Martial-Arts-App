import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { htmlAssets, precacheUrls, measureBundle } from './bundle.mjs'
import { summarize, csv, lighthouseRows } from './statistics.mjs'

test('median handles unsorted, even and single samples; rejects missing measurements', () => {
  assert.deepEqual(summarize([9, 1, 7, 3, 5]), { n: 5, median: 5, min: 1, max: 9 })
  assert.deepEqual(summarize([8, 2]), { n: 2, median: 5, min: 2, max: 8 })
  assert.deepEqual(summarize([0]), { n: 1, median: 0, min: 0, max: 0 })
  assert.throws(() => summarize([])); assert.throws(() => summarize([NaN])); assert.throws(() => summarize([undefined]))
})
test('CSV escapes commas, quotes, newlines and empty cells', () => {
  assert.equal(csv([['a,b', '"quoted"', 'a\nb', null, 0]]), '"a,b","""quoted""","a\nb","","0"\r\n')
})
test('bundle counts entry and deduplicated modulepreloads; extracts precache without executing it', () => {
  assert.deepEqual(htmlAssets(`<script src="/entry.js"></script><script>ignored()</script><link rel="modulepreload" href="/shared.js"><link href='/shared.js' rel='modulepreload'><link rel="stylesheet" href="/style.css">`),
    { scripts: ['/entry.js', '/shared.js'], styles: ['/style.css'], fonts: [] })
  assert.deepEqual(precacheUrls('w.precacheAndRoute([{url:"a.js",revision:null},{url:"b.woff2",revision:"1"}],{})'), ['a.js', 'b.woff2'])
  assert.throws(() => precacheUrls('missing'))
})
test('bundle sums only linked initial scripts, resolves CSS fonts and separates lazy/precache totals', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'perf-bundle-test-'))
  try {
    await mkdir(path.join(directory, 'assets'))
    const entry = 'entry content', shared = 'shared content', lazy = 'large lazy chunk content'
    for (const [name, content] of Object.entries({ 'index-test.js': entry, 'shared.js': shared, 'lazy.js': lazy,
      'style.css': '@font-face{src:url(./font.woff2)}', 'font.woff2': 'font' })) await writeFile(path.join(directory, 'assets', name), content)
    await writeFile(path.join(directory, 'index.html'), '<script src="/assets/index-test.js"></script><link rel="modulepreload" href="/assets/shared.js"><link rel="stylesheet" href="/assets/style.css">')
    await writeFile(path.join(directory, 'sw.js'), 'w.precacheAndRoute([{url:"assets/index-test.js"},{url:"assets/lazy.js"}],{})')
    const report = await measureBundle(directory)
    assert.equal(report.initialJs.total.bytes, entry.length + shared.length)
    assert.equal(report.initialJs.total.gzipBytes, gzipSync(entry).length + gzipSync(shared).length)
    assert.equal(report.largestLazyChunk.file, 'assets/lazy.js')
    assert.equal(report.chunkCount, 3)
    assert.equal(report.precache.total.bytes, entry.length + lazy.length)
    assert.equal(report.precache.count, 2)
    assert.equal(report.fontCandidates.assets[0].file, 'assets/font.woff2')
    assert.equal(report.legacyEntryOnly.bytes, entry.length)
  } finally { await rm(directory, { recursive: true, force: true }) }
})
function report(value, version = '13.6.0', profile = 'mobile') {
  return { requestedUrl: 'https://example.test/login', lighthouseVersion: version, configSettings: { formFactor: profile, disableStorageReset: false },
    environment: { hostUserAgent: 'Chrome/123' }, categories: { performance: { score: value / 100 } },
    audits: Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index', 'total-byte-weight'].map((key) => [key, { numericValue: value }])) }
}
test('Lighthouse CSV keeps versions and profiles apart and preserves metric units', () => {
  const rows = lighthouseRows([report(10), report(30), report(20), report(40, 'other'), report(50, '13.6.0', 'desktop')])
  assert.equal(rows.length, 22)
  assert.deepEqual(rows[1].slice(3, 10), ['FCP', 'ms', 3, 20, 10, 30, '13.6.0'])
  assert.deepEqual(rows[6].slice(3, 9), ['Performance', '0-100', 3, 20, 10, 30])
  assert.equal(rows[7][4], 'bytes')
  assert.throws(() => lighthouseRows([{ ...report(1), runtimeError: { message: 'failed navigation' } }]))
  const missing = report(1); delete missing.audits['total-byte-weight']
  assert.throws(() => lighthouseRows([missing]))
})
