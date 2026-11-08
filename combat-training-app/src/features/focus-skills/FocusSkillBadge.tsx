import { focusSkillLabels } from './focusSkillLabels'

export function FocusSkillBadge() {
  return <span className="shrink-0 border border-crimson px-1.5 py-0.5 font-display text-[10px] font-semibold tracking-[0.08em] text-crimson-ink">{focusSkillLabels.badge}</span>
}
