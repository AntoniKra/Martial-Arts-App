import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals'
import type { PerformanceEvent } from '@/application/performance/performanceEvents'
import { setPerformanceNetworkEnabled } from '@/application/performance/performanceNetwork'
import { calculateWriteTimes, observeWriteSnapshot, type WriteTiming } from './writeTimings'

const metrics = new Map<string, { value: number; unit: string; context: ReturnType<typeof context> }>()
const writes: (WriteTiming & { context: ReturnType<typeof context>; status: 'measuring' | 'failed' | 'interrupted' })[] = []
let clickAt: number | null = null
let simulatedOffline = false
let changingNetwork = false

function context() {
  return { recordedAt: new Date().toISOString(), timeOrigin: performance.timeOrigin, path: location.pathname,
    standalone: matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && navigator.standalone === true),
    online: navigator.onLine, serviceWorkerControlled: Boolean(navigator.serviceWorker?.controller), simulatedOffline }
}

const panel = document.createElement('details')
panel.open = true
panel.setAttribute('aria-label', 'Panel pomiarów wydajności')
// Local styles keep the production stylesheet (and its cascade) unchanged without the flag.
panel.style.cssText = 'position:fixed;bottom:0;right:0;z-index:1000;box-sizing:border-box;width:min(100%,28rem);max-height:45dvh;overflow:auto;padding:12px;border:1px solid var(--app-border);background:var(--app-surface);color:var(--app-ink);font:14px var(--font-sans);'
const summary = document.createElement('summary')
summary.textContent = 'Pomiary wydajności (zwiń / rozwiń)'
summary.style.cssText = 'min-height:44px;cursor:pointer;'
const description = document.createElement('p')
description.textContent = 'Pomiar zapisu: dodaj nowy trening spoza aplikacji. Wpis zostaje w dzienniku. T_lokalny mierzy widoczność snapshotu, nie trwałość na dysku. Zwiń panel, aby użyć formularza.'
const status = document.createElement('p')
status.setAttribute('role', 'status')
const results = document.createElement('pre')
results.setAttribute('aria-label', 'Wyniki pomiarów')
results.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;font:12px var(--font-sans);'
function button(label: string, action: () => void) {
  const element = document.createElement('button')
  element.type = 'button'; element.textContent = label
  element.style.cssText = 'min-height:44px;padding:8px;margin:4px 4px 4px 0;border:1px solid var(--app-border);color:var(--app-ink);background:var(--app-elevated);font:inherit;'
  element.addEventListener('click', action)
  return element
}
const network = button('Symuluj brak sieci', () => { void toggleNetwork() })
const copy = button('Kopiuj wyniki (JSON)', () => { void copyResults() })
const exportText = document.createElement('textarea')
exportText.readOnly = true; exportText.hidden = true
exportText.setAttribute('aria-label', 'Wyniki JSON do ręcznego skopiowania')
exportText.style.cssText = 'width:100%;height:160px;background:var(--app-input);color:var(--app-ink);'
panel.append(summary, description, status, network, copy, results, exportText)
document.body.append(panel)

function report() {
  const supported = PerformanceObserver.supportedEntryTypes ?? []
  return { schemaVersion: 1, context: context(), userAgent: navigator.userAgent,
    webVitalsVersion: __PERF_WEB_VITALS_VERSION__, firebaseVersion: __PERF_FIREBASE_VERSION__,
    localCache: 'persistentLocalCache + persistentMultipleTabManager',
    apiSupport: { LCP: supported.includes('largest-contentful-paint'), INP: supported.includes('event'), CLS: supported.includes('layout-shift') },
    vitals: Object.fromEntries(metrics), writes: writes.map((write) => ({ ...write, ...calculateWriteTimes(write) })) }
}

