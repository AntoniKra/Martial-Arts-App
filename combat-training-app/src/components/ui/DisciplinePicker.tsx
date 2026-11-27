import { useId } from 'react'

import { DisciplineBadge } from '@/components/domain/DisciplineBadge'
import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import { DISCIPLINE_LABELS_PL } from '@/domain/discipline/disciplineLabels'
import { ChoiceTile } from './ChoiceTile'

const disciplineKeys = Object.keys(DISCIPLINE_LABELS_PL) as DisciplineKey[]

interface DisciplinePickerProps {
  label: string
  value: DisciplineKey | null
  onChange: (value: DisciplineKey) => void
}

export function DisciplinePicker({ label, value, onChange }: DisciplinePickerProps) {
  const name = useId()

  return (
    <div role="radiogroup" aria-label={label} className="discipline-picker grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
      {disciplineKeys.map((key) => (
        <ChoiceTile key={key} name={name} value={key} checked={value === key} ariaLabel={DISCIPLINE_LABELS_PL[key]}
          onChange={() => onChange(key)} className="compact-choice">
          <DisciplineBadge disciplineKey={key} className="discipline-picker-label" />
        </ChoiceTile>
      ))}
    </div>
  )
}
