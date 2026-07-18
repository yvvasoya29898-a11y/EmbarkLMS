import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBulkCourseProgress } from '@/lib/progress'
import NextClassCard from './NextClassCard'
import Header from '@/components/Header'
import InviteCodeForm from '@/components/InviteCodeForm'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/auth/login')
  }

  // 1. Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  // 2. Fetch active enrollments
  // We explicitly select nested relation details to fetch courses/batches
  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select(`
      id,
      course_id,
      batch_id,
      batches (
        id,
        name,
        starts_at
      ),
      courses (
        id,
        title,
        slug,
        delivery_type
      )
    `)
    .eq('user_id', user.id)
    .is('revoked_at', null)

  const courseIds = (enrollments || [])
    .map((e) => (Array.isArray(e.courses) ? e.courses[0] : e.courses)?.id)
    .filter(Boolean) as string[]

  const progressPercentMap = await getBulkCourseProgress(user.id, courseIds)

  const formattedEnrollments = (enrollments || []).map((e) => {
    const bat = Array.isArray(e.batches) ? e.batches[0] : e.batches
    const crs = Array.isArray(e.courses) ? e.courses[0] : e.courses
    const progressPercent = crs ? (progressPercentMap[crs.id] || 0) : 0
    return {
      ...e,
      batches: bat || null,
      courses: crs || null,
      progressPercent
    }
  })

  // 3. Query next upcoming session for enrolled batches
  const enrolledBatchIds = formattedEnrollments
    .map((e) => e.batch_id)
    .filter(Boolean) as string[]

  let nextSession = null

  if (enrolledBatchIds.length > 0) {
    // Query sessions starts_at in the future or started in last 4 hours (to cover session duration window)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    
    const { data: sessions, error: sessionsError } = await supabase
      .from('live_sessions')
      .select('id, title, description, starts_at, duration_min, batch_id')
      .in('batch_id', enrolledBatchIds)
      .gte('starts_at', fourHoursAgo)
      .order('starts_at', { ascending: true })
      .limit(1)

    if (sessions && sessions.length > 0) {
      const s = sessions[0]
      const enroll = formattedEnrollments.find((e) => e.batch_id === s.batch_id)
      
      nextSession = {
        id: s.id,
        title: s.title,
        description: s.description,
        starts_at: s.starts_at,
        duration_min: s.duration_min,
        batch_name: enroll?.batches?.name || 'Live Cohort',
        course_title: enroll?.courses?.title || 'Course'
      }
    }
  }

  // 4. Fetch pending requests
  const { data: requests } = await supabase
    .from('enrollment_requests')
    .select(`
      id,
      status,
      created_at,
      courses (
        title
      )
    `)
    .eq('user_id', user.id)
    .in('status', ['new', 'contacted', 'paid'])
    .order('created_at', { ascending: false })

  // 5. Fetch issued certificates
  const { data: certificates } = await supabase
    .from('certificates')
    .select(`
      id,
      verify_code,
      issued_at,
      courses (
        title,
        slug
      )
    `)
    .eq('user_id', user.id)
    .order('issued_at', { ascending: false })

  const formattedRequests = (requests || []).map((r) => {
    const crs = Array.isArray(r.courses) ? r.courses[0] : r.courses
    return {
      ...r,
      courses: crs || null
    }
  })

  // 5. Query stats
  const { count: attendanceCount } = await supabase
    .from('session_attendance')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('attended', true)

  const { count: certificateCount } = await supabase
    .from('certificates')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <Header user={user} isDashboard={true} profileName={profile?.full_name} />
      <main className="max-w-4xl mx-auto p-6 sm:p-8 space-y-8">

        {/* Pinned next live session card (S5) */}
        {nextSession && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Next Live Class
            </h3>
            <NextClassCard session={nextSession} />
          </div>
        )}

        {/* Cohort Invite Code redemption card */}
        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 shadow-3xs space-y-3">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Have a cohort invite code?
            </h3>
            <p className="text-slate-500 text-[11px] mt-0.5 font-medium">
              If your university or institution is sponsoring your cohort, enter your code below to claim direct batch access.
            </p>
          </div>
          <InviteCodeForm onSuccessRedirect={true} />
        </div>

        {/* Enrolled Courses */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Enrolled Courses
            </h3>
            {formattedEnrollments.length > 0 && (
              <Link
                href="/courses"
                className="text-xs font-bold text-primary hover:text-primary-light transition-colors"
              >
                Explore other courses →
              </Link>
            )}
          </div>

          {formattedEnrollments.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {formattedEnrollments.map((enroll) => {
                if (!enroll.courses) return null
                return (
                  <div key={enroll.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-3xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 font-display">
                          {enroll.courses.title}
                        </h4>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-100 font-mono">
                          {enroll.courses.delivery_type}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="flex items-center gap-2 mt-2 max-w-xs">
                        <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden shrink-0">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${enroll.progressPercent}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 font-mono">
                          {enroll.progressPercent}% Complete
                        </span>
                      </div>

                      <p className="text-slate-400 text-xs mt-1.5 font-medium">
                        {enroll.courses.delivery_type === 'recorded'
                          ? 'Self-paced revision content'
                          : `Enrolled in: ${enroll.batches?.name || 'General batch'}`}
                      </p>
                    </div>

                    <Link
                      href={`/learn/${enroll.courses.slug}`}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 px-4 rounded-xl transition-all duration-150 text-center shadow-2xs"
                    >
                      Continue study →
                    </Link>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="border border-dashed border-slate-200 rounded-2xl p-12 text-center bg-card">
              <div className="text-4xl mb-3">🎓</div>
              <h3 className="text-base font-bold text-slate-900 mb-1 font-display">No enrolled courses yet</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
                Embark offers high-impact hybrid and self-paced courses in AI, prompt engineering, and automation.
              </p>
              <Link
                href="/courses"
                className="inline-block bg-primary hover:bg-primary-light text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all shadow-xs"
              >
                Explore Catalog
              </Link>
            </div>
          )}
        </div>

        {/* Certificates Issued (S9) */}
        {certificates && certificates.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Your Certificates
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {certificates.map((cert) => {
                const course = Array.isArray(cert.courses) ? cert.courses[0] : cert.courses
                if (!course) return null
                return (
                  <div key={cert.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-3xs">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🎓</span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 font-display">
                          Completion Certificate: {course.title}
                        </h4>
                        <p className="text-[10px] text-slate-450 font-mono mt-0.5 font-medium">
                          Verification code: {cert.verify_code} · Issued: {new Date(cert.issued_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <a
                        href={`/api/certificates/${cert.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 border border-slate-200 rounded-xl text-xs transition-all text-center cursor-pointer select-none"
                      >
                        Preview PDF ↗
                      </a>
                      <Link
                        href={`/learn/${course.slug}/completion`}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all text-center shadow-2xs cursor-pointer select-none"
                      >
                        View Credentials →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Pending requests */}
        {formattedRequests.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Requested Enrollments
            </h3>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-3xs">
              {formattedRequests.map((req) => {
                const requestBadge = {
                  new: 'bg-blue-50 text-blue-700 border-blue-100',
                  contacted: 'bg-amber-50 text-amber-700 border-amber-100',
                  paid: 'bg-emerald-50 text-emerald-700 border-emerald-100'
                }[req.status as 'new' | 'contacted' | 'paid']

                const requestText = {
                  new: 'Awaiting call',
                  contacted: 'Contacted',
                  paid: 'Payment pending'
                }[req.status as 'new' | 'contacted' | 'paid']

                return (
                  <div key={req.id} className="p-4 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        {req.courses?.title || 'Course'}
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        Requested: {new Date(req.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>

                    <span className={`font-bold uppercase tracking-wider px-2 py-0.5 rounded border text-[10px] ${requestBadge}`}>
                      {requestText}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Learning Progress
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 shadow-3xs">
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block">Live classes attended</span>
              <span className="text-2xl font-extrabold text-slate-800 mt-1 block font-display">
                {attendanceCount || 0}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 shadow-3xs">
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block">Verified Certificates</span>
              <span className="text-2xl font-extrabold text-slate-800 mt-1 block font-display">
                {certificateCount || 0} 🏅
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 shadow-3xs">
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block">Account Role</span>
              <span className="text-2xl font-extrabold text-primary mt-1 block font-display capitalize">
                {profile?.role || 'student'}
              </span>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
