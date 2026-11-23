import { test, expect, openProfile } from './fixtures'
import { createVerifiedAccount, signIn } from './authEmulator'

test('signs out with a cache warning, clears unreadable copies and retries on reload', async ({ page, request }) => {
  await page.addInitScript(() => {
    const deleteDatabase = IDBFactory.prototype.deleteDatabase
    IDBFactory.prototype.deleteDatabase = function (name) {
      if (name.startsWith('firestore/')) {
        const attempts = Number(sessionStorage.getItem('firestore-cleanup-attempts'))
        sessionStorage.setItem('firestore-cleanup-attempts', String(attempts + 1))
        if (attempts === 0) throw new DOMException('Test deletion failure', 'InvalidStateError')
      }
      return deleteDatabase.call(this, name)
    }
  })
  const account = await createVerifiedAccount(request)
  await page.goto('/login')
  await signIn(page, account)
  await expect(page).toHaveURL('/')
  await openProfile(page)
  const ownCopy = `combat-training.completedWorkout.corrupt.${account.uid}`
  const otherCopy = `combat-training.completedWorkout.corrupt.other.${account.uid}`
  await page.evaluate(([own, other]) => {
    localStorage.setItem(own, '{')
    localStorage.setItem(other, '{')
  }, [ownCopy, otherCopy])

  await page.getByRole('button', { name: 'Wyloguj', exact: true }).click()
  await expect(page).toHaveURL('/login')
  await expect(page.getByRole('alert')).toContainText('Nie udało się wyczyścić pamięci aplikacji.')
  expect(await page.evaluate(([own, other]) => [localStorage.getItem(own), localStorage.getItem(other)], [ownCopy, otherCopy])).toEqual([null, '{'])

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Zaloguj się', exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(await page.evaluate(() => sessionStorage.getItem('firestore-cleanup-attempts'))).toBe('2')
})
