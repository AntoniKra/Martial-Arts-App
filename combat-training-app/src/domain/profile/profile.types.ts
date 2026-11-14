export interface HealthDataConsent {
  grantedAt: string
  noticeVersion: string
  adultConfirmed: true
}

export interface AthleteProfile {
  healthDataConsent: HealthDataConsent | null
  wellbeingConsent?: HealthDataConsent | null
  wellbeingWithdrawal?: { generation: number; pending: boolean } | null
  weightClassLabel: string | null
  createdAt: string
  updatedAt: string
}

export interface BodyWeight {
  date: string
  weightKg: number
  createdAt: string
  updatedAt: string
}
