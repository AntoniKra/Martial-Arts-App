import { afterEach, expect, it, vi } from 'vitest'
import { subscribeToVerificationOnReturn } from './subscribeToVerificationOnReturn'

const unverified = { uid: 'athlete', email: 'athlete@example.test', emailVerified: false }

function browserEvents() {
  const browserWindow = new EventTarget()
  const document = Object.assign(new EventTarget(), { visibilityState: 'visible' })
  const navigator = { onLine: true }
  vi.stubGlobal('window', browserWindow)
  vi.stubGlobal('document', document)
  vi.stubGlobal('navigator', navigator)
  return { document, navigator, focus: () => browserWindow.dispatchEvent(new Event('focus')) }
}

afterEach(() => vi.unstubAllGlobals())

it('does not reload the profile of a verified session on focus or visibility change', () => {
  const browser = browserEvents()
  const reload = vi.fn(async () => true)
  subscribeToVerificationOnReturn({ ...unverified, emailVerified: true }, reload)
  browser.focus()
  browser.document.dispatchEvent(new Event('visibilitychange'))
  expect(reload).not.toHaveBeenCalled()
})

it('checks an unverified session only when online and visible, and unsubscribes on exit', () => {
  const browser = browserEvents()
  const reload = vi.fn(async () => false)
  const unsubscribe = subscribeToVerificationOnReturn(unverified, reload)
  const visibilityChanged = () => browser.document.dispatchEvent(new Event('visibilitychange'))

  browser.navigator.onLine = false
  browser.focus()
  visibilityChanged()
  browser.navigator.onLine = true
  browser.document.visibilityState = 'hidden'
  visibilityChanged()
  expect(reload).not.toHaveBeenCalled()

  browser.document.visibilityState = 'visible'
  visibilityChanged()
  browser.focus()
  expect(reload).toHaveBeenCalledTimes(2)

  unsubscribe?.()
  browser.focus()
  visibilityChanged()
  expect(reload).toHaveBeenCalledTimes(2)
})
