import { describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'
import firebaseConfig from '../../firebase.json'
import { previewContentSecurityPolicy, productionContentSecurityPolicy } from '../../config/contentSecurityPolicy'

// Use the path matcher shipped with the installed Firebase Hosting emulator.
const { configMatcher } = createRequire(import.meta.url)('superstatic/lib/utils/patterns.js') as {
  configMatcher: (path: string, config: { source: string }) => boolean
}

function directives(policy: string) {
  return Object.fromEntries(policy.split(';').map((directive) => {
    const [name, ...sources] = directive.trim().split(/\s+/)
    return [name, sources]
  }))
}

describe('content security policy', () => {
  it('covers app routes and assets while excluding Firebase reserved auth pages', () => {
    const policyRules = firebaseConfig.hosting.headers.filter(({ headers }) =>
      headers.some(({ key }) => key === 'Content-Security-Policy'))
    expect(policyRules).toHaveLength(1)
    const matches = (path: string) => policyRules.some((rule) => configMatcher(path, rule))
    for (const path of ['/', '/index.html', '/login', '/workouts/plan/active', '/assets/app.js', '/sw.js', '/theme-bootstrap.js']) {
      expect(matches(path), path).toBe(true)
    }
    for (const path of ['/__/auth/handler', '/__/auth/iframe', '/__/firebase/init.js']) {
      expect(configMatcher(path, { source: '**' }), path).toBe(true)
      expect(matches(path), path).toBe(false)
    }
  })

  it('enforces production restrictions without inline scripts, eval or emulator access', () => {
    expect(productionContentSecurityPolicy).not.toMatch(/'unsafe-inline'|'unsafe-eval'|127\.0\.0\.1|localhost/)
    expect(directives(productionContentSecurityPolicy)).toEqual({
      'default-src': ["'self'"],
      'script-src': ["'self'", 'https://apis.google.com'],
      'connect-src': ["'self'", 'https://firestore.googleapis.com', 'https://identitytoolkit.googleapis.com', 'https://securetoken.googleapis.com'],
      'frame-src': ["'self'"],
      'img-src': ["'self'", 'data:', 'https://www.google.com/images/cleardot.gif'],
      'font-src': ["'self'"],
      'style-src': ["'self'"],
      'worker-src': ["'self'"],
      'manifest-src': ["'self'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'self'"],
    })
  })

  it('extends only connections and the Auth frame with the two local emulators in preview', () => {
    const production = directives(productionContentSecurityPolicy)
    expect(directives(previewContentSecurityPolicy)).toEqual({
      ...production,
      'connect-src': [production['connect-src'][0], 'http://127.0.0.1:8080', 'http://127.0.0.1:9099', ...production['connect-src'].slice(1)],
      'frame-src': ["'self'", 'http://127.0.0.1:9099'],
    })
  })
})
