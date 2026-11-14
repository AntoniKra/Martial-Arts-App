import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'
import { pathToFileURL } from 'node:url'

export function htmlAssets(html) {
  const scripts = new Set(), styles = new Set(), fonts = new Set()
  for (const tag of html.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
    const attributes = Object.fromEntries([...tag[0].matchAll(/([\w-]+)\s*=\s*["']([^"']*)["']/g)].map((match) => [match[1].toLowerCase(), match[2]]))
    if (attributes.src) scripts.add(attributes.src)
    if (attributes.rel === 'modulepreload') scripts.add(attributes.href)
    if (attributes.rel === 'stylesheet') styles.add(attributes.href)
    if (attributes.rel === 'preload' && attributes.as === 'font') fonts.add(attributes.href)
  }
  return { scripts: [...scripts], styles: [...styles], fonts: [...fonts] }
}

export function precacheUrls(sw) {
  const manifest = sw.match(/\.precacheAndRoute\((\[[\s\S]*?\]),/)
  if (!manifest) throw new Error('Precache manifest not found in sw.js')
  return [...new Set([...manifest[1].matchAll(/(?:"url"|url):"([^"\n]+)"/g)].map((match) => match[1]))]
}

export async function measureBundle(distDirectory) {
  const dist = path.resolve(distDirectory)
  function localPath(url, base = 'index.html') {
    const resolved = new URL(url, `https://bundle.invalid/${base}`)
    if (resolved.origin !== 'https://bundle.invalid') throw new Error(`External asset: ${url}`)
    const file = path.resolve(dist, `.${decodeURIComponent(resolved.pathname)}`)
    if (!file.startsWith(dist + path.sep)) throw new Error(`Asset outside dist: ${url}`)
    return file
  }
  async function measure(url) {
    const content = await readFile(localPath(url))
    return { file: url.replace(/^\//, ''), bytes: content.length, gzipBytes: gzipSync(content).length,
      brotliBytes: brotliCompressSync(content, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length }
  }
  function total(assets) {
    return assets.reduce((sum, asset) => ({ bytes: sum.bytes + asset.bytes, gzipBytes: sum.gzipBytes + asset.gzipBytes,
      brotliBytes: sum.brotliBytes + asset.brotliBytes }), { bytes: 0, gzipBytes: 0, brotliBytes: 0 })
  }
  const html = await readFile(path.join(dist, 'index.html'), 'utf8')
  const assets = htmlAssets(html)
  const initialJs = await Promise.all(assets.scripts.map((url) => measure(url)))
  const initialCss = await Promise.all(assets.styles.map((url) => measure(url)))
  const fonts = new Set(assets.fonts)
  for (const css of assets.styles) {
    const content = await readFile(localPath(css), 'utf8')
    for (const match of content.matchAll(/url\(\s*["']?([^\s)"']+\.woff2?)["']?\s*\)/g)) {
      fonts.add(new URL(match[1], `https://bundle.invalid${css.startsWith('/') ? '' : '/'}${css}`).pathname)
    }
  }
  const fontCandidates = await Promise.all([...fonts].map((url) => measure(url)))
  const jsFiles = (await readdir(path.join(dist, 'assets'))).filter((file) => file.endsWith('.js'))
  const initial = new Set(initialJs.map((asset) => asset.file))
  const lazyChunks = await Promise.all(jsFiles.filter((file) => !initial.has(`assets/${file}`)).map((file) => measure(`assets/${file}`)))
  const sw = await readFile(path.join(dist, 'sw.js'), 'utf8')
  const precache = await Promise.all(precacheUrls(sw).map((url) => measure(url)))
  return { measuredAt: new Date().toISOString(), compression: 'gzip default; Brotli quality 11; sum of individually compressed files; bytes',
    initialJs: { assets: initialJs, total: total(initialJs) }, initialCss: { assets: initialCss, total: total(initialCss) },
    fontCandidates: { assets: fontCandidates, total: total(fontCandidates), note: 'CSS font candidates, not measured network transfers; unicode-range and rendered text determine downloads.' },
    chunkCount: jsFiles.length, largestLazyChunk: lazyChunks.sort((a, b) => b.bytes - a.bytes)[0] ?? null,
    precache: { count: precache.length, total: total(precache) }, serviceWorker: await measure('sw.js'),
    legacyEntryOnly: initialJs.find((asset) => /(?:^|\/)index-[^/]+\.js$/.test(asset.file)) ?? null }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [dist = 'dist', output = 'perf-results/bundle.json', ...extra] = process.argv.slice(2)
  if (extra.length) throw new Error('Usage: npm run perf:bundle -- [dist] [output.json]')
  const report = await measureBundle(dist)
  await mkdir(path.dirname(output), { recursive: true })
  await writeFile(output, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
}
