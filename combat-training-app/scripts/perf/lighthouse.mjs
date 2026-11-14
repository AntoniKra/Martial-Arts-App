import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'

const [profile, address, runs = '5', screen = 'both'] = process.argv.slice(2)
if (!['mobile', 'desktop'].includes(profile) || !address || !/^\d+$/.test(runs) || Number(runs) < 1 || !['both', 'login', 'register'].includes(screen)) {
  throw new Error('Usage: npm run perf:lighthouse -- <mobile|desktop> <https://host> [runs=5] [both|login|register]')
}
const base = new URL(address)
if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || base.pathname !== '/') throw new Error('Expected an HTTPS origin without credentials')
const require = createRequire(import.meta.url)
const config = require(path.resolve(`lighthouserc.${profile}.cjs`))
const pages = screen === 'both' ? ['login', 'register'] : [screen]
const args = ['--yes', '--package=@lhci/cli@0.16.1', '--package=lighthouse@13.6.0', '--', 'lhci', 'autorun', `--config=./lighthouserc.${profile}.cjs`,
  `--collect.numberOfRuns=${runs}`, ...pages.map((page) => `--collect.url=${new URL(page, base).href}`)]
// npm's JS entry avoids shell interpolation (especially URLs) on Windows.
const npmCli = process.env.npm_execpath
if (!npmCli) throw new Error('Run this command through npm run perf:lighthouse')
const result = spawnSync(process.execPath, [npmCli, 'exec', ...args], { stdio: 'inherit' })
if (result.error || result.status !== 0) throw result.error ?? new Error(`LHCI exited ${result.status}`)
const summary = spawnSync(process.execPath, ['scripts/perf/lighthouse-csv.mjs', config.ci.upload.outputDir], { stdio: 'inherit' })
if (summary.error || summary.status !== 0) throw summary.error ?? new Error(`CSV exited ${summary.status}`)
