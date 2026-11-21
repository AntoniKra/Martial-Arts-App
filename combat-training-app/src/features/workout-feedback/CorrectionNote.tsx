import { FeedbackIcon } from './FeedbackIcon'
import type { FocusSkillCorrection } from '@/domain/focus-skill/focusSkill.types'
import { formatCorrectionDate, workoutFeedbackLabels as labels } from './workoutFeedbackLabels'

export function CorrectionNote({ correction, name, preview = false, summary = false }: {
  correction: FocusSkillCorrection; name?: string; preview?: boolean; summary?: boolean
}) {
  const date = formatCorrectionDate(correction.workoutDate)
  if (summary) return <aside aria-label={labels.previous(date)} className="space-y-1.5">
    <p className="feedback-eyebrow tabular-nums">{labels.previous(date)}</p>
    <dl className="grid grid-cols-2 gap-1.5">
      {(['problem', 'fix'] as const).map((field) => <div key={field}
        className={`min-w-0 rounded-sm border border-bd border-l-[3px] bg-elevated px-2.5 py-2 ${field === 'problem' ? 'border-l-crimson-ink' : 'border-l-ember-ink'}`}>
        <dt className="font-display text-[9.5px] font-extrabold tracking-wider text-muted uppercase">{labels[field]}</dt>
        <dd className="mt-0.5 wrap-anywhere text-[11.5px] leading-[1.3] whitespace-pre-wrap text-ink">{correction[field]}</dd>
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
