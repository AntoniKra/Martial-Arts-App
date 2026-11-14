import { spawnSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

process.chdir(fileURLToPath(new URL('..', import.meta.url)))
const folder = path.resolve('screenshots-tour')
await mkdir(folder, { recursive: true })
const variants = ['telefon-ciemny', 'telefon-jasny', 'komputer-ciemny', 'komputer-jasny']
// Replace only our manifests; screenshots are overwritten by their stable names.
for (const variant of variants) await writeFile(path.join(folder, `${variant}.json`), '[]')
const started = performance.now()
const firebaseCli = fileURLToPath(import.meta.resolve('firebase-tools/lib/bin/firebase.js'))
const result = spawnSync(process.execPath, [firebaseCli, 'emulators:exec', '--only', 'auth,firestore',
  '--project', 'demo-combat-training', '--config', 'firebase.json', '--non-interactive',
  'playwright test --config e2e/demo/screenshots.config.ts'], { stdio: 'inherit' })
const seconds = Math.round((performance.now() - started) / 1000)
const shots = (await Promise.all(variants.map(async (variant) => JSON.parse(await readFile(path.join(folder, `${variant}.json`), 'utf8'))))).flat()
shots.sort((a, b) => a.file.localeCompare(b.file))
const escape = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const skipped = ['Koniec odtwarzacza: aplikacja automatycznie przechodzi do podsumowania po zapisie (WorkoutPlayerView.tsx).']
const report = { success: result.status === 0 && shots.length === 100, screenshots: shots.length, seconds, skipped }
await writeFile(path.join(folder, 'report.json'), JSON.stringify(report, null, 2))
await writeFile(path.join(folder, 'index.html'), `<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Trasa zrzutów — konto pokazowe</title><style>body{font:16px system-ui;background:#f4f4f1;color:#111113;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}figure{margin:0;border:1px solid #bbb;padding:12px}img{display:block;width:100%;height:360px;object-fit:contain;object-position:top}a{color:inherit}figcaption{margin-top:12px}header{max-width:900px;margin-bottom:24px}</style>
<header><h1>Konto pokazowe — trasa zrzutów</h1><p>Zegar: 19.11.2026, 18:00, Europe/Warsaw. Telefon 360×800 i komputer 1440×900; motyw ciemny i jasny. Obrazy przewijanych ekranów obejmują całą stronę. Kliknij obraz, aby otworzyć pełny rozmiar.</p>
<p>Wynik: ${report.success ? 'PASS' : 'FAIL — przebieg niepełny, sprawdź wynik polecenia'}. Zrzuty: ${shots.length}. Czas: ${seconds} s.</p><p>Pominięto: ${escape(skipped.join(' '))}</p></header>
<main>${shots.map(({ file, caption }) => `<figure><a href="${escape(file)}"><img loading="lazy" src="${escape(file)}" alt="${escape(caption)}"></a><figcaption>${escape(caption)}</figcaption></figure>`).join('\n')}</main></html>`)
console.log(JSON.stringify(report, null, 2))
console.log(`Galeria: ${path.join(folder, 'index.html')}`)
if (result.error) console.error(result.error.message)
process.exit(report.success ? 0 : result.status || 1)
