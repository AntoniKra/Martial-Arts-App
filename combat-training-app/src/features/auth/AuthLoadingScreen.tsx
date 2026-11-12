import { AuthFrame } from './AuthFrame'
import { authLabels } from './authLabels'

export function AuthLoadingScreen() {
  return <AuthFrame title={authLabels.loading}>
    <p role="status">{authLabels.loading}</p>
  </AuthFrame>
}
