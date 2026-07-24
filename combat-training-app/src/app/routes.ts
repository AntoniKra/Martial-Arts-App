export const routes = {
  home: '/',
  workouts: '/workouts',
  newWorkout: '/workouts/new',
  workoutDetails: (workoutId: string) => `/workouts/${workoutId}`,
  workoutEdit: (workoutId: string) => `/workouts/${workoutId}/edit`,
  workoutPreview: (workoutId: string) => `/workouts/${workoutId}/preview`,
  workoutActive: (workoutId: string) => `/workouts/${workoutId}/active`,
  workoutFeedback: (workoutId: string) => `/workouts/${workoutId}/feedback`,
  workoutReport: (workoutId: string) => `/workouts/${workoutId}/report`,
} as const
