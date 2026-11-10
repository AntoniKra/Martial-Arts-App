import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { FocusSkillAssessment } from '@/domain/focus-skill/focusSkillProgress'
import { FocusSkillChart } from './FocusSkillChart'

function assessment(id: string, workoutDate: string, value = 3): FocusSkillAssessment {
  return { workoutItemId: id, focusSkillId: 'guard', skillNameSnapshot: 'Guard', criterionSnapshot: 'Chin',
    blockType: 'bag', assessment: value, correction: null, previousCorrectionCheck: null,
    sessionId: id, workoutDate, planName: 'Bag', currentCriterion: true }
}

describe('coincident chart points', () => {
  it.each(['start', 'end', 'only'] as const)('keeps three coincident points at least 14 pixels apart at the %s of the axis', (position) => {
    const date = position === 'end' ? '2026-05-20' : '2026-05-01'
    const entries = Array.from({ length: 3 }, (_, index) => assessment(`same-${index}`, date))
    if (position !== 'only') entries.push(assessment('other', position === 'start' ? '2026-05-20' : '2026-05-01', 1))
    entries.sort((a, b) => a.workoutDate.localeCompare(b.workoutDate))
    const html = renderToStaticMarkup(createElement(FocusSkillChart, { assessments: entries }))
    const positions = [...html.matchAll(/transform="translate\(([\d.]+) 116\)"/g)].map((match) => Number(match[1]))
    expect(positions).toHaveLength(3)
    expect(positions[1] - positions[0]).toBeGreaterThanOrEqual(14)
    expect(positions[2] - positions[1]).toBeGreaterThanOrEqual(14)
    expect(positions[0]).toBeGreaterThanOrEqual(34)
    expect(positions[2]).toBeLessThanOrEqual(300)
  })

  it('preserves pixel spacing with a scrollable chart when a group exceeds the viewport', () => {
    const entries = Array.from({ length: 30 }, (_, index) => assessment(`same-${index}`, '2026-05-01'))
    const html = renderToStaticMarkup(createElement(FocusSkillChart, { assessments: entries }))
    const positions = [...html.matchAll(/transform="translate\(([\d.]+) 116\)"/g)].map((match) => Number(match[1]))
    expect(positions).toHaveLength(30)
    for (let index = 1; index < positions.length; index += 1) {
      expect(positions[index] - positions[index - 1]).toBeGreaterThanOrEqual(14)
    }
    const svgWidth = Number(html.match(/<svg width="(\d+)"/)?.[1])
    expect(svgWidth).toBeGreaterThan(320)
    expect(positions.at(-1)).toBeLessThanOrEqual(svgWidth - 20)
    expect(html).toContain('overflow-x-auto')
    expect(html).toContain('max-w-none')
  })
})
