import { Navigate, useLocation } from 'react-router-dom'
import { legacyWorkoutsRedirect } from '@/app/legacyWorkoutsRedirect'

export function LegacyWorkoutsRedirect() {
  const { search, hash, state } = useLocation()
  return <Navigate to={legacyWorkoutsRedirect(search, hash)} replace state={state} />
}
