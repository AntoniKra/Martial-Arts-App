import type { FocusSkill, FocusSkillCorrection } from '@/domain/focus-skill/focusSkill.types'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'

export function weekSummaryTile(workoutCount: number, target: number | null, schedule: { goalCount: number; targetCount: number } | null) {
  if (schedule && schedule.targetCount > 0) return { count: schedule.goalCount, target: schedule.targetCount }
  return { count: workoutCount, target }
}

export function latestOpenCorrection(skills: readonly FocusSkill[], sessions: readonly WorkoutSession[]) {
  let latest: { skillId: string; correction: FocusSkillCorrection; session?: WorkoutSession } | null = null
  for (const { id, archivedAt, openCorrection } of skills) {
    if (archivedAt !== null || !openCorrection) continue
    const session = sessions.find(({ id }) => id === openCorrection.sessionId)
    const order = latest ? openCorrection.workoutDate.localeCompare(latest.correction.workoutDate)
      || (session?.createdAt ?? '').localeCompare(latest.session?.createdAt ?? '')
      || openCorrection.sessionId.localeCompare(latest.correction.sessionId) : 1
    if (order > 0) latest = { skillId: id, correction: openCorrection, session }
  }
  return latest
}

/** Round count for display; "?" when every sparring workout in the range has an unknown round count. */
export function formatSparringRounds(rounds: number, unknown: number): string {
  if (unknown > 0 && rounds === 0) return '?'
  return `${unknown > 0 ? '≥ ' : ''}${rounds}`
}
