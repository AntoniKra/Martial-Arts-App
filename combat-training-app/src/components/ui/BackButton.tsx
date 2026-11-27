import { screenHeaderLabels } from '../screenHeaderLabels'

export function BackIcon({ size = 24 }: { size?: number }) {
  return <svg aria-hidden="true" className="shrink-0" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6" />
  </svg>
}

export function BackButton({ onClick, disabled, showLabel = false, className = '' }: {
  onClick?: () => void; disabled?: boolean; showLabel?: boolean; className?: string
}) {
  return <button type="button" aria-label={screenHeaderLabels.back} onClick={onClick} disabled={disabled}
    className={`flex shrink-0 items-center justify-center text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)] disabled:opacity-40 ${showLabel ? 'min-h-touch min-w-touch' : 'size-11'} ${className}`}>
    <BackIcon size={showLabel ? 14 : 24} />{showLabel && screenHeaderLabels.back}
  </button>
}
