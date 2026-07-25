import { workoutsMockData } from '@/features/workouts/data/workoutsMockData'
import { WorkoutsView } from '@/features/workouts/components/WorkoutsView'

export function WorkoutsPage() {
  return <WorkoutsView data={workoutsMockData} />
}
