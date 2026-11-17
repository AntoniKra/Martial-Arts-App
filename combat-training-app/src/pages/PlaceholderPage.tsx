import { useParams } from 'react-router-dom'
import { routes } from '@/app/routes'
import { RouteScreenHeader } from '@/components/ScreenHeader'
interface PlaceholderPageProps {
  title: string
  description?: string
  fullscreen?: boolean
}

export function PlaceholderPage({ title, description, fullscreen = false }: PlaceholderPageProps) {
  const { workoutId } = useParams()
  return (
    <section className={`flex flex-1 flex-col px-5 py-8 ${fullscreen ? 'min-h-dvh bg-bg' : ''}`}>
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-crimson-ink">Fundament projektu</p>
      <RouteScreenHeader title={title} fallback={workoutId ? routes.workoutDetails(workoutId) : routes.workouts} />
      {description ? <p className="mt-3 max-w-xl text-sm leading-6 text-muted">{description}</p> : null}
      <div className="mt-8 border border-bd bg-surface p-5">
        <p className="text-sm text-muted">Ten ekran zostanie odwzorowany z zaakceptowanego prototypu Figma w osobnym, kontrolowanym zadaniu.</p>
      </div>
    </section>
  )
}
