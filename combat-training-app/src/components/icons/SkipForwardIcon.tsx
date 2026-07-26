interface SkipForwardIconProps {
  className?: string
}

export function SkipForwardIcon({ className = '' }: SkipForwardIconProps) {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polygon points="5,4 15,12 5,20" fill="currentColor" stroke="none" />
      <line x1="19" y1="5" x2="19" y2="19" />
    </svg>
  )
}
