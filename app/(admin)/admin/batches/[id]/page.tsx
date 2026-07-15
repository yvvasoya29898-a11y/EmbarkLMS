import React from 'react'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BatchManagerClient from './BatchManagerClient'

interface AdminBatchDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminBatchDetailPage({ params }: AdminBatchDetailPageProps) {
  const { id } = await params
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

  // 2. Fetch Batch details
  const { data: batch, error: batchError } = await supabase
    .from('batches')
    .select(`
      id,
      name,
      invite_code,
      course_id,
      status,
      courses (
        title,
        delivery_type
      )
    `)
    .eq('id', id)
    .single()

  if (batchError || !batch) {
    notFound()
  }

  // 3. Fetch scheduled live sessions for this batch
  const { data: sessions, error: sessionsError } = await supabase
    .from('live_sessions')
    .select('id, title, description, starts_at, duration_min, meeting_url, recording_url, status')
    .eq('batch_id', id)
    .order('starts_at', { ascending: true })

  // 4. Fetch count of enrolled students in the batch
  const { data: enrollmentsList, count: enrolledCount } = await supabase
    .from('enrollments')
    .select('user_id', { count: 'exact' })
    .eq('batch_id', id)
    .is('revoked_at', null)

  const enrolledUserIds = (enrollmentsList || []).map((e) => e.user_id)
  let certificatesCount = 0

  if (enrolledUserIds.length > 0) {
    const { count } = await supabase
      .from('certificates')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', batch.course_id)
      .in('user_id', enrolledUserIds)
    
    certificatesCount = count || 0
  }

  // 5. Fetch attendance records to compute counts per session
  const { data: attendance } = await supabase
    .from('session_attendance')
    .select('session_id')
    .eq('attended', true)

  const attendanceCounts: Record<string, number> = {}
  attendance?.forEach((att) => {
    attendanceCounts[att.session_id] = (attendanceCounts[att.session_id] || 0) + 1
  })

  // Format initial batch & course shapes strictly
  const courseDetail = Array.isArray(batch.courses) ? batch.courses[0] : batch.courses
  const formattedBatch = {
    ...batch,
    courses: courseDetail ? { title: courseDetail.title, delivery_type: courseDetail.delivery_type } : null
  }

  const formattedSessions = (sessions || []).map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    starts_at: s.starts_at,
    duration_min: s.duration_min,
    meeting_url: s.meeting_url,
    recording_url: s.recording_url,
    status: s.status,
    attendance_count: attendanceCounts[s.id] || 0
  }))

  return (
    <div className="space-y-6 font-body">
      {/* Back navigation */}
      <div>
        <Link
          href="/admin/batches"
          className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          ← Back to batches
        </Link>
      </div>

      <BatchManagerClient
        batch={formattedBatch}
        sessions={formattedSessions}
        enrolledCount={enrolledCount || 0}
        certificatesCount={certificatesCount}
      />
    </div>
  )
}
