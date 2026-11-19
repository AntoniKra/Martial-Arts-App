import { WELLBEING_FIELDS, type WellbeingEntry, type WellbeingField } from '@/domain/wellbeing/wellbeing'

type WizardState = {
  step: number
  answers: Record<WellbeingField, number | null>
  note: string
}

type WizardAction =
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'answer'; field: WellbeingField; value: number }
  | { type: 'note'; value: string }

export function startWellbeingWizard(entry?: WellbeingEntry): WizardState {
  return {
    step: 0,
    answers: {
      sleep: entry?.sleep ?? null,
      energy: entry?.energy ?? null,
      soreness: entry?.soreness ?? null,
      stress: entry?.stress ?? null,
    },
    note: entry?.note ?? '',
  }
}

export function countWellbeingAnswers(answers: WizardState['answers']) {
  return WELLBEING_FIELDS.filter((field) => answers[field] !== null).length
}

export function wellbeingWizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'next': {
      const field = WELLBEING_FIELDS.at(state.step)
      return field && state.answers[field] !== null ? { ...state, step: state.step + 1 } : state
    }
    case 'back':
      return state.step > 0 ? { ...state, step: state.step - 1 } : state
    case 'answer':
      return { ...state, answers: { ...state.answers, [action.field]: action.value } }
    case 'note':
      return { ...state, note: action.value }
  }
}
