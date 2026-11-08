import { readFileSync } from 'node:fs'
import { parse, type ChildNode, type Document, type Root } from 'postcss'
import { describe, expect, it } from 'vitest'

function unlayeredControlFonts(css: string): string[] {
  const violations: string[] = []
  const controlSelector = /(?:^|[\s>+~,(])(?:button|input|select|textarea)(?=[\s.#:[>+~),]|$)/i
  parse(css).walkDecls(/^(font|font-size)$/i, (declaration) => {
    let parent: ChildNode | Root | Document | undefined = declaration.parent
    let targetsControl = false
    while (parent) {
      if (parent.type === 'atrule' && parent.name.toLowerCase() === 'layer') return
      if (parent.type === 'rule' && controlSelector.test(parent.selector)) targetsControl = true
      parent = parent.parent
    }
    if (targetsControl) violations.push(declaration.toString())
  })
  return violations
}

describe('form control font cascade', () => {
  it('keeps font and font-size declarations for controls inside cascade layers in index.css', () => {
    const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')
    expect(unlayeredControlFonts(css)).toEqual([])
  })

  it.each(['button', 'input', 'select', 'textarea'])('detects unlayered %s rules, including conditional and nested rules', (tag) => {
    expect(unlayeredControlFonts(`${tag} { font: inherit; }`)).toHaveLength(1)
    expect(unlayeredControlFonts(`@media (width < 400px) { ${tag}:focus { font-size: 13px; } }`)).toHaveLength(1)
    expect(unlayeredControlFonts(`${tag} { &:focus-visible { font: inherit; } }`)).toHaveLength(1)
    expect(unlayeredControlFonts(`@layer base; ${tag} { font-size: 13px; }`)).toHaveLength(1)
  })

  it('detects grouped selectors and controls inside selector functions', () => {
    expect(unlayeredControlFonts('button, input, textarea, select { font: inherit; font-size: 13px; }')).toHaveLength(2)
    expect(unlayeredControlFonts(':is(button, input) { font: inherit; }')).toHaveLength(1)
  })

  it('allows layered defaults and unrelated typography', () => {
    expect(unlayeredControlFonts(`
      @layer base { button, input, textarea, select { font: inherit; } }
      @media (width < 400px) { @layer base { input { font-size: 16px; } } }
      @layer { select { font-size: 16px; } }
      body { font: inherit; }
      .input-label { font-size: 13px; }
      /* button { font: inherit; } */
    `)).toEqual([])
  })
})