function render() {
  const data = report()
  const lines = [`Kontekst: standalone=${data.context.standalone}; online=${data.context.online}; SW=${data.context.serviceWorkerControlled}; offline SDK=${simulatedOffline}`,
    `Firebase ${data.firebaseVersion}; web-vitals ${data.webVitalsVersion}`]
  for (const name of ['FCP', 'LCP', 'INP', 'CLS', 'TTFB']) {
    const metric = metrics.get(name)
    const supported = name === 'CLS' ? data.apiSupport.CLS : name === 'INP' ? data.apiSupport.INP : name === 'LCP' ? data.apiSupport.LCP : true
    lines.push(`${name}: ${metric ? `${metric.value.toFixed(3)} ${metric.unit}` : supported ? 'oczekiwanie (wejdź w interakcję, potem ukryj stronę)' : 'n/d (brak API)'}`)
  }
  for (const [index, write] of writes.entries()) {
    const timing = calculateWriteTimes(write)
    lines.push(`Zapis ${index + 1} (${write.id}): T_lokalny: ${timing.localMs === null ? 'oczekiwanie' : timing.localMs.toFixed(2) + ' ms'}; T_sync: ${timing.syncMs === null ? 'oczekiwanie na powrót sieci / potwierdzenie' : timing.syncMs.toFixed(2) + ' ms'}; ${write.status === 'failed' ? 'błąd zapisu' : write.status === 'interrupted' ? 'przerwano obserwację' : 'pomiar'}`)
  }
  results.textContent = lines.join('\n')
}

function restored() {
  const at = performance.now()
  for (const write of writes) if (write.localAt !== null && write.syncedAt === null && write.status === 'measuring') write.onlineAt = at
  render()
}

async function toggleNetwork() {
  if (changingNetwork) return
  changingNetwork = true; network.disabled = true
  try {
    // Record the start before enableNetwork can deliver an acknowledgement.
    if (simulatedOffline) restored()
    await setPerformanceNetworkEnabled(simulatedOffline)
    simulatedOffline = !simulatedOffline
    network.textContent = simulatedOffline ? 'Przywróć sieć Firestore' : 'Symuluj brak sieci'
    status.textContent = simulatedOffline ? 'Sieć Firestore wyłączona. Internet przeglądarki pozostaje dostępny.' : 'Sieć Firestore włączona.'
  } catch {
    status.textContent = 'Nie udało się zmienić sieci Firestore. Zaloguj się i spróbuj ponownie.'
  } finally { changingNetwork = false; network.disabled = false; render() }
}

async function copyResults() {
  const json = JSON.stringify(report(), null, 2)
  try {
    await navigator.clipboard.writeText(json)
    status.textContent = 'Skopiowano wyniki JSON.'
  } catch {
    exportText.hidden = false; exportText.value = json; exportText.focus(); exportText.select()
    status.textContent = 'Zaznacz i skopiuj JSON z pola poniżej (schowek niedostępny).'
  }
}

window.combatPerformanceObserver = (event: PerformanceEvent) => {
  if (event.type === 'save-click') clickAt = event.at
  if (event.type === 'save' && clickAt !== null) {
    writes.push({ id: event.id, clickedAt: clickAt, localAt: null, onlineAt: null, syncedAt: null, context: context(), status: 'measuring' })
    clickAt = null
  }
  if (event.type === 'snapshot') {
    for (const write of writes) if (write.status === 'measuring') Object.assign(write, observeWriteSnapshot(write, {
      at: event.at, present: event.ids.has(write.id), pending: event.pendingIds.has(write.id), hasPendingWrites: event.hasPendingWrites, fromCache: event.fromCache,
    }))
  }
  if (event.type === 'save-error') for (const write of writes) if (write.id === event.id) write.status = 'failed'
  if (event.type === 'unsubscribe') {
    clickAt = null
    for (const write of writes) if (write.syncedAt === null) write.status = 'interrupted'
  }
  render()
}
function vital(metric: Metric) {
  metrics.set(metric.name, { value: metric.value, unit: metric.name === 'CLS' ? 'score' : 'ms', context: context() })
  render()
}
onCLS(vital, { reportAllChanges: true }); onFCP(vital); onINP(vital, { reportAllChanges: true })
onLCP(vital, { reportAllChanges: true }); onTTFB(vital)
window.addEventListener('online', restored)
window.addEventListener('offline', render)
navigator.serviceWorker?.addEventListener('controllerchange', render)
render()
