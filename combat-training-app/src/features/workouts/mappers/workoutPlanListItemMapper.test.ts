import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { FeaturedPlanCard } from '@/features/home/components/FeaturedPlanCard'
import { mapWorkoutPlanToFeaturedPlan } from '@/features/home/mappers/workoutPlanToFeaturedPlan'
import { WorkoutPlanCard } from '@/features/workouts/components/WorkoutPlanCard'
import { mapWorkoutPlanToListItem } from '@/features/workouts/mappers/workoutPlanListItemMapper'
import { block, continuousExercise, workoutPlan } from '@/test/workoutBuilders'

describe('estimated duration on plan cards', () => {
  it.each([{ seconds: 150, label: '2:30' }, { seconds: 3600, label: '1 h' }])(
    'preserves the preview format for $seconds seconds', ({ seconds, label }) => {
      const plan = workoutPlan([block('block-1', [continuousExercise('exercise-1', seconds)])])
      const listItem = mapWorkoutPlanToListItem(plan)
      const featured = mapWorkoutPlanToFeaturedPlan(plan)
      expect(listItem.estimatedDurationLabelPl).toBe(label)
      expect(featured.estimatedDurationLabelPl).toBe(label)
      const listMarkup = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(WorkoutPlanCard, { plan: listItem })))
      const featuredMarkup = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(FeaturedPlanCard, { plan: featured })))
      expect(listMarkup).toContain(`ok. ${label}`)
      expect(featuredMarkup).toContain('>Czas</dt>')
      expect(featuredMarkup).toContain(`>${label}</dd>`)
    },
  )
})
