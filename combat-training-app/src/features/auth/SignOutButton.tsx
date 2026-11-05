import { Button } from '@/components/ui/Button'
import { useAuth } from './authContext'
import { authLabels } from './authLabels'

/** Reports the sign-out result to the screen, which shows the error next to its own content. */
export function SignOutButton({ onError }: { onError: (message: string | null) => void }) {
  const auth = useAuth()
  return <Button variant="ghost" size="sm" disabled={auth.busy}
    onClick={async () => onError(await auth.execute(() => auth.service.signOut()))}>{authLabels.logout}</Button>
}
