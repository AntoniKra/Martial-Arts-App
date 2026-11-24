import type { ReactNode } from 'react'

interface NavIconProps {
  className?: string
  size?: number
}

function NavIconBase({
  children,
  className = '',
  size = 20,
}: {
  children: ReactNode
  className?: string
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function NavHomeIcon({ className, size = 20 }: NavIconProps) {
  return (
    <NavIconBase className={className} size={size}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </NavIconBase>
  )
}

export function NavPlanIcon({ className, size = 20 }: NavIconProps) {
  return <NavIconBase className={className} size={size}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="8" y1="14" x2="8.01" y2="14" strokeWidth="2.2" />
    <line x1="12" y1="14" x2="12.01" y2="14" strokeWidth="2.2" />
    <line x1="16" y1="14" x2="16.01" y2="14" strokeWidth="2.2" />
  </NavIconBase>
}

export function NavProgressIcon({ className, size = 20 }: NavIconProps) {
  return <NavIconBase className={className} size={size}>
    {/* Axis plus three bars that stop above it, so the strokes never merge at 20 px. */}
    <path d="M4 4v15a1 1 0 0 0 1 1h15" /><path d="M9 16v-4" /><path d="M14 16V7" /><path d="M19 16v-7" />
  </NavIconBase>
}

export function NavProfileIcon({ className, size = 20 }: NavIconProps) {
  return <NavIconBase className={className} size={size}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </NavIconBase>
}

export function NavCreateIcon({ className, size = 20 }: NavIconProps) {
  return (
    <NavIconBase className={className} size={size}>
      <path d="M12 5v14M5 12h14" />
    </NavIconBase>
  )
}

export function NavigationIcon({ id }: { id: 'home' | 'plan' | 'newWorkout' | 'progress' | 'profile' }) {
  switch (id) {
    case 'home':
      return <NavHomeIcon />
    case 'plan':
      return <NavPlanIcon />
    case 'newWorkout':
      return <NavCreateIcon />
    case 'progress':
      return <NavProgressIcon />
    case 'profile':
      return <NavProfileIcon />
  }
}
