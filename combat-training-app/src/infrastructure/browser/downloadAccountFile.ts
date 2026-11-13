/** Keep the File for a share fallback on iOS PWAs that cannot save a download link. */
export async function downloadAccountFile(content: string, name: string, type: string): Promise<void> {
  const file = new File([content], name, { type })
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone = matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && navigator.standalone === true)
  if (ios && standalone && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return
    } catch (cause) {
      // Closing the share sheet is a choice, not an error; any other refusal falls back to the download link.
      if (cause instanceof DOMException && cause.name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  try { link.click() } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60_000) }
}
