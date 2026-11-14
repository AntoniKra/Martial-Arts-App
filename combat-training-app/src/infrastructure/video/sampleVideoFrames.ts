export interface FrameSample {
  mediaTime: number
  presentedFrames: number
  presentationTime: number
  expectedDisplayTime: number
  width: number
  height: number
}
export interface FrameMeasurement {
  requestedPlaybackRate: number
  actualPlaybackRate: number
  samples: FrameSample[]
  error: string | null
}

export function sampleVideoFrames(video: HTMLVideoElement, done: (result: FrameMeasurement) => void): () => void {
  const result: FrameMeasurement = { requestedPlaybackRate: 0.1, actualPlaybackRate: video.playbackRate, samples: [], error: null }
  let callback: number | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let finished = false
  const finish = (error: string | null = null, notify = true) => {
    if (finished) return
    finished = true
    if (callback !== undefined) video.cancelVideoFrameCallback(callback)
    clearTimeout(timer)
    video.removeEventListener('ended', ended)
    video.removeEventListener('error', failed)
    video.pause()
    video.playbackRate = 1
    result.error = error
    if (notify) done(result)
  }
  const ended = () => finish()
  const failed = () => finish('Przeglądarka nie odtworzyła nagrania.')
  if (typeof video.requestVideoFrameCallback !== 'function') {
    finish('Ta przeglądarka nie obsługuje requestVideoFrameCallback.')
    return () => {}
  }
  try {
    video.pause()
    video.currentTime = 0
    video.playbackRate = 0.1
    result.actualPlaybackRate = video.playbackRate
    video.addEventListener('ended', ended)
    video.addEventListener('error', failed)
    const next: VideoFrameRequestCallback = (_now, metadata) => {
      if (finished) return
      const { mediaTime, presentedFrames, presentationTime, expectedDisplayTime, width, height } = metadata
      result.samples.push({ mediaTime, presentedFrames, presentationTime, expectedDisplayTime, width, height })
      if (result.samples.length >= 180) finish()
      else callback = video.requestVideoFrameCallback(next)
    }
    callback = video.requestVideoFrameCallback(next)
    timer = setTimeout(() => finish(), 10_000)
    void video.play().catch(() => finish('Nie udało się odtworzyć z prędkością 0,1. Spróbuj ponownie lub wybierz inny plik.'))
  } catch {
    finish('Przeglądarka odrzuciła odtwarzanie z prędkością 0,1.')
  }
  return () => finish(null, false)
}
