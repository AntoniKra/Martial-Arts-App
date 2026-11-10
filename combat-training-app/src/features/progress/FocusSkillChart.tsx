import { useEffect, useRef, useState } from 'react'
import type { WorkoutBlockType } from '@/domain/workout/workout.types'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import { selectFocusSkillChart, type FocusSkillAssessment } from '@/domain/focus-skill/focusSkillProgress'
import { formatProgressDate, progressLabels as labels } from './progressLabels'

const shapes: Record<WorkoutBlockType, { name: string; path?: string }> = {
  bag: { name: 'koło' }, pads: { name: 'kwadrat', path: 'M-5-5H5V5H-5Z' },
  sparring: { name: 'trójkąt', path: 'M0-6 6 5H-6Z' }, technique: { name: 'romb', path: 'M0-7 6 0 0 7-6 0Z' },
  warmup: { name: 'krzyż', path: 'M-2-6H2V-2H6V2H2V6H-2V2H-6V-2H-2Z' },
  conditioning: { name: 'sześciokąt', path: 'M-3-6H3L7 0 3 6H-3L-7 0Z' },
  strengthAndConditioning: { name: 'gwiazda', path: 'M0-7 2-2 7-2 3 1 5 6 0 3-5 6-3 1-7-2-2-2Z' },
  cooldown: { name: 'odwrócony trójkąt', path: 'M-6-5H6L0 6Z' },
}

function Point({ place, x = 10, y = 10, hollow = false }: { place: WorkoutBlockType; x?: number; y?: number; hollow?: boolean }) {
  return <g transform={`translate(${x} ${y})`} fill={hollow ? 'var(--app-surface)' : 'currentColor'} stroke="currentColor" strokeWidth="1.7">
    {shapes[place].path ? <path d={shapes[place].path} /> : <circle r="5" />}
  </g>
}

export function PlaceMarker({ place }: { place: WorkoutBlockType }) {
  return <span className="inline-flex items-center gap-2">
    <svg width="20" height="20" aria-hidden="true" className="shrink-0 text-ink"><Point place={place} /></svg>
    <span>{getWorkoutBlockLabelPl(place)} <span className="text-xs font-normal text-muted">({shapes[place].name})</span></span>
  </span>
}

export function FocusSkillChart({ assessments }: { assessments: readonly FocusSkillAssessment[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(320)
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))))
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  const chart = selectFocusSkillChart(assessments, Math.floor((width - 60) / 18))
  const coincidentGroups = chart.points.map((rating) => chart.points.filter((entry) =>
    entry.workoutDate === rating.workoutDate && entry.assessment === rating.assessment))
  const spacing = 14
  const plotWidth = Math.max(width, ...coincidentGroups.map((group) => (group.length - 1) * spacing + 54))
  const places = [...new Set(chart.points.map((rating) => rating.blockType))]
  const day = (date: string) => Date.parse(`${date}T00:00:00Z`)
  const first = chart.start ?? chart.points[0]?.workoutDate ?? ''
  const last = chart.end ?? first
  const start = day(first), end = day(last)
  const x = (date: string) => end === start ? plotWidth / 2 : 34 + (day(date) - start) / (end - start) * (plotWidth - 54)
  const y = (value: number) => 184 - (value - 1) * 34
  const marker = chart.criterionChangedAt
  return <section aria-label={labels.chart} ref={ref} className="space-y-3 border border-bd bg-surface p-3">
    <h2 className="font-display font-semibold">{labels.chart}</h2>
    {chart.limited && <p className="text-xs text-muted">{labels.lastWeeks}</p>}
    {chart.points.length === 0 ? <p className="text-sm text-muted">{labels.noRatings}</p> : <>
      <div className="overflow-x-auto">
      <svg width={plotWidth} height="230" viewBox={`0 0 ${plotWidth} 230`} className="block max-w-none text-ink" aria-hidden="true">
        <text x="4" y="12" fontSize="11" fill="var(--app-muted)">{labels.assessmentAxis}</text>
        {[1, 2, 3, 4, 5].map((value) => <g key={value}>
          <line x1="28" x2={plotWidth - 12} y1={y(value)} y2={y(value)} stroke="var(--app-border)" />
          <text x="8" y={y(value) + 4} fontSize="12" fill="currentColor">{value}</text>
        </g>)}
        {marker && day(marker) >= start && day(marker) <= end && <g>
          <line x1={x(marker)} x2={x(marker)} y1="36" y2="194" stroke="var(--app-muted)" strokeDasharray="4 4" />
          <text x={Math.max(30, Math.min(plotWidth - 116, x(marker)))} y="30" fontSize="11" fill="var(--app-muted)">{labels.change}</text>
        </g>}
        {chart.points.map((rating, index) => {
          // Clamp the whole group so edge points retain their minimum spacing.
          const coincident = coincidentGroups[index]
          const groupWidth = (coincident.length - 1) * spacing
          const groupStart = Math.max(34, Math.min(plotWidth - 20 - groupWidth, x(rating.workoutDate) - groupWidth / 2))
          return <Point key={`${rating.sessionId}-${rating.workoutItemId}-${index}`} place={rating.blockType}
            x={groupStart + coincident.indexOf(rating) * spacing} y={y(Number(rating.assessment))} hollow={!rating.currentCriterion} />
        })}
        <text x="28" y="210" fontSize="10" fill="var(--app-muted)">{formatProgressDate(first)}</text>
        {first !== last && <text x={plotWidth - 12} y="210" textAnchor="end" fontSize="10" fill="var(--app-muted)">{formatProgressDate(last)}</text>}
        <text x={plotWidth / 2} y="228" textAnchor="middle" fontSize="11" fill="var(--app-muted)">{labels.dateAxis}</text>
      </svg>
      </div>
      <ul aria-label={labels.placesLegend} className="flex flex-wrap gap-x-4 gap-y-2 text-sm">{places.map((place) => <li key={place}><PlaceMarker place={place} /></li>)}</ul>
      {assessments.some((rating) => !rating.currentCriterion && typeof rating.assessment === 'number') && <p className="text-xs text-muted">{labels.oldPoint}</p>}
    </>}
  </section>
}
