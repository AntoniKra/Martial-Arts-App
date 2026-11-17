import { FeedbackIcon } from './FeedbackIcon'
import type { FocusSkillCorrection } from '@/domain/focus-skill/focusSkill.types'
import { formatCorrectionDate, workoutFeedbackLabels as labels } from './workoutFeedbackLabels'

export function CorrectionNote({ correction, name, preview = false }: {
  correction: FocusSkillCorrection; name?: string; preview?: boolean
}) {
  const date = formatCorrectionDate(correction.workoutDate)
  return <aside className="space-y-2.5 rounded-sm border border-bd bg-surface p-3 text-sm leading-relaxed">
    <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
      {preview ? labels.forToday(date) : labels.previous(date)}
    </p>
    {name && <p className="break-words font-display font-semibold text-ink">{name}</p>}
    {(['problem', 'fix'] as const).map((field) => <div key={field} className="flex items-start gap-2">
      <FeedbackIcon kind={field} className={field === 'problem' ? 'text-crimson-ink' : 'text-ember'} />
      <p className="min-w-0 whitespace-pre-wrap break-words text-ink"><span className={`block text-[11px] font-extrabold uppercase tracking-wider ${field === 'problem' ? 'text-crimson-ink' : 'text-ember-ink'}`}>{labels[field]}: </span>{correction[field]}</p>
    </div>)}
    {preview && <p className="text-muted">{labels.previewHint}</p>}
  </aside>
}
