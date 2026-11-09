import { useEffect, useEffectEvent, useState } from 'react'
import { useSharedWorkoutGong } from '@/application/audio/workoutGongContext'
import { rpeRemainingSeconds, startRpeCountdown } from './rpeCountdown'

export function useRpeCountdown(completedAt: string, enabled: boolean, onDue: () => void) {
  const [remaining, setRemaining] = useState(() => rpeRemainingSeconds(completedAt, Date.now()))
  const gong = useSharedWorkoutGong()
  const due = useEffectEvent(() => { gong.play('restEnd'); onDue() })
  useEffect(() => {
    if (!enabled) return
    const countdown = startRpeCountdown(completedAt, setRemaining, due)
    const refresh = () => { if (document.visibilityState === 'visible') countdown.refresh() }
    document.addEventListener('visibilitychange', refresh)
    return () => { countdown.dispose(); document.removeEventListener('visibilitychange', refresh) }
  }, [completedAt, enabled])
  return remaining
}
