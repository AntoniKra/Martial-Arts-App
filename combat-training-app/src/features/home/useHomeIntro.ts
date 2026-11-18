import { useEffect, useRef } from 'react'
import { homeIntroDuration, startHomeIntro } from './homeIntro'

export function useHomeIntro(ready: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ready) return
    let dispose = () => {}
    // Defer the claim until paint; StrictMode's discarded effect cannot consume it.
    const frame = requestAnimationFrame(() => {
      const root = ref.current
      if (!root) return
      const duration = homeIntroDuration(getComputedStyle(root))
      try {
        dispose = startHomeIntro({
          storage: window.sessionStorage,
          motion: matchMedia('(prefers-reduced-motion: reduce)'),
          events: document, duration,
          show: () => { root.dataset.homeIntro = 'true' },
          hide: () => { delete root.dataset.homeIntro },
        })
      } catch { /* Storage can be unavailable in private or restricted contexts. */ }
    })
    return () => { cancelAnimationFrame(frame); dispose() }
  }, [ready])
  return ref
}
