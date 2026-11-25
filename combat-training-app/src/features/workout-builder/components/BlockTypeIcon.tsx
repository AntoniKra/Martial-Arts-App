import type { ReactNode } from 'react'

import type { WorkoutBlockType } from '@/domain/workout/workout.types'

/** Line icons for block types, as in the approved builder mockup (N3 G). */
const blockTypePaths: Record<WorkoutBlockType, ReactNode> = {
  warmup: (
    <>
      <path d="M12 3c1 3 4 4.5 4 8.5A4 4 0 0 1 8 11.5c0-1.5.6-2.6 1.5-3.5.2 1.3.9 2 1.8 2.3C11 8 11.2 5.3 12 3z" />
      <path d="M10 17.5a2 2 0 0 0 4 0c0-1.2-.8-1.8-2-3-1.2 1.2-2 1.8-2 3z" />
    </>
  ),
  technique: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </>
  ),
  pads: (
    <>
      <rect x="6" y="4" width="12" height="16" rx="1.5" />
      <path d="M9 9h6M9 13h6" />
    </>
  ),
  bag: (
    <>
      <path d="M12 2v3" />
      <path d="M8 5h8v14a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z" />
      <path d="M8 10h8" />
    </>
  ),
  sparring: (
    <>
      <path d="M5 19 15 9" />
      <path d="M19 19 9 9" />
      <path d="M13 7l2-2 4 4-2 2" />
      <path d="M11 7 9 5 5 9l2 2" />
    </>
  ),
  conditioning: <path d="M3 12h4l2-5 4 10 2-5h6" />,
  strengthAndConditioning: <path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" />,
  cooldown: (
    <>
      <path d="M3 10c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
      <path d="M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
    </>
  ),
}

export function BlockTypeIcon({ blockType }: { blockType: WorkoutBlockType }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {blockTypePaths[blockType]}
    </svg>
  )
}

export function TimelinePlusIcon({ size = 16, strokeWidth = 2.4 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function TimelineClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
      aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export function TimelineCloseIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

/** Icons of the row action buttons (W górę, W dół, Edytuj, Usuń). */
export function RowActionIcon({ action }: { action: 'up' | 'down' | 'edit' | 'remove' }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {action === 'up' && <polyline points="18 15 12 9 6 15" />}
      {action === 'down' && <polyline points="6 9 12 15 18 9" />}
      {action === 'edit' && <><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></>}
      {action === 'remove' && <><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>}
    </svg>
  )
}
