'use client'

import { useEffect, useState } from 'react'

interface CountdownTimerProps {
  targetDate: string // Format: YYYY-MM-DD
}

export default function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    isOver: boolean
  } | null>(null)

  useEffect(() => {
    // Parse target date as 00:00:00 IST on that day
    const targetTime = new Date(`${targetDate}T00:00:00+05:30`).getTime()

    const calculateTimeLeft = () => {
      const now = Date.now()
      const difference = targetTime - now

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true }
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isOver: false
      }
    }

    // Set initial values
    setTimeLeft(calculateTimeLeft())

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  if (!timeLeft) {
    // Server-side rendering fallback to prevent hydration mismatch
    return (
      <div className="mt-2 bg-slate-50/50 border border-slate-100 rounded-xl px-3 py-1.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <span>⏳ Calculating time remaining...</span>
      </div>
    )
  }

  if (timeLeft.isOver) {
    return (
      <div className="mt-2 bg-emerald-50/60 border border-emerald-100/50 rounded-xl px-3 py-1.5 flex items-center gap-1.5 text-[10px] text-emerald-700 font-bold font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>Batch starting today / in progress</span>
      </div>
    )
  }

  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 24

  return (
    <div
      className={`mt-2 rounded-xl px-3 py-1.5 flex items-center justify-between text-[10px] font-mono border transition-all duration-300 ${
        isUrgent
          ? 'bg-rose-50/80 border-rose-200 text-rose-700 shadow-xs shadow-rose-100/50 animate-pulse'
          : 'bg-amber-50/60 border-amber-100 text-amber-800'
      }`}
    >
      <span className="flex items-center gap-1 font-bold uppercase tracking-wider text-[9px] opacity-80">
        {isUrgent ? '🚨 Closing In:' : '⏳ Starts In:'}
      </span>
      <div className="flex gap-1 text-[11px] font-black">
        {timeLeft.days > 0 && (
          <span>
            {timeLeft.days}
            <span className="text-[9px] font-normal opacity-70 ml-0.5">d</span>
          </span>
        )}
        <span>
          {timeLeft.hours.toString().padStart(2, '0')}
          <span className="text-[9px] font-normal opacity-70 ml-0.5">h</span>
        </span>
        <span>
          {timeLeft.minutes.toString().padStart(2, '0')}
          <span className="text-[9px] font-normal opacity-70 ml-0.5">m</span>
        </span>
        <span>
          {timeLeft.seconds.toString().padStart(2, '0')}
          <span className="text-[9px] font-normal opacity-70 ml-0.5">s</span>
        </span>
      </div>
    </div>
  )
}
