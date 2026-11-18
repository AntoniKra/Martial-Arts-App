import type { WeekDayState } from './weekDayPresentation'
import { useMotionChange } from '@/components/useMotionChange'

const descriptions: Record<WeekDayState, string> = {
  done: 'wykonany', planned: 'zaplanowany', free: 'wolne', missed: 'nie byłem', unavailable: 'plan niedostępny',
}

export function WeekDayIndicator({ name, short, state, today = false }: { name: string; short: string; state: WeekDayState; today?: boolean }) {
  const changed = useMotionChange(state)
  return <div className={`flex flex-col items-center gap-[7px] text-[11px] font-bold uppercase tracking-[0.04em] ${today ? 'text-ink' : 'text-muted'}`}>
    <span>{short}</span>
    <span key={state} role="img" aria-label={`${name.toLocaleLowerCase('pl-PL')}: ${descriptions[state]}${today ? ', dziś' : ''}`} className={`week-day-dot is-${state} ${changed ? 'motion-status-change' : ''}`}>
      {state === 'done' && <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 12 5 5L20 7" /></svg>}
      {state === 'missed' && <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M7 12h10" /></svg>}
    </span>
    <span aria-hidden="true" className={`h-0.5 w-4 ${today ? 'bg-crimson-ink' : ''}`} />
  </div>
}
