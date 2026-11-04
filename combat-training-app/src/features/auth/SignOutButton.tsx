import { Button } from '@/components/ui/Button'
import { useAuth } from './authContext'
import { authLabels } from './authLabels'

export function SignOutButton() {
  const auth = useAuth()
  return <Button variant="ghost" size="sm" disabled={auth.busy}
    onClick={() => void auth.execute(() => auth.service.signOut())}>{authLabels.logout}</Button>
}
