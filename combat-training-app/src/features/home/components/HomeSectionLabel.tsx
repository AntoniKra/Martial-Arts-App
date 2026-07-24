import type { ReactNode } from 'react'

interface HomeSectionLabelProps {
  children: ReactNode
  className?: string
  id?: string
}

export function HomeSectionLabel({ children, className = '', id }: HomeSectionLabelProps) {
  return (
    <span
      id={id}
      className={`font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-muted ${className}`}
    >
      {children}
    </span>
  )
}
