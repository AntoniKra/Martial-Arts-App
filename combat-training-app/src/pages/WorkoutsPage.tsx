import { Navigate, useLocation } from 'react-router-dom'
import { legacyHistoryRedirect } from '@/app/legacyHistoryRedirect'
import { WorkoutListContent } from '@/features/workouts/WorkoutListContent'

export function WorkoutsPage() {
  const location = useLocation()
  const redirect = legacyHistoryRedirect(location.search, location.hash)
  return redirect ? <Navigate to={redirect} replace /> : <WorkoutListContent />
}
