"use client"

import React, { useState, useEffect, useTransition } from 'react'
import { getLiveSessionMeetingUrl } from '@/lib/actions/sessions'
import { formatISTTime } from '@/lib/date'

interface JoinSessionButtonProps {
  sessionId: string
  startsAt: string
  durationMin: number
}

export default function JoinSessionButton({
  sessionId,
  startsAt,
  durationMin
}: JoinSessionButtonProps) {
  const [now, setNow] = useState(new Date())
  const [joinError, setJoinError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 5000) // check every 5s is fine
    return () => clearInterval(timer)
  }, [])

  const start = new Date(startsAt)
  const end = new Date(start.getTime() + durationMin * 60 * 1000)
  const joinStart = new Date(start.getTime() - 15 * 60 * 1000)

  const isJoinActive = now >= joinStart && now <= end
  const isUpcoming = now < joinStart

  const handleJoin = () => {
    setJoinError(null)
    startTransition(async () => {
      const result = await getLiveSessionMeetingUrl(sessionId)
      if (result.error) {
        setJoinError(result.error)
      } else if (result.url) {
        window.open(result.url, '_blank')
      }
    })
  }

  return (
    <div className="space-y-1.5">
      {isJoinActive ? (
        <button
          onClick={handleJoin}
          disabled={isPending}
          className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-1.5 px-4 rounded-lg text-[11px] transition-all cursor-pointer shadow-2xs"
        >
          {isPending ? 'Connecting...' : 'Join class ↗'}
        </button>
      ) : isUpcoming ? (
        <div className="flex flex-col items-stretch sm:items-end gap-1">
          <button
            disabled
            className="bg-slate-100 text-slate-400 border border-slate-200 font-semibold py-1.5 px-3 rounded-lg text-[10px] cursor-not-allowed select-none text-center"
          >
            Join at {formatISTTime(joinStart)}
          </button>
          <a
            href={`/api/sessions/${sessionId}/ics`}
            className="text-[10px] text-primary hover:underline font-bold flex items-center justify-center sm:justify-end gap-0.5 mt-0.5"
          >
            📅 Add to calendar
          </a>
        </div>
      ) : (
        <span className="text-[11px] text-slate-400 font-medium">Recording coming soon</span>
      )}

      {joinError && (
        <p className="text-[10px] text-red-600 bg-red-50 p-1.5 rounded-md border border-red-100 block max-w-xs">
          {joinError}
        </p>
      )}
    </div>
  )
}
