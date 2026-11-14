import { afterEach, describe, expect, it, vi } from 'vitest'
import { sampleVideoFrames, type FrameMeasurement } from './sampleVideoFrames'

function fakeVideo() {
  let callback: VideoFrameRequestCallback | undefined
  const video = Object.assign(new EventTarget(), {
    currentTime: 2, playbackRate: 1,
    play: vi.fn(() => Promise.resolve()), pause: vi.fn(),
    requestVideoFrameCallback: vi.fn((next: VideoFrameRequestCallback) => { callback = next; return 1 }),
    cancelVideoFrameCallback: vi.fn(),
  })
  return {
    video, element: video as unknown as HTMLVideoElement,
    frame: (index: number) => callback?.(index * 10, { mediaTime: index / 240, presentedFrames: index, presentationTime: index * 10, expectedDisplayTime: index * 10, width: 1920, height: 1080 }),
  }
}

afterEach(() => { vi.useRealTimers() })
describe('bounded browser frame sampling', () => {
  it('plays at 0.1, records source timestamps, stops at 10 seconds and restores normal rate', () => {
    vi.useFakeTimers()
    const { video, element, frame } = fakeVideo()
    const done = vi.fn<(result: FrameMeasurement) => void>()
    sampleVideoFrames(element, done)
    expect(video.playbackRate).toBe(0.1)
    expect(video.currentTime).toBe(0)
    for (let index = 0; index < 5; index++) frame(index)
    vi.advanceTimersByTime(10_000)
    expect(done).toHaveBeenCalledOnce()
    expect(done.mock.calls[0][0]).toMatchObject({ actualPlaybackRate: 0.1, error: null, samples: expect.arrayContaining([{ mediaTime: 1 / 240, presentedFrames: 1, presentationTime: 10, expectedDisplayTime: 10, width: 1920, height: 1080 }]) })
    expect(video.playbackRate).toBe(1)
    expect(video.cancelVideoFrameCallback).toHaveBeenCalled()
  })
  it('cancels without notifying a disposed recording', () => {
    vi.useFakeTimers()
    const { element, frame } = fakeVideo()
    const done = vi.fn()
    const cancel = sampleVideoFrames(element, done)
    cancel()
    frame(1)
    vi.advanceTimersByTime(10_000)
    expect(done).not.toHaveBeenCalled()
  })
  it('finishes once at the end or at 180 frames', () => {
    vi.useFakeTimers()
    const { video, element, frame } = fakeVideo()
    const done = vi.fn()
    sampleVideoFrames(element, done)
    for (let index = 0; index < 200; index++) frame(index)
    video.dispatchEvent(new Event('ended'))
    vi.advanceTimersByTime(10_000)
    expect(done).toHaveBeenCalledOnce()
    expect(done.mock.calls[0][0].samples).toHaveLength(180)
  })
  it('reports unsupported callbacks and rejected playback without throwing', async () => {
    const { video, element } = fakeVideo()
    const done = vi.fn()
    video.play.mockRejectedValueOnce(new Error('unsupported rate'))
    sampleVideoFrames(element, done)
    await Promise.resolve()
    expect(done.mock.calls[0][0].error).toContain('0,1')
    const unsupported = fakeVideo()
    Object.defineProperty(unsupported.video, 'requestVideoFrameCallback', { value: undefined })
    sampleVideoFrames(unsupported.element, done)
    expect(done.mock.calls[1][0].error).toContain('requestVideoFrameCallback')
  })
})
