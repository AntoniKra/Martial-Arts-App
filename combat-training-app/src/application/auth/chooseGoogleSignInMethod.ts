export type GoogleSignInMethod = 'redirect' | 'popup'

export interface SignInEnvironment {
  /** The app runs as an installed PWA (display-mode standalone or iOS home screen). */
  standalone: boolean
  /** The primary pointer is a finger, which in practice means a phone or tablet. */
  touchPrimary: boolean
}

/** Popups are unreliable on phones and inside installed PWAs, so those always use a full-page redirect. */
export function chooseGoogleSignInMethod(environment: SignInEnvironment): GoogleSignInMethod {
  return environment.standalone || environment.touchPrimary ? 'redirect' : 'popup'
}
