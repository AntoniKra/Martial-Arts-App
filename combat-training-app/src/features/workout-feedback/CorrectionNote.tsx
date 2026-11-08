import type { FocusSkillCorrection } from '@/domain/focus-skill/focusSkill.types'
import { formatCorrectionDate, workoutFeedbackLabels as labels } from './workoutFeedbackLabels'

export function CorrectionNote({ correction, name, preview = false }: {
  correction: FocusSkillCorrection; name?: string; preview?: boolean
}) {
  const date = formatCorrectionDate(correction.workoutDate)
  return <aside className="space-y-2 border-l-2 border-crimson bg-elevated px-3 py-3 text-[13px] leading-relaxed">
    <p className="font-display text-[10px] font-semibold uppercase tracking-[0.08em] text-crimson-ink">
      {preview ? labels.forToday(date) : labels.previous(date)}
    </p>
    {name && <p className="break-words font-display font-semibold text-ink">{name}</p>}
    <p className="whitespace-pre-wrap break-words text-ink"><span className="font-semibold">{labels.problem}: </span>{correction.problem}</p>
    <p className="whitespace-pre-wrap break-words text-ink"><span className="font-semibold">{labels.fix}: </span>{correction.fix}</p>
    {preview && <p className="text-muted">{labels.previewHint}</p>}
  </aside>
}
