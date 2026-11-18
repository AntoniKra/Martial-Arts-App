export const HOME_INTRO_SESSION_KEY = 'fightlog.start-intro-shown'

export function homeIntroDuration(styles: Pick<CSSStyleDeclaration, 'getPropertyValue'>) {
  const milliseconds = (token: string) => {
    const value = styles.getPropertyValue(token).trim()
    // Production CSS can shorten 300ms to .3s, including custom properties.
    return Number.parseFloat(value) * (value.endsWith('ms') ? 1 : 1000)
  }
  return milliseconds('--motion-slow') + 2 * milliseconds('--motion-med')
}

interface IntroEnvironment {
  storage: Pick<Storage, 'getItem' | 'setItem'>
  motion: Pick<MediaQueryList, 'matches' | 'addEventListener' | 'removeEventListener'>
  events: Pick<Document, 'addEventListener' | 'removeEventListener'>
  duration: number
  show: () => void
  hide: () => void
}

/** Decorative only: pointer events still reach the content below the spark. */
export function startHomeIntro({ storage, motion, events, duration, show, hide }: IntroEnvironment) {
  if (motion.matches) return () => {}
  try {
    if (storage.getItem(HOME_INTRO_SESSION_KEY)) return () => {}
    storage.setItem(HOME_INTRO_SESSION_KEY, 'true')
  } catch { return () => {} }

  let active = true
  function dismiss() {
    if (!active) return
    active = false
    clearTimeout(timer)
    events.removeEventListener('pointerdown', dismiss, true)
    events.removeEventListener('keydown', dismiss, true)
    motion.removeEventListener('change', dismiss)
    hide()
  }
  const timer = setTimeout(dismiss, duration)
  events.addEventListener('pointerdown', dismiss, true)
  events.addEventListener('keydown', dismiss, true)
  motion.addEventListener('change', dismiss)
  show()
  return dismiss
}
