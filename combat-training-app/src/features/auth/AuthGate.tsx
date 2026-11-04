import { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isActiveWorkoutPath, resolveAuthRoute } from '@/application/auth/resolveAuthRoute'
import { AuthFrame } from './AuthFrame'
import { useAuth } from './authContext'
import { authLabels } from './authLabels'

export function AuthGate() {
  const { state } = useAuth()
  const location = useLocation()
  const [admission, setAdmission] = useState({ pathname: location.pathname, admitted: false })
  const canAdmit = isActiveWorkoutPath(location.pathname) && state.status === 'ready' && state.session?.emailVerified === true
  if (admission.pathname !== location.pathname || (canAdmit && !admission.admitted)) {
    setAdmission({ pathname: location.pathname, admitted: canAdmit })
  }
  const decision = resolveAuthRoute(state, location.pathname,
    location.pathname + location.search + location.hash, admission.pathname === location.pathname && admission.admitted,
    location.state?.returnTo)

  if (decision.type === 'allow') return <Outlet />
  if (decision.type === 'redirect') {
    return <Navigate to={decision.to} state={{ returnTo: decision.returnTo }} replace />
  }
  return (
    <AuthFrame title={decision.type === 'loading' ? authLabels.loading : authLabels.brand}>
      <p role={decision.type === 'loading' ? 'status' : 'alert'}>
        {decision.type === 'loading' ? authLabels.loading : authLabels.sessionError}
      </p>
    </AuthFrame>
  )
}
