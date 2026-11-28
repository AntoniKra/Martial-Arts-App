import { FeedbackIcon } from './FeedbackIcon'
import type { FocusSkillCorrection } from '@/domain/focus-skill/focusSkill.types'
import { formatCorrectionDate, workoutFeedbackLabels as labels } from './workoutFeedbackLabels'

export function CorrectionNote({ correction, name, preview = false, feedback = false }: {
  correction: FocusSkillCorrection; name?: string; preview?: boolean; feedback?: boolean
}) {
  const date = formatCorrectionDate(correction.workoutDate)
  if (feedback) return <aside aria-label={labels.previous(date)} className="space-y-2">
    <p className="feedback-eyebrow tabular-nums">{labels.previous(date)}</p>
    <dl className="space-y-2">
      {(['problem', 'fix'] as const).map((field) => <div key={field}
        className={`min-w-0 border-l-2 py-px pl-2.5 ${field === 'problem' ? 'border-crimson-ink' : 'border-ember-ink'}`}>
        <dt className="font-display text-[10px] font-extrabold tracking-[0.07em] text-muted uppercase">{labels[field]}</dt>
        <dd className="mt-px wrap-anywhere text-[12.5px] leading-[1.4] whitespace-pre-wrap text-ink">{correction[field]}</dd>
      </div>)}
    </dl>
  </aside>
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
