import { useEffect, useState, type PropsWithChildren } from 'react'
import { WorkoutGongContext } from '@/application/audio/workoutGongContext'
import { createWebAudioWorkoutGong } from '@/infrastructure/audio/webAudioWorkoutGong'

/** Keep the user-unlocked audio context alive from playback through the summary. */
export function WorkoutGongProvider({ children }: PropsWithChildren) {
  const [gong] = useState(createWebAudioWorkoutGong)
  useEffect(() => () => gong.dispose(), [gong])
  return <WorkoutGongContext.Provider value={gong}>{children}</WorkoutGongContext.Provider>
}
