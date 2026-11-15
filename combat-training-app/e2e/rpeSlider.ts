import type { Locator, Page } from '@playwright/test'

export async function selectRpe(scope: Page | Locator, value: number) {
  const slider = scope.getByRole('slider', { name: 'RPE od 0 do 10', exact: true })
  await slider.press('Home')
  for (let step = 0; step < value; step++) await slider.press('ArrowRight')
}
