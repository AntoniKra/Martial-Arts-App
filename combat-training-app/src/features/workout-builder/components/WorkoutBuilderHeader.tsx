import type { ReactNode, Ref } from 'react'

import { screenHeaderLabels } from '@/components/screenHeaderLabels'
import { TimelineCloseIcon } from '@/features/workout-builder/components/BlockTypeIcon'

interface WorkoutBuilderHeaderProps {
  title: string
  onClose: () => void
  closeDisabled?: boolean
  action?: ReactNode
  headingRef?: Ref<HTMLHeadingElement>
}

/** Form header D of the builder mockup: 44 px close | centred title | optional action. */
export function WorkoutBuilderHeader({ title, onClose, closeDisabled = false, action, headingRef }: WorkoutBuilderHeaderProps) {
  return (
    <header className="wb-topbar">
      <button type="button" aria-label={screenHeaderLabels.close} onClick={onClose} disabled={closeDisabled}
        className="wb-topbar-close wb-focusable">
        <TimelineCloseIcon />
      </button>
      <h1 ref={headingRef} tabIndex={headingRef ? -1 : undefined} className="wb-topbar-title wb-focusable">{title}</h1>
      <div className="wb-topbar-slot">{action}</div>
    </header>
  )
}
