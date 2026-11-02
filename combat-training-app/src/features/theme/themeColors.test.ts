import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DisciplineBadge } from '@/components/domain/DisciplineBadge'
import type { ThemeMode } from '@/features/theme/theme.types'
import { THEME_COLOR_BY_MODE } from '@/features/theme/themeStorage'

const css = readFileSync(new URL('../../styles/index.css', import.meta.url), 'utf8')
const disciplines = [
  { key: 'boxing', token: 'boxing' },
  { key: 'kickboxing', token: 'kickboxing' },
  { key: 'muay_thai', token: 'muay-thai' },
  { key: 'k1', token: 'k1' },
  { key: 'mma_striking', token: 'mma-striking' },
] as const

function getToken(mode: ThemeMode, name: string): string {
  const block = css.match(new RegExp(`:root\\[data-theme='${mode}'\\] \\{([^}]+)\\}`))?.[1]
  const value = block?.match(new RegExp(`--app-${name}: (#[a-f0-9]{6});`, 'i'))?.[1]
  if (!value) throw new Error(`Missing ${mode} token: ${name}`)
  return value
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function contrast(foreground: string, background: string): number {
  const first = luminance(foreground)
  const second = luminance(background)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

function componentFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? componentFiles(path) : entry.name.endsWith('.tsx') ? [path] : []
  })
}

describe.each(['dark', 'light'] as const)('%s theme colours', (mode) => {
  it.each(disciplines)('keeps $key text at least 4.5:1 against card and page surfaces', ({ key, token }) => {
    const markup = renderToStaticMarkup(createElement(DisciplineBadge, { disciplineKey: key }))
    expect(markup).toContain(`text-discipline-${token}`)
    expect(css).toContain(`--color-discipline-${token}: var(--app-discipline-${token});`)
    for (const background of ['surface', 'elevated', 'bg']) {
      expect(contrast(getToken(mode, `discipline-${token}`), getToken(mode, background))).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('matches the browser bar to the page background', () => {
    expect(THEME_COLOR_BY_MODE[mode].toLowerCase()).toBe(getToken(mode, 'bg'))
  })
})

it('keeps secondary light-theme labels readable on every surface', () => {
  for (const background of ['surface', 'elevated', 'bg', 'input']) {
    expect(contrast(getToken('light', 'faint'), getToken('light', background))).toBeGreaterThanOrEqual(4.5)
  }
})

it('uses tokens instead of hex or rgb colours in components', () => {
  for (const path of componentFiles(fileURLToPath(new URL('../../', import.meta.url)))) {
    expect(readFileSync(path, 'utf8'), path).not.toMatch(/#[a-f0-9]{3,8}\b|\brgba?\(/i)
  }
})
