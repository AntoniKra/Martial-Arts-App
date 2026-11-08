import { describe, expect, it } from 'vitest'
import { validateFocusSkillForm } from './validateFocusSkillForm'

describe('focus skill form', () => {
  it('trims the name and criterion before saving', () => {
    expect(validateFocusSkillForm({ name: '  Guard return  ', criterion: '  Hand touches chin  ' }))
      .toEqual({ ok: true, values: { name: 'Guard return', criterion: 'Hand touches chin' } })
  })

  it.each([
    { name: '', criterion: 'Valid' }, { name: '   ', criterion: 'Valid' },
    { name: 'n'.repeat(81), criterion: 'Valid' }, { name: 'Valid', criterion: '\n ' },
    { name: 'Valid', criterion: 'c'.repeat(201) },
  ])('reports invalid fields without accepting the form: %j', (values) => {
    expect(validateFocusSkillForm(values).ok).toBe(false)
  })

  it('accepts the maximum lengths', () => {
    expect(validateFocusSkillForm({ name: 'n'.repeat(80), criterion: 'c'.repeat(200) }).ok).toBe(true)
  })
})
