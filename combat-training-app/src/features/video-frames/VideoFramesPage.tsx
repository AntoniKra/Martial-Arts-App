import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { frameFlightSeconds, jumpHeightCm, estimateFrameRate } from '@/domain/cmj/cmj'
import { readMp4Metadata, type Mp4VideoTrack } from '@/infrastructure/video/mp4Metadata'
import { sampleVideoFrames, type FrameMeasurement } from '@/infrastructure/video/sampleVideoFrames'

interface Clip { file: File; url: string }
interface VideoMetadata { duration: number; width: number; height: number }
interface FrameMark { frame: number; currentTime: number }
const fieldClass = 'min-h-touch w-full rounded-sm border border-bd bg-input px-3 py-2'
const number = (value: number | null, digits = 3) => value === null ? '—' : value.toFixed(digits)

// A new file remounts the probe so late reads/callbacks cannot overwrite the next recording.
export function Component() {
  const [clip, setClip] = useState<Clip | null>(null)
  useEffect(() => () => { if (clip) URL.revokeObjectURL(clip.url) }, [clip])

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setClip(file ? { file, url: URL.createObjectURL(file) } : null)
  }

  return <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
    <h1 className="font-display text-2xl font-bold">Próba CMJ: klatki nagrania</h1>
    <p>To próba techniczna, bez zapisu wyniku na koncie. Nagraj w aparacie iPhone’a skok w trybie Slo-mo 240 i 120 kl./s oraz zwykłe nagrania 30 i 60 kl./s. Wybierz każdy plik z galerii albo aparatu, uruchom pomiar i skopiuj JSON do PR dotyczącego issue nr 143.</p>
    <p className="text-sm text-muted">Nagranie jest analizowane lokalnie. Zwróć uwagę na różnicę między klatkażem kontenera a odtwarzaniem w przeglądarce — próba nie potwierdza jeszcze dokładności pomiaru skoku.</p>
    <label className="block space-y-2"> <span>Wybierz nagranie</span>
      <input className={fieldClass} type="file" accept="video/*" onChange={chooseFile} />
    </label>
    {clip && <VideoProbe key={clip.url} clip={clip} />}
    <FlightCalculator />
  </main>
}

