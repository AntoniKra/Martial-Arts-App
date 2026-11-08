export interface FocusSkillCorrection {
  problem: string
  fix: string
  sessionId: string
  workoutDate: string
}

export interface FocusSkill {
  id: string
  name: string
  criterion: string
  openCorrection: FocusSkillCorrection | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export const FOCUS_SKILL_NAME_MAX_LENGTH = 80
export const FOCUS_SKILL_CRITERION_MAX_LENGTH = 200
export const MAX_PLAN_FOCUS_EXERCISES = 3
