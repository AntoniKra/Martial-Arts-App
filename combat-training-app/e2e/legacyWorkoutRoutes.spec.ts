import { test, expect } from './fixtures'

test.use({ screenshot: 'off' })

for (const route of ['preview', 'report']) {
  test(`handles the old workout ${route} URL as an unknown route`, async ({ app, page }) => {
    await app.open('/')
    const errorHeading = page.getByRole('heading', { name: 'Błąd ekranu', exact: true })
    const alert = page.getByRole('alert')

    await page.goto('/workouts/old-plan/unknown')
    await expect(errorHeading).toBeVisible()
    const expectedError = await alert.innerText()

    await page.goto(`/workouts/old-plan/${route}`)
    await expect(errorHeading).toBeVisible()
    await expect(alert).toHaveText(expectedError)
    await expect(page.getByText('Fundament projektu', { exact: true })).toHaveCount(0)
  })
}
