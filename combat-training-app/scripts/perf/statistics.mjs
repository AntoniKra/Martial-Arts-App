export function summarize(values) {
  if (!values.length || values.some((value) => !Number.isFinite(value))) throw new Error('Expected finite measurements')
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return { n: sorted.length, median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    min: sorted[0], max: sorted.at(-1) }
}

export function csv(rows) {
  return rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n') + '\r\n'
}

const metrics = [
  ['FCP', 'first-contentful-paint', 'ms'], ['LCP', 'largest-contentful-paint', 'ms'],
  ['TBT', 'total-blocking-time', 'ms'], ['CLS', 'cumulative-layout-shift', 'score'],
  ['SI', 'speed-index', 'ms'], ['Performance', null, '0-100'], ['Total byte weight', 'total-byte-weight', 'bytes'],
]

export function lighthouseRows(reports) {
  const groups = new Map()
  for (const report of reports) {
    if (report.runtimeError) throw new Error(`Lighthouse failed: ${report.runtimeError.message}`)
    const profile = report.configSettings.formFactor
    const storage = report.configSettings.disableStorageReset ? 'retained' : 'cold'
    const key = JSON.stringify([report.requestedUrl, profile, storage, report.lighthouseVersion, report.environment.hostUserAgent])
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(report)
  }
  const rows = [['URL', 'Profile', 'Storage', 'Metric', 'Unit', 'n', 'Median', 'Min', 'Max', 'Lighthouse', 'Chrome user agent']]
  for (const group of groups.values()) {
    const report = group[0]
    for (const [name, audit, unit] of metrics) {
      const values = group.map((item) => audit ? item.audits[audit]?.numericValue : item.categories.performance?.score == null ? undefined : item.categories.performance.score * 100)
      const result = summarize(values)
      rows.push([report.requestedUrl, report.configSettings.formFactor, report.configSettings.disableStorageReset ? 'retained' : 'cold',
        name, unit, result.n, result.median, result.min, result.max, report.lighthouseVersion, report.environment.hostUserAgent])
    }
  }
  return rows
}
