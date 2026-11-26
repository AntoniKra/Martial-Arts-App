import { routes } from '@/app/routes'

export const newWorkoutLabels = {
  title: 'Nowy trening', close: 'Zamknij',
  choices: [
    { to: routes.quickTimer, label: 'Szybki stoper', description: 'Rundy i przerwy bez planu', icon: 'timer' },
    { to: routes.newManualWorkout, label: 'Trening spoza aplikacji', description: 'Wpisz trening z klubu', icon: 'journal' },
    { to: routes.myExercises, label: 'Moje ćwiczenia', description: 'Biblioteka ćwiczeń', icon: 'plan' },
    { to: routes.newWorkout, label: 'Nowy plan', description: 'Zbuduj plan z bloków', icon: 'plan' },
    { to: routes.workouts, label: 'Moje plany', description: 'Lista planów treningowych', icon: 'plan' },
  ],
} as const
