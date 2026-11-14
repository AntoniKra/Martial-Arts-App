import type { AthleteProfile } from '@/domain/profile/profile.types'

export const WELLBEING_NOTICE_VERSION = '2026-11'
export const hasWellbeingConsent = (profile: AthleteProfile | undefined | null) =>
  profile?.wellbeingConsent?.adultConfirmed === true && profile.wellbeingConsent.noticeVersion === WELLBEING_NOTICE_VERSION
