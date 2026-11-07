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

const textTokens = ['ink', 'muted', 'faint', 'crimson-ink'] as const
const surfaces = ['bg', 'surface', 'elevated', 'input'] as const

/** Colour of a semi-transparent foreground (e.g. `bg-crimson/10`) laid over an opaque background. */
function blend(foreground: string, background: string, alpha: number): string {
  const channel = (hex: string, start: number) => parseInt(hex.slice(start, start + 2), 16)
  return `#${[1, 3, 5]
    .map((start) => Math.round(alpha * channel(foreground, start) + (1 - alpha) * channel(background, start)))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`
}

function contrast(foreground: string, background: string): number {
  const first = luminance(foreground)
  const second = luminance(background)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

function sourceFiles(directory: string, extensions: readonly string[]): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(path, extensions) : extensions.some((extension) => entry.name.endsWith(extension)) ? [path] : []
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

  it.each(surfaces)('keeps the focus ring at least 3:1 on %s', (background) => {
    expect(contrast(getToken(mode, 'focus-ring'), getToken(mode, background))).toBeGreaterThanOrEqual(3)
  })

  it.each(textTokens)('keeps %s text at least 4.5:1 on every surface', (token) => {
    for (const background of surfaces) {
      expect(contrast(getToken(mode, token), getToken(mode, background)), background).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps red text readable on the tinted danger button, also on hover', () => {
    for (const background of surfaces) {
      for (const alpha of [0.1, 0.2]) {
        const tinted = blend(getToken(mode, 'crimson'), getToken(mode, background), alpha)
        expect(contrast(getToken(mode, 'crimson-ink'), tinted), `${background} ${alpha}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('keeps button text readable on the accent, also on hover', () => {
    for (const accent of ['crimson', 'crimson-hi']) {
      expect(contrast(getToken(mode, 'on-accent'), getToken(mode, accent)), accent).toBeGreaterThanOrEqual(4.5)
    }
  })
})

it('uses the text variant of red for text, because the accent is too dark for small text', () => {
  const accentTextClass = ['text', 'crimson'].join('-')
  const bareAccentText = new RegExp(`${accentTextClass}(?![-\\w])`)
  for (const path of sourceFiles(fileURLToPath(new URL('../../', import.meta.url)), ['.ts', '.tsx'])) {
    expect(readFileSync(path, 'utf8'), path).not.toMatch(bareAccentText)
  }
})

it('uses tokens instead of hex or rgb colours in components', () => {
  for (const path of sourceFiles(fileURLToPath(new URL('../../', import.meta.url)), ['.tsx'])) {
    expect(readFileSync(path, 'utf8'), path).not.toMatch(/#[a-f0-9]{3,8}\b|\brgba?\(/i)
  }
})
