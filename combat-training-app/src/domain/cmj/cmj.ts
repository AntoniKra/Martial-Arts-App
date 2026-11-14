export function jumpHeightCm(flightSeconds: number): number | null {
  if (!Number.isFinite(flightSeconds) || flightSeconds <= 0) return null
  return 9.81 * flightSeconds ** 2 / 8 * 100
}

export function frameFlightSeconds(takeoff: number, landing: number, fps: number): number | null {
  if (![takeoff, landing, fps].every(Number.isFinite)
    || !Number.isInteger(takeoff) || !Number.isInteger(landing)
    || takeoff < 0 || landing <= takeoff || fps <= 0) return null
  return (landing - takeoff) / fps
}

// Each media-time delta describes source frames, independently of playbackRate.
// Exclude dropped callbacks instead of interpreting a missed frame as a lower source fps.
export function estimateFrameRate(samples: { mediaTime: number; presentedFrames: number }[]): number | null {
  const deltas = samples.slice(1).flatMap((sample, index) => {
    const previous = samples[index]
    const delta = sample.mediaTime - previous.mediaTime
    return Number.isFinite(delta) && delta > 0 && sample.presentedFrames - previous.presentedFrames === 1 ? [delta] : []
  }).sort((a, b) => a - b)
  if (deltas.length < 3) return null
  const middle = Math.floor(deltas.length / 2)
  const median = deltas.length % 2 === 0 ? (deltas[middle - 1] + deltas[middle]) / 2 : deltas[middle]
  return 1 / median
}
