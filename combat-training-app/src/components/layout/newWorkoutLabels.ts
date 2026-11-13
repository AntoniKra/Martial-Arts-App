import { routes } from '@/app/routes'

export const newWorkoutLabels = {
  title: 'Nowy trening', close: 'Zamknij',
  choices: [
    { to: routes.quickTimer, label: 'Szybki stoper', description: 'Rundy i przerwy bez planu', icon: 'timer' },
    { to: routes.newWorkout, label: 'Nowy plan', description: 'Zbuduj trening z bloków', icon: 'plan' },
    { to: routes.newManualWorkout, label: 'Trening spoza aplikacji', description: 'Wpisz trening z klubu', icon: 'journal' },
  ],
} as const
