import React from 'react'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatISTDateTime } from '@/lib/date'
import JoinSessionButton from './JoinSessionButton'

interface LearnLivePageProps {
  params: Promise<{ courseSlug: string }>
}

export default async function LearnLivePage({ params }: LearnLivePageProps) {
  const { courseSlug } = await params
  const supabase = await createClient()

  // 1. Get logged-in user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // 2. Fetch course details
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, slug')
    .eq('slug', courseSlug)
    .single()

  if (courseError || !course) {
    notFound()
  }

  // 3. Verify enrollment & fetch batch
  const { data: enrollment, error: enrollError } = await supabase
    .from('enrollments')
    .select('id, batch_id, batches (name, starts_at)')
    .eq('user_id', user.id)
    .eq('course_id', course.id)
    .is('revoked_at', null)
    .maybeSingle()

  if (enrollError || !enrollment || !enrollment.batch_id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md text-center bg-white border border-slate-200 p-8 rounded-2xl shadow-xs space-y-4">
          <div className="text-4xl">🔒</div>
          <h2 className="text-lg font-bold text-slate-800 font-display">Access Denied</h2>
          <p className="text-xs text-slate-500">
            You must be enrolled in this course to view the live class schedule.
          </p>
          <Link
            href="/courses"
            className="inline-block bg-primary hover:bg-primary-light text-white text-xs font-bold py-2 px-4 rounded-xl transition-colors shadow-2xs"
          >
            Browse Catalog
          </Link>
        </div>
      </div>
    )
  }

  const batch = Array.isArray(enrollment.batches) ? enrollment.batches[0] : enrollment.batches
  const batchName = batch?.name || 'Cohort Batch'

  // 4. Fetch live sessions (explicit columns, EXCLUDING meeting_url)
  const { data: sessions, error: sessionsError } = await supabase
    .from('live_sessions')
    .select('id, title, description, starts_at, duration_min, recording_url, status')
    .eq('batch_id', enrollment.batch_id)
    .order('starts_at', { ascending: true })

  // 5. Fetch user attendance records
  const { data: attendance } = await supabase
    .from('session_attendance')
    .select('session_id, attended')
    .eq('user_id', user.id)

  const attendanceMap: Record<string, boolean> = {}
  attendance?.forEach((att) => {
    attendanceMap[att.session_id] = att.attended
  })

  // 6. Calculate attendance summary stats
  const now = new Date()
  const liveSessionsList = sessions || []
  
  // Completed sessions are sessions that have started and finished
  const completedSessions = liveSessionsList.filter((s) => {
    const start = new Date(s.starts_at)
    const end = new Date(start.getTime() + s.duration_min * 60 * 1000)
    return now > end || s.status === 'completed'
  })

  const attendedCount = liveSessionsList.filter((s) => attendanceMap[s.id] === true).length
  const totalCompleted = completedSessions.length
  const attendancePct = totalCompleted > 0 ? Math.round((attendedCount / totalCompleted) * 100) : 100

  // 7. Find active live now session (to highlight on top)
  const activeLiveNowSession = liveSessionsList.find((s) => {
    const start = new Date(s.starts_at)
    const end = new Date(start.getTime() + s.duration_min * 60 * 1000)
    const joinStart = new Date(start.getTime() - 15 * 60 * 1000)
    return now >= joinStart && now <= end
  })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between font-body">
      {/* Header navbar */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center text-xs">
          <Link
            href="/dashboard"
            className="font-bold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1"
          >
            ← {course.title} · <span className="text-slate-400 font-semibold">{batchName}</span>
          </Link>

          <div className="font-bold text-slate-500">
            Attendance:{' '}
            <span className="text-primary font-extrabold text-sm font-mono">
              {attendedCount}/{totalCompleted} ({attendancePct}%)
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200/80 text-xs font-semibold text-slate-400 gap-6">
          <Link href={`/learn/${courseSlug}`} className="py-2.5 hover:text-slate-650 transition-colors">
            Roadmap / Curriculum
          </Link>
          <span className="py-2.5 text-primary border-b-2 border-primary select-none font-bold">
            Live Classes
          </span>
        </div>

        {/* Live Now highlighted card */}
        {activeLiveNowSession && (
          <div className="bg-red-50/50 border border-red-200/60 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <span className="bg-red-500 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md animate-pulse">
                Live Now
              </span>
              <h3 className="text-sm font-bold text-slate-900 font-display mt-2">
                {activeLiveNowSession.title}
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5 font-medium">
                Started {formatISTDateTime(activeLiveNowSession.starts_at)} · {activeLiveNowSession.duration_min} min
              </p>
            </div>
            <JoinSessionButton
              sessionId={activeLiveNowSession.id}
              startsAt={activeLiveNowSession.starts_at}
              durationMin={activeLiveNowSession.duration_min}
            />
          </div>
        )}

        {/* Session Schedule Table List */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-3xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-slate-600">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-5 font-semibold">Session</th>
                  <th className="py-3.5 px-5 font-semibold">Date &amp; Time</th>
                  <th className="py-3.5 px-5 font-semibold">Status</th>
                  <th className="py-3.5 px-5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {liveSessionsList.length > 0 ? (
                  liveSessionsList.map((session, index) => {
                    const start = new Date(session.starts_at)
                    const end = new Date(start.getTime() + session.duration_min * 60 * 1000)
                    const joinStart = new Date(start.getTime() - 15 * 60 * 1000)

                    const isJoined = attendanceMap[session.id] === true
                    const isSessionLive = now >= joinStart && now <= end
                    const isSessionCompleted = now > end || session.status === 'completed'

                    // Status Badge config
                    let statusText = 'Upcoming'
                    let badgeStyle = 'bg-amber-50 text-amber-700 border-amber-100'

                    if (isJoined) {
                      statusText = 'Attended'
                      badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    } else if (isSessionLive) {
                      statusText = 'Live Now'
                      badgeStyle = 'bg-red-500 text-white animate-pulse border-none'
                    } else if (isSessionCompleted) {
                      statusText = 'Missed'
                      badgeStyle = 'bg-slate-100 text-slate-400 border-slate-200 font-semibold'
                    }

                    return (
                      <tr key={session.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-4.5 px-5">
                          <span className="text-[10px] font-bold text-slate-400 font-mono block">
                            Session {index + 1}
                          </span>
                          <span className="font-semibold text-slate-900 block mt-0.5 leading-snug">
                            {session.title}
                          </span>
                          {session.description && (
                            <p className="text-slate-400 text-[11px] leading-normal line-clamp-1 mt-0.5 font-normal">
                              {session.description}
                            </p>
                          )}
                        </td>
                        <td className="py-4.5 px-5 font-medium text-slate-700">
                          {formatISTDateTime(session.starts_at)}
                        </td>
                        <td className="py-4.5 px-5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${badgeStyle}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="py-4.5 px-5 text-right">
                          {session.recording_url ? (
                            <Link
                              href={`/learn/${courseSlug}/watch/${session.id}`}
                              className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 px-3.5 rounded-lg text-[10px] transition-all inline-block shadow-2xs"
                            >
                              Watch recording
                            </Link>
                          ) : (
                            <JoinSessionButton
                              sessionId={session.id}
                              startsAt={session.starts_at}
                              durationMin={session.duration_min}
                            />
                          )}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      No live sessions scheduled yet for this batch.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-slate-50 py-8 px-6 text-center text-xs text-slate-400 mt-12">
        <div className="max-w-4xl mx-auto">
          <p>© {new Date().getFullYear()} Embark AI Institute (embarkai.in). All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
