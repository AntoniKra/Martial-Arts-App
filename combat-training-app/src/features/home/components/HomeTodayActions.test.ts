import { isValidElement, type ReactElement, type ReactNode, type ChangeEvent } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { ScheduledWeekItem } from '@/domain/week-plan/weekPlan.types'
import type { useScheduledWeekActions } from '@/features/week-plan/useScheduledWeekActions'
import { scheduleLabels } from '@/features/week-plan/scheduleLabels'
import { homeLabels } from '../homeLabels'
import { HomeTodayActions } from './HomeScheduleCards'

const item: ScheduledWeekItem = { id: 'club', kind: 'club', day: 1, omitted: false, disciplineKey: 'boxing', startTime: '19:00', endTime: '20:00', parts: [], clubName: null }
function setup(busy = false, moving = true) {
  const actions: ReturnType<typeof useScheduledWeekActions> = {
    busy, error: null, saved: false, undo: null, save: vi.fn(), move: vi.fn(), toggleOmitted: vi.fn(), undoMove: vi.fn(),
  }
  const onMoving = vi.fn()
  return { actions, onMoving, tree: HomeTodayActions({ item, actions, moving, onMoving }) }
}
interface ControlProps { children?: ReactNode; onClick?: () => void; onChange?: (event: ChangeEvent<HTMLSelectElement>) => void; disabled?: boolean; 'aria-expanded'?: boolean }
function controls(node: ReactNode, tag: string): ReactElement<ControlProps>[] {
  if (Array.isArray(node)) return node.flatMap((child: ReactNode) => controls(child, tag))
  if (!isValidElement<ControlProps>(node)) return []
  return [...(node.type === tag ? [node] : []), ...controls(node.props.children, tag)]
}
describe('today card schedule actions', () => {
  it('uses the shared omission label and passes the original item to the week action', () => {
    const { actions, tree } = setup()
    expect(renderToStaticMarkup(tree)).toContain(scheduleLabels.omit)
    controls(tree, 'button')[0].props.onClick!()
    expect(actions.toggleOmitted).toHaveBeenCalledWith(item)
  })
  it('opens the existing move selector and delegates the selected day to the week action', () => {
    const { actions, tree, onMoving } = setup()
    expect(renderToStaticMarkup(tree)).toContain(homeLabels.moveDay)
    controls(tree, 'button')[1].props.onClick!()
    expect(onMoving).toHaveBeenCalledOnce()
    const change = controls(tree, 'select')[0].props.onChange!
    change({ target: { value: '3' } } as ChangeEvent<HTMLSelectElement>)
    expect(actions.move).toHaveBeenCalledWith(item, 3)
    change({ target: { value: 'invalid' } } as ChangeEvent<HTMLSelectElement>)
    expect(actions.move).toHaveBeenCalledOnce()
  })
  it('retains the busy guard on both buttons and the selector', () => {
    const { tree } = setup(true)
    for (const control of [...controls(tree, 'button'), ...controls(tree, 'select')]) expect(control.props.disabled).toBe(true)
  })
  it('starts collapsed and reports the selector state accessibly', () => {
    const { tree } = setup(false, false)
    expect(controls(tree, 'select')).toHaveLength(0)
    expect(controls(tree, 'button')[1].props['aria-expanded']).toBe(false)
  })
})
