"use client"

import React, { useState, useEffect, useTransition } from 'react'
import { getLiveSessionMeetingUrl } from '@/lib/actions/sessions'
import { formatISTTime, formatISTDate } from '@/lib/date'

interface LiveSessionProps {
  id: string
  title: string
  description: string | null
  starts_at: string
  duration_min: number
  batch_name: string
  course_title: string
}



export default function NextClassCard({ session }: { session: LiveSessionProps }) {
  const [now, setNow] = useState(new Date())
  const [joinError, setJoinError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Keep local time updated
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const startsAt = new Date(session.starts_at)
  const endsAt = new Date(startsAt.getTime() + session.duration_min * 60 * 1000)
  const joinWindowStart = new Date(startsAt.getTime() - 15 * 60 * 1000)

  const isCompleted = now > endsAt
  const isJoinActive = now >= joinWindowStart && now <= endsAt
  const isLiveNow = now >= startsAt && now <= endsAt

  // Don't render card if session is already completed
  if (isCompleted) {
    return null
  }

  // Handle Join click
  const handleJoinClick = () => {
    setJoinError(null)
    startTransition(async () => {
      const result = await getLiveSessionMeetingUrl(session.id)
      if (result.error) {
        setJoinError(result.error)
      } else if (result.url) {
        window.open(result.url, '_blank')
      }
    })
  }



  // Get status badge message
  let statusBadge = ''
  let statusStyle = ''

  if (isLiveNow) {
    statusBadge = 'Live Now'
    statusStyle = 'bg-red-500 text-white animate-pulse'
  } else if (isJoinActive) {
    statusBadge = 'Class starting'
    statusStyle = 'bg-amber-500 text-white'
  } else {
    // Show countdown in minutes/hours
    const diffMs = startsAt.getTime() - now.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    if (diffMins < 60) {
      statusBadge = `Live in ${diffMins} min`
      statusStyle = 'bg-rose-100 text-rose-700 border border-rose-200'
    } else {
      const diffHrs = Math.floor(diffMins / 60)
      if (diffHrs < 24) {
        statusBadge = `Live in ${diffHrs}h`
        statusStyle = 'bg-rose-50 text-rose-600 border border-rose-100'
      } else {
        statusBadge = `Upcoming class`
        statusStyle = 'bg-slate-100 text-slate-600 border border-slate-200'
      }
    }
  }

  return (
    <div className="bg-rose-50/50 border border-rose-200/60 rounded-2xl p-6 relative overflow-hidden shadow-2xs">
      {/* Decorative pulse glow */}
      {isJoinActive && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none animate-pulse" />
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${statusStyle}`}>
              {statusBadge}
            </span>
            <span className="text-[10px] font-semibold text-rose-700/80 uppercase tracking-wider">
              {session.batch_name}
            </span>
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900 leading-snug font-display">
              {session.title}
            </h2>
            <p className="text-slate-500 text-xs mt-0.5 font-medium">
              {session.course_title}
            </p>
          </div>

          <p className="text-slate-600 text-xs flex items-center gap-1.5 font-medium">
            <span>🗓</span>
            <span>
              {formatISTDate(startsAt, { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            <span className="text-slate-300">•</span>
            <span>
              {formatISTTime(startsAt)} – {formatISTTime(endsAt)} IST
            </span>
          </p>
        </div>

        <div className="flex flex-col items-stretch md:items-end gap-2.5 w-full md:w-auto shrink-0">
          <button
            onClick={handleJoinClick}
            disabled={!isJoinActive || isPending}
            className={`font-bold py-2.5 px-6 rounded-xl text-xs transition-all duration-150 shadow-xs text-center cursor-pointer select-none ${
              isJoinActive
                ? 'bg-rose-600 hover:bg-rose-700 text-white hover:shadow-md'
                : 'bg-slate-200 text-slate-400 border border-slate-300/40 cursor-not-allowed shadow-none'
            }`}
          >
            {isPending ? 'Connecting...' : isJoinActive ? 'Join class ↗' : `Join window at ${formatISTTime(joinWindowStart)}`}
          </button>

          <a
            href={`/api/sessions/${session.id}/ics`}
            className="text-[11px] font-bold text-rose-700 hover:text-rose-800 hover:underline text-center md:text-right flex items-center justify-center md:justify-end gap-1"
          >
            <span>📅</span> Add to calendar
          </a>
        </div>
      </div>

      {joinError && (
        <div className="mt-4 p-2.5 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-xl">
          ⚠️ {joinError}
        </div>
      )}
    </div>
  )
}
