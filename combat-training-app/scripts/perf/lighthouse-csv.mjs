import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { csv, lighthouseRows } from './statistics.mjs'

const [directory = 'perf-results/lighthouse', output = `${directory}/summary.csv`] = process.argv.slice(2)
const reports = []
// LHCI upload also writes manifest.json; only full Lighthouse reports belong in statistics.
for (const name of await readdir(directory)) {
  if (!name.endsWith('.json') || name === 'manifest.json') continue
  const value = JSON.parse(await readFile(path.join(directory, name), 'utf8'))
  if (value.lighthouseVersion && value.audits) reports.push(value)
}
if (!reports.length) throw new Error(`No Lighthouse JSON reports in ${directory}`)
const content = csv(lighthouseRows(reports))
await mkdir(path.dirname(output), { recursive: true })
await writeFile(output, content)
console.log(content)
