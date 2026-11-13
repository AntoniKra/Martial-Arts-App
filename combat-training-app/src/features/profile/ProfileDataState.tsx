import { getButtonClassName } from '@/components/ui/buttonStyles'
import { profileLabels as labels } from './profileLabels'

export function ProfileDataState({ state, retry, message }: { state: 'loading' | 'error' | 'incomplete'; retry: () => void; message?: string }) {
  return <div role={state === 'error' ? 'alert' : 'status'} className="space-y-3">
    <p className="text-sm text-muted">{message ?? labels[state]}</p>
    {state !== 'loading' && <button type="button" className={getButtonClassName({ variant: 'secondary' })} onClick={retry}>{labels.retry}</button>}
  </div>
}
