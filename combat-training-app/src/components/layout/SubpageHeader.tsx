import { useLocation, useNavigate } from 'react-router-dom'
import { subpageBackTarget } from './subpageBackTarget'

export function SubpageHeader({ title }: { title: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  return <div className="-ml-3 flex min-h-touch items-center gap-1">
    <button type="button" aria-label="Wstecz" className="flex size-touch shrink-0 items-center justify-center text-ink"
      onClick={() => {
        const target = subpageBackTarget(location.key, window.history.state?.idx)
        if (target === -1) void navigate(-1)
        else void navigate(target)
      }}>
      <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
    </button>
    <h1 className="font-display text-2xl font-extrabold text-ink">{title}</h1>
  </div>
}
