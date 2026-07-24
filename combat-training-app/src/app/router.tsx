import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '@/components/layout/AppLayout'
import { PlaceholderPage } from '@/pages/PlaceholderPage'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <PlaceholderPage title="Start" description="Ekran główny zostanie przeniesiony z referencji Figmy." /> },
      { path: '/workouts', element: <PlaceholderPage title="Treningi" description="Zakładki Plany i Historia." /> },
      { path: '/workouts/new', element: <PlaceholderPage title="Nowy trening" description="Kreator bloków, ćwiczeń i przerw." /> },
      { path: '/workouts/:workoutId', element: <PlaceholderPage title="Szczegóły planu" /> },
      { path: '/workouts/:workoutId/edit', element: <PlaceholderPage title="Edycja planu" /> },
      { path: '/workouts/:workoutId/preview', element: <PlaceholderPage title="Podgląd treningu" /> },
      { path: '/workouts/:workoutId/report', element: <PlaceholderPage title="Raport treningu" /> },
    ],
  },
  { path: '/workouts/:workoutId/active', element: <PlaceholderPage title="Aktywny trening" fullscreen /> },
  { path: '/workouts/:workoutId/feedback', element: <PlaceholderPage title="Podsumowanie treningu" fullscreen /> },
])
