import type { Page, TestInfo } from '@playwright/test'

import { expect, test } from './fixtures'

async function chooseLibraryExercise(page: Page, name: string) {
  await page.getByRole('button', { name: 'Dodaj ćwiczenie do bloku 1 — Technika', exact: true }).click()
  await page.getByRole('button', { name, exact: true }).click()
}

async function chooseTile(page: Page, groupName: string, optionName: string) {
  const group = page.getByRole('group', { name: groupName, exact: true })
  await group.getByText(optionName, { exact: true }).click()
  await expect(group.getByRole('radio', { name: optionName, exact: true })).toBeChecked()
}

async function captureConfiguration(page: Page, testInfo: TestInfo, theme: 'dark' | 'light') {
  if (testInfo.project.name !== 'phone') {
    return
  }

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: testInfo.outputPath(`config-${theme}-top.png`) })
  await page.getByRole('group', { name: 'Przerwa między rundami', exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: testInfo.outputPath(`config-${theme}-rest.png`) })
  await page.getByRole('button', { name: 'Dodaj ćwiczenie', exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: testInfo.outputPath(`config-${theme}-submit.png`) })
  await page.evaluate(() => window.scrollTo(0, 0))
}

test('builds a boxing plan of 2 × 1:00 with 0:30 rest without typing the round settings', async ({ app, page }, testInfo) => {
  await app.open('/workouts/new')
  await page.getByRole('radio', { name: 'Boks', exact: true }).check()
  await page.getByRole('button', { name: 'Dodaj blok', exact: true }).click()
  await page.getByRole('button', { name: 'Technika', exact: true }).click()

  await chooseLibraryExercise(page, 'Jab → prawy prosty')
  await chooseTile(page, 'Liczba rund', '2')
  await chooseTile(page, 'Czas rundy', '1:00')
  await chooseTile(page, 'Przerwa między rundami', '0:30')
  await expect(page.getByRole('button', { name: '3 × 3:00 · przerwa 1:00', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await page.getByRole('button', { name: 'Dodaj ćwiczenie', exact: true }).click()

  await chooseLibraryExercise(page, 'Podwójny jab → prawy prosty')
  await expect(page.getByRole('group', { name: 'Liczba rund', exact: true }).getByRole('radio', { name: '2', exact: true })).toBeChecked()
  await expect(page.getByRole('group', { name: 'Czas rundy', exact: true }).getByRole('radio', { name: '1:00', exact: true })).toBeChecked()
  await expect(
    page.getByRole('group', { name: 'Przerwa między rundami', exact: true }).getByRole('radio', { name: '0:30', exact: true }),
  ).toBeChecked()
  await expect(page.getByRole('button', { name: '3 × 3:00 · przerwa 1:00', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await expect(page.getByRole('button', { name: '3 × 3:00 · przerwa 0:30', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  )

  const tiles = [
    page.getByRole('group', { name: 'Gotowe formaty', exact: true }).getByRole('button'),
    page.getByRole('group', { name: 'Liczba rund', exact: true }).locator('label'),
    page.getByRole('group', { name: 'Czas rundy', exact: true }).locator('label'),
    page.getByRole('group', { name: 'Przerwa między rundami', exact: true }).locator('label'),
  ]
  const heights: number[] = []
  for (const group of tiles) {
    const count = await group.count()
    for (let index = 0; index < count; index += 1) {
      const box = await group.nth(index).boundingBox()
      expect(box).not.toBeNull()
      heights.push(box?.height ?? 0)
    }
  }
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(44)
  test.info().annotations.push({
    type: 'tile-height-px',
    description: `min ${Math.min(...heights)} max ${Math.max(...heights)} count ${heights.length} viewport ${page.viewportSize()?.width}×${page.viewportSize()?.height}`,
  })

  await captureConfiguration(page, testInfo, 'dark')
  await app.setTheme('light')
  await captureConfiguration(page, testInfo, 'light')
  await app.setTheme('dark')

  await page.getByRole('button', { name: 'Dodaj ćwiczenie', exact: true }).click()
  await expect(page.getByText('2 rundy × 1:00 · przerwa 0:30', { exact: true })).toHaveCount(2)

  await app.savePlan()
  await page.getByRole('link', { name: 'Zobacz plan', exact: true }).click()
  await expect(page.getByText('2 rundy × 1:00 · przerwa 0:30', { exact: true })).toHaveCount(2)
})
