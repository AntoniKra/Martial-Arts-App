import { getButtonClassName } from '@/components/ui/buttonStyles'
import { wellbeingLabels as labels } from './wellbeingLabels'

export function WellbeingDataState({ loading, retry }: { loading: boolean; retry: () => void }) {
  return <div className="space-y-3"><p role={loading ? 'status' : 'alert'} className="text-sm text-muted">{loading ? labels.loading : labels.unavailable}</p>
    {!loading && <button type="button" className={getButtonClassName({ variant: 'secondary' })} onClick={retry}>{labels.retry}</button>}</div>
}
