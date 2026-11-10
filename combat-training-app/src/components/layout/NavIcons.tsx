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
      strokeWidth="1.75"
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

export function NavWorkoutsIcon({ className, size = 20 }: NavIconProps) {
  return (
    <NavIconBase className={className} size={size}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </NavIconBase>
  )
}

export function NavCreateIcon({ className, size = 20 }: NavIconProps) {
  return (
    <NavIconBase className={className} size={size}>
      <path d="M12 5v14M5 12h14" />
    </NavIconBase>
  )
}

export function NavigationIcon({ id }: { id: 'home' | 'workouts' | 'newWorkout' | 'progress' }) {
  switch (id) {
    case 'home':
      return <NavHomeIcon />
    case 'workouts':
      return <NavWorkoutsIcon />
    case 'newWorkout':
      return <NavCreateIcon />
    case 'progress':
      return <NavIconBase><path d="M4 3v17h17" /><circle cx="8" cy="14" r="1.5" /><path d="m12 8 2-2 2 2-2 2zM18 12h3v3h-3z" /></NavIconBase>
  }
}