function VideoProbe({ clip }: { clip: Clip }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stopRef = useRef<(() => void) | null>(null)
  const [tracks, setTracks] = useState<Mp4VideoTrack[] | null>(null)
  const [containerError, setContainerError] = useState<string | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null)
  const [position, setPosition] = useState(0)
  const [seeking, setSeeking] = useState(false)
  const [running, setRunning] = useState(false)
  const [measurement, setMeasurement] = useState<FrameMeasurement | null>(null)
  const [takeoff, setTakeoff] = useState<FrameMark | null>(null)
  const [landing, setLanding] = useState<FrameMark | null>(null)
  const [copyStatus, setCopyStatus] = useState('')
  const [json, setJson] = useState('')
  const fps = tracks?.[0]?.fps ?? null
  const stepSeconds = fps ? 1 / fps : null
  const estimatedFps = measurement ? estimateFrameRate(measurement.samples) : null
  const flightSeconds = fps && takeoff && landing ? frameFlightSeconds(takeoff.frame, landing.frame, fps) : null
  const heightCm = flightSeconds === null ? null : jumpHeightCm(flightSeconds)
  const frame = fps ? Math.round(position * fps) : null
  const canMark = metadata !== null && fps !== null && !running && !seeking && videoError === null

  useEffect(() => {
    let active = true
    void readMp4Metadata(clip.file).then((result) => {
      if (active) setTracks(result)
    }).catch((error: unknown) => {
      if (active) setContainerError(error instanceof Error ? error.message : 'Nie udało się odczytać kontenera.')
    })
    return () => { active = false; stopRef.current?.() }
  }, [clip.file])

  function moveFrame(direction: number) {
    const video = videoRef.current
    if (!video || !metadata || !fps) return
    video.pause()
    const lastFrame = Math.max(0, Math.ceil(metadata.duration * fps) - 1)
    const nextFrame = Math.min(lastFrame, Math.max(0, Math.round(video.currentTime * fps) + direction))
    if (Math.abs(video.currentTime - nextFrame / fps) < 1e-9) return
    setSeeking(true)
    video.currentTime = nextFrame / fps
  }

  function mark(kind: 'takeoff' | 'landing') {
    const video = videoRef.current
    if (!video || !fps) return
    video.pause()
    const value = { frame: Math.round(video.currentTime * fps), currentTime: video.currentTime }
    if (kind === 'takeoff') setTakeoff(value)
    else setLanding(value)
    setCopyStatus('')
  }

  function measure() {
    const video = videoRef.current
    if (!video) return
    stopRef.current?.()
    setMeasurement(null)
    setRunning(true)
    setCopyStatus('')
    stopRef.current = sampleVideoFrames(video, (result) => { setMeasurement(result); setRunning(false) })
  }

  async function copyResult() {
    const agent = navigator.userAgent
    const browserName = /Edg\//.test(agent) ? 'Edge' : /CriOS|Chrome\//.test(agent) ? 'Chrome'
      : /FxiOS|Firefox\//.test(agent) ? 'Firefox' : /Safari\//.test(agent) ? 'Safari' : 'Inna (patrz userAgent)'
    const report = {
      probe: 'cmj-video-frames', recordedAt: new Date().toISOString(),
      browser: { name: browserName, userAgent: agent, vendor: navigator.vendor, platform: navigator.platform },
      file: { name: clip.file.name, type: clip.file.type, sizeBytes: clip.file.size, lastModified: clip.file.lastModified },
      video: metadata, container: { tracks, error: containerError },
      playback: { requestVideoFrameCallbackSupported: typeof videoRef.current?.requestVideoFrameCallback === 'function', measurement, estimatedFps, error: videoError },
      selection: { fps, fpsSource: 'first-video-track-stts-average', currentTime: videoRef.current?.currentTime ?? position, frame, takeoff, landing },
      jump: { flightSeconds, heightCm, gravityMps2: 9.81 },
      caveats: { editListNotAppliedToFrameIndices: true, frameNumbersAreSeekEstimates: true },
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2))
      setCopyStatus('Skopiowano wynik JSON.')
    } catch {
      setCopyStatus('Nie udało się skopiować. Użyj pola JSON poniżej (zaznacz i kopiuj).')
    }
    setJson(JSON.stringify(report, null, 2))
  }

  return <section aria-label="Odczyty nagrania" className="space-y-4">
    <dl className="space-y-2 break-words">
      <div><dt>Nazwa</dt><dd>{clip.file.name}</dd></div>
      <div><dt>Typ</dt><dd>{clip.file.type || '(brak typu MIME)'}</dd></div>
      <div><dt>Rozmiar</dt><dd>{clip.file.size} B</dd></div>
      <div><dt>duration / rozdzielczość przeglądarki</dt><dd>{metadata ? `${number(metadata.duration)} s / ${metadata.width} × ${metadata.height}` : 'Oczekiwanie na metadane…'}</dd></div>
    </dl>
    {containerError && <p role="alert">{containerError}</p>}
    {tracks?.map((track, index) => <div key={index} className="space-y-2 border border-bd bg-surface p-4">
      <h2 className="font-display text-lg font-semibold">Kontener — ścieżka wideo {index + 1}</h2>
      <p>Klatkaż z stts: {number(track.fps)} kl./s{track.variableFrameRate ? ' (zmienny)' : ' (stały)'}. Timescale: {track.timescale}; próbek: {track.sampleCount}; czas próbek: {track.sampleDurationTicks} ticków / {number(track.sampleDurationSeconds)} s; duration mdhd: {number(track.durationSeconds)} s.</p>
      <p>Lista edycji elst: {track.hasEditList ? 'TAK' : 'NIE'}.</p>
      <details><summary className="min-h-touch cursor-pointer py-2">Czasy próbek stts</summary><pre className="overflow-auto text-sm">{JSON.stringify(track.stts, null, 2)}</pre></details>
    </div>)}
    <p className="text-sm text-muted">Kroki i numery klatek są przybliżeniem z currentTime i średniego fps pierwszej ścieżki wideo. Przeglądarka może zaokrąglać przewijanie. Jeśli plik ma elst (zmianę osi czasu Slo-mo) lub zmienny klatkaż, wynik skoku może być błędny — nie przeliczamy edycji kontenera.</p>
    <video ref={videoRef} src={clip.url} className="w-full border border-bd" controls playsInline muted preload="metadata"
      onLoadedMetadata={(event) => {
        const video = event.currentTarget
        if (!Number.isFinite(video.duration) || video.duration <= 0 || !video.videoWidth || !video.videoHeight) {
          setVideoError('Przeglądarka nie udostępniła prawidłowych metadanych wideo.')
        } else setMetadata({ duration: video.duration, width: video.videoWidth, height: video.videoHeight })
      }}
      onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
      onSeeking={() => setSeeking(true)}
      onSeeked={(event) => { setPosition(event.currentTarget.currentTime); setSeeking(false) }}
      onError={() => setVideoError('Przeglądarka nie obsługuje tego nagrania lub kodeka. Odczyt kontenera i JSON nadal są dostępne.')}
    />
    {videoError && <p role="alert">{videoError}</p>}
    <div className="flex flex-wrap gap-2">
      <Button disabled={!metadata || running || !!videoError} onClick={measure}>Zmierz klatkaż przy 0,1×</Button>
      <Button disabled={!canMark} variant="secondary" aria-label="Poprzednia klatka" onClick={() => moveFrame(-1)}>◀ 1 klatka</Button>
      <Button disabled={!canMark} variant="secondary" aria-label="Następna klatka" onClick={() => moveFrame(1)}>1 klatka ▶</Button>
    </div>
    <p role="status">{running ? 'Pomiar trwa maksymalnie 10 s…' : `Oszacowany klatkaż rVFC: ${number(estimatedFps)} kl./s; próbek: ${measurement?.samples.length ?? 0}.`}</p>
    {measurement?.error && <p role="alert">{measurement.error}</p>}
    {measurement && estimatedFps === null && !measurement.error && <p>Za mało kolejnych klatek do oszacowania fps. Spróbuj dłuższego nagrania.</p>}
    <p className="tabular-nums">Klatka (od 0): {frame ?? '—'}; currentTime: {number(position, 6)} s; krok: {number(stepSeconds, 6)} s.</p>
    <div className="flex flex-wrap gap-2">
      <Button disabled={!canMark} variant="secondary" onClick={() => mark('takeoff')}>Wybicie</Button>
      <Button disabled={!canMark} variant="secondary" onClick={() => mark('landing')}>Lądowanie</Button>
    </div>
    <p>Wybicie: {takeoff?.frame ?? '—'}; lądowanie: {landing?.frame ?? '—'}. Czas lotu: {number(flightSeconds)} s; wysokość: {number(heightCm, 2)} cm.</p>
    {takeoff && landing && flightSeconds === null && <p role="alert">Lądowanie musi być po wybiciu.</p>}
    <Button disabled={running || (!tracks && !containerError)} onClick={() => { void copyResult() }}>Kopiuj wynik (JSON)</Button>
    {copyStatus && <p role="status">{copyStatus}</p>}
    {json && <label className="block space-y-2"><span>Wynik JSON</span><textarea className={`${fieldClass} h-48 font-mono text-xs`} readOnly value={json} onFocus={(event) => event.currentTarget.select()} /></label>}
  </section>
}

function FlightCalculator() {
  const [seconds, setSeconds] = useState('')
  const height = jumpHeightCm(seconds.trim() === '' ? NaN : Number(seconds))
  return <section aria-labelledby="calculator-title" className="space-y-3 border-t border-bd pt-4">
    <h2 id="calculator-title" className="font-display text-lg font-semibold">Kalkulator kontrolny</h2>
    <p className="text-sm text-muted">Wzór: h = 9,81 · t² / 8. Ten kalkulator nie zmienia odczytów nagrania.</p>
    <label className="block space-y-2"><span>Czas lotu (s)</span><input className={fieldClass} type="number" min="0" step="any" inputMode="decimal" value={seconds} onChange={(event) => setSeconds(event.target.value)} /></label>
    <output aria-live="polite" className="block tabular-nums">Wysokość: {number(height, 2)} cm</output>
    {seconds !== '' && height === null && <p role="alert">Podaj dodatni, skończony czas lotu.</p>}
  </section>
}
