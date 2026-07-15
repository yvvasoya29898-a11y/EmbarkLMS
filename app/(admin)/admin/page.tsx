import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatISTDateTime, formatISTTime } from '@/lib/date'

export default async function AdminPage() {
  const supabase = await createClient()

  // 1. Authorize Admin
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  const now = new Date()

  // 2. Fetch new requests to call (Today List: item 1)
  const { data: newRequests } = await supabase
    .from('enrollment_requests')
    .select(`
      id,
      created_at,
      profiles (
        full_name,
        phone
      ),
      courses (
        title
      )
    `)
    .eq('status', 'new')
    .order('created_at', { ascending: false })

  const formattedNewRequests = (newRequests || []).map((r) => {
    const studentProfile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
    const course = Array.isArray(r.courses) ? r.courses[0] : r.courses
    
    // SLA Check: older than 24h
    const createdTime = new Date(r.created_at).getTime()
    const ageHours = (now.getTime() - createdTime) / (1000 * 60 * 60)
    const isSlaWarning = ageHours >= 24

    return {
      id: r.id,
      createdAt: r.created_at,
      fullName: studentProfile?.full_name || 'Anonymous student',
      phone: studentProfile?.phone || 'No phone',
      courseTitle: course?.title || 'Unknown course',
      isSlaWarning
    }
  })

  // 3. Fetch today's scheduled live sessions (Today List: item 2)
  // Define IST calendar day starts/ends represented in UTC
  const startOfTodayIST = new Date(Date.now() - 6.5 * 60 * 60 * 1000)
  startOfTodayIST.setUTCHours(0, 0, 0, 0)
  const startOfTodayUTC = new Date(startOfTodayIST.getTime() - 5.5 * 60 * 60 * 1000).toISOString()
  const endOfTodayUTC = new Date(startOfTodayIST.getTime() + (24 - 5.5) * 60 * 60 * 1000).toISOString()

  const { data: todaySessions } = await supabase
    .from('live_sessions')
    .select(`
      id,
      title,
      starts_at,
      duration_min,
      status,
      batches (
        name
      )
    `)
    .gte('starts_at', startOfTodayUTC)
    .lte('starts_at', endOfTodayUTC)
    .order('starts_at', { ascending: true })

  const formattedTodaySessions = (todaySessions || []).map((s) => {
    const batch = Array.isArray(s.batches) ? s.batches[0] : s.batches
    return {
      id: s.id,
      title: s.title,
      startsAt: s.starts_at,
      durationMin: s.duration_min,
      status: s.status,
      batchName: batch?.name || 'Cohort Batch'
    }
  })

  // 4. Fetch past live sessions missing recordings (Today List: item 3)
  const { data: missingRecordings } = await supabase
    .from('live_sessions')
    .select(`
      id,
      title,
      starts_at,
      batch_id,
      batches (
        id,
        name
      )
    `)
    .lte('starts_at', now.toISOString())
    .is('recording_url', null)
    .order('starts_at', { ascending: false })

  const formattedMissingRecordings = (missingRecordings || []).map((s) => {
    const batch = Array.isArray(s.batches) ? s.batches[0] : s.batches
    return {
      id: s.id,
      title: s.title,
      startsAt: s.starts_at,
      batchId: batch?.id || '',
      batchName: batch?.name || 'Cohort Batch'
    }
  })

  // 5. Gather dashboard statistics metadata count queries
  const { count: newRequestsCount } = await supabase
    .from('enrollment_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'new')

  const { count: activeStudentsCount } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .is('revoked_at', null)

  const { count: weeklySessionsCount } = await supabase
    .from('live_sessions')
    .select('*', { count: 'exact', head: true })
    .gte('starts_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .lte('starts_at', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())

  return (
    <div className="space-y-8 font-body p-6 max-w-5xl mx-auto">
      
      {/* Title Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 font-display">
          Admin Overview
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Monitor conversions, manage cohort class attendance, and review feedback.
        </p>
      </div>

      {/* Analytics Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 relative overflow-hidden shadow-3xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
            New Leads Inbox
          </span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block font-display">
            {newRequestsCount || 0} requests
          </span>
          <span className="text-[9px] text-amber-600 mt-1 block font-medium">
            Requires initial call contacted follow-ups
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 relative overflow-hidden shadow-3xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
            Active Enrollments
          </span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block font-display">
            {activeStudentsCount || 0} students
          </span>
          <span className="text-[9px] text-emerald-600 mt-1 block font-medium">
            Enrolled across running cohorts
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 relative overflow-hidden shadow-3xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
            Classes Scheduled
          </span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block font-display">
            {weeklySessionsCount || 0} sessions
          </span>
          <span className="text-[9px] text-slate-500 mt-1 block font-medium">
            Scheduled in active 14-day window
          </span>
        </div>
      </div>

      {/* Operations Today Action Checklist Section (A1) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columns 1 & 2: Leads & Schedule */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: New enrollment requests to call */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-3xs">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-900 font-display">
                📞 Leads to Call ({formattedNewRequests.length})
              </h2>
              <Link
                href="/admin/requests"
                className="text-[10px] font-bold text-primary hover:underline"
              >
                Go to Lead Inbox →
              </Link>
            </div>

            {formattedNewRequests.length > 0 ? (
              <div className="divide-y divide-slate-100 text-xs">
                {formattedNewRequests.slice(0, 5).map((req) => (
                  <div key={req.id} className="py-3 first:pt-0 last:pb-0 flex justify-between items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{req.fullName}</span>
                        {req.isSlaWarning && (
                          <span className="bg-rose-50 text-rose-600 border border-rose-100 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded font-mono animate-pulse">
                            ⚠️ SLA SLA 24H
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Course: {req.courseTitle} · Phone: <span className="font-mono">{req.phone}</span>
                      </p>
                    </div>

                    <Link
                      href="/admin/requests"
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1 px-3 rounded-lg text-[10px] transition-colors"
                    >
                      Call Student
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs italic">
                No new pending enrollment requests. Good job!
              </div>
            )}
          </div>

          {/* Section 2: Today's live sessions */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-3xs">
            <h2 className="text-sm font-bold text-slate-900 font-display">
              📅 Today&apos;s Live Schedule
            </h2>

            {formattedTodaySessions.length > 0 ? (
              <div className="divide-y divide-slate-100 text-xs">
                {formattedTodaySessions.map((session) => (
                  <div key={session.id} className="py-3 first:pt-0 last:pb-0 flex justify-between items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{session.title}</span>
                        <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono ${
                          session.status === 'live'
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'bg-amber-50 text-amber-600 border border-amber-200'
                        }`}>
                          {session.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-450">
                        Cohort: {session.batchName} · Starts: {formatISTTime(session.startsAt)} ({session.durationMin} min)
                      </p>
                    </div>

                    <Link
                      href={`/admin/attendance/${session.id}`}
                      className="bg-slate-950 hover:bg-slate-800 text-white font-bold py-1 px-3 rounded-lg text-[10px] transition-colors"
                    >
                      Mark Attendance
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs italic">
                No cohort live sessions scheduled for today.
              </div>
            )}
          </div>

        </div>

        {/* Column 3: Missing Recording warnings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-3xs h-fit">
          <div>
            <h2 className="text-sm font-bold text-slate-900 font-display">
              ⚠️ Missing Recordings ({formattedMissingRecordings.length})
            </h2>
            <p className="text-[10px] text-slate-450 font-normal">
              Past completed sessions that require unlisted YouTube link additions.
            </p>
          </div>

          {formattedMissingRecordings.length > 0 ? (
            <div className="divide-y divide-slate-100 text-xs">
              {formattedMissingRecordings.slice(0, 6).map((session) => (
                <div key={session.id} className="py-3 first:pt-0 last:pb-0 flex flex-col space-y-1.5">
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs">
                      {session.title}
                    </h3>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                      Cohort: {session.batchName} · Date: {formatISTDateTime(session.startsAt)}
                    </p>
                  </div>

                  <Link
                    href={`/admin/batches/${session.batchId}`}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-1 px-2.5 rounded-lg text-[10px] transition-colors text-center w-full block"
                  >
                    Upload YouTube Recording Link
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs italic">
              All past sessions have video recording links uploaded.
            </div>
          )}
        </div>

      </div>

    </div>
  )
}
