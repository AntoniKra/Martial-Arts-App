import { test, expect } from '@playwright/test'

test.use({ screenshot: 'off', trace: 'off' })

test('opens the hidden CMJ probe without signing in and calculates height from flight time', async ({ page }) => {
  await page.goto('/lab/video-frames')
  await expect(page).toHaveURL('/lab/video-frames')
  await expect(page.getByRole('heading', { name: 'Próba CMJ: klatki nagrania' })).toBeVisible()
  await expect(page.getByLabel('Wybierz nagranie')).toHaveAttribute('accept', 'video/*')
  await page.getByLabel('Czas lotu (s)', { exact: true }).fill('0.5')
  await expect(page.getByRole('status').filter({ hasText: 'Wysokość:' })).toHaveText('Wysokość: 30.66 cm')
  await page.getByLabel('Czas lotu (s)', { exact: true }).fill('-1')
  await expect(page.getByRole('alert')).toHaveText('Podaj dodatni, skończony czas lotu.')
  await expect(page.getByRole('status').filter({ hasText: 'Wysokość:' })).toHaveText('Wysokość: — cm')
})
