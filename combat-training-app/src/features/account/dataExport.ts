import type { AccountData } from '@/application/account/accountService'
import type { AuthSession } from '@/application/auth/authService'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { isRpeFromMemory } from '@/domain/workout-session/rpeRecall'
import { getDisciplineLabelPl } from '@/domain/discipline/disciplineLabels'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import { workoutSessionName } from '@/features/workouts/utils/workoutSessionPresentation'
import { categoryLabel } from '@/features/week-plan/weekPlanLabels'
import { workoutFeedbackLabels } from '@/features/workout-feedback/workoutFeedbackLabels'
import { sparringIntensityLabels } from '@/features/workout-feedback/sparringIntensityLabels'
import { accountLabels as labels } from './accountLabels'

export function exportFileName(kind: 'json' | 'csv', date: Date): string {
  const day = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
  return `combat-training-${kind === 'json' ? 'dane' : 'dziennik'}-${day}.${kind}`
}
export function buildAccountJson(data: AccountData, account: Pick<AuthSession, 'uid' | 'email'>, exportedAt: Date): string {
  const collections = Object.fromEntries(Object.entries(data.collections).map(([name, documents]) => [
    name, [...documents].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).map((document) => document.data),
  ]))
  return JSON.stringify({ format: 'combat-training-export', formatVersion: 1, exportedAt: exportedAt.toISOString(), account: { uid: account.uid, email: account.email }, profile: data.profile, collections }, null, 2)
}
export function csvCell(value: string | number | null): string {
  let text = value === null ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}
const minutes = (seconds: number | null) => seconds === null ? null : (seconds / 60).toFixed(1).replace('.', ',')
export function buildJournalCsv(sessions: readonly WorkoutSession[]): string {
  const ordered = [...sessions].sort((a, b) => a.workoutDate.localeCompare(b.workoutDate)
    || (a.source === 'manual' ? a.createdAt : a.startedAt).localeCompare(b.source === 'manual' ? b.createdAt : b.startedAt)
    || a.id.localeCompare(b.id))
  const rows = ordered.map((session) => [
    session.workoutDate, labels.sources[session.source], workoutFeedbackLabels.status[session.status],
    getDisciplineLabelPl(session.disciplineKey), categoryLabel(session.category), workoutSessionName(session),
    minutes(session.durationSeconds), minutes(session.workSeconds), minutes(session.sparringSeconds),
    session.completion ? `${session.completion.completed}/${session.completion.planned} ${labels.units[session.completion.unit]}` : null,
    session.rpe, session.rpeRecordedAt, isRpeFromMemory(session) ? labels.yes : null,
    session.sparring.some((entry) => entry.intensity !== null) ? session.sparring.map((entry) => entry.intensity === null ? '' : sparringIntensityLabels[entry.intensity]).join(' | ') : null,
    session.sparring.some((entry) => entry.rounds !== null) ? session.sparring.map((entry) => entry.rounds === null ? '' : String(entry.rounds)).join(' | ') : null,
    session.source === 'quickTimer' ? null : session.focusRatings.filter((rating) => rating.assessment !== null).map((rating) => `${rating.skillNameSnapshot}: ${rating.assessment === null ? '' : rating.assessment === 'unableToRate' ? workoutFeedbackLabels.unable : rating.assessment} (${getWorkoutBlockLabelPl(rating.blockType)})`).join(' | '),
    session.note,
  ].map(csvCell).join(';'))
  return '\uFEFF' + [labels.csvHeaders.map(csvCell).join(';'), ...rows].join('\r\n') + '\r\n'
}
