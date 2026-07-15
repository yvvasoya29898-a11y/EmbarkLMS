import React from 'react'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AttendanceClient from './AttendanceClient'

interface AdminAttendancePageProps {
  params: Promise<{ sessionId: string }>
}

export default async function AdminAttendancePage({ params }: AdminAttendancePageProps) {
  const { sessionId } = await params
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

  // 2. Fetch session details joined with batch
  const { data: session, error: sessionError } = await supabase
    .from('live_sessions')
    .select(`
      id,
      title,
      batch_id,
      status,
      batches (
        id,
        name
      )
    `)
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    notFound()
  }

  const batch = Array.isArray(session.batches) ? session.batches[0] : session.batches
  const batchName = batch?.name || 'Cohort Batch'
  const batchId = batch?.id || ''

  // 3. Fetch all enrolled students in the batch
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      user_id,
      profiles (
        full_name
      )
    `)
    .eq('batch_id', batchId)
    .is('revoked_at', null)

  // 4. Fetch all attendance logs for the session
  const { data: attendance } = await supabase
    .from('session_attendance')
    .select('user_id, attended, marked_by, joined_click_at')
    .eq('session_id', sessionId)

  const attendanceMap = new Map<string, { user_id: string; attended: boolean; marked_by: string; joined_click_at: string | null }>()
  attendance?.forEach((a) => {
    attendanceMap.set(a.user_id, a as { user_id: string; attended: boolean; marked_by: string; joined_click_at: string | null })
  })

  // 5. Format student attendance items list
  const formattedStudents = (enrollments || []).map((e) => {
    const studentProfile = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles
    const name = studentProfile?.full_name || 'Anonymous student'
    const attRecord = attendanceMap.get(e.user_id)

    return {
      userId: e.user_id,
      fullName: name,
      joinedClickAt: attRecord?.joined_click_at || null,
      markedBy: (attRecord?.marked_by as 'auto' | 'admin' | null) || null,
      attended: attRecord?.attended || false
    }
  })

  const isFinalized = session.status === 'completed'

  return (
    <AttendanceClient
      sessionId={sessionId}
      sessionTitle={session.title}
      batchName={batchName}
      batchId={batchId}
      initialStudents={formattedStudents}
      isFinalized={isFinalized}
    />
  )
}
