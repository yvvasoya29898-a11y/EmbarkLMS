"use server"

import { createClient } from '@/lib/supabase/server'
import { checkAndIssueCertificate } from './certificates'
import { revalidatePath } from 'next/cache'

export async function toggleStudentAttendance(sessionId: string, userId: string, attended: boolean) {
  const supabase = await createClient()

  // 1. Authorize Admin
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  // 2. Fetch existing session attendance record (if any)
  const { data: existing } = await supabase
    .from('session_attendance')
    .select('id, joined_click_at')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .maybeSingle()

  const joinedClickAt = existing?.joined_click_at || (attended ? new Date().toISOString() : null)

  // 3. Upsert
  const { error } = await supabase
    .from('session_attendance')
    .upsert({
      session_id: sessionId,
      user_id: userId,
      attended,
      marked_by: 'admin',
      joined_click_at: joinedClickAt
    }, {
      onConflict: 'session_id,user_id'
    })

  if (error) return { error: error.message }
  return { success: true }
}

export async function markAllStudentsPresent(sessionId: string) {
  const supabase = await createClient()

  // 1. Authorize Admin
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  // 2. Fetch session details to find batch ID
  const { data: session } = await supabase
    .from('live_sessions')
    .select('batch_id')
    .eq('id', sessionId)
    .single()

  if (!session) return { error: 'Session not found' }

  // 3. Fetch all students in batch
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('user_id')
    .eq('batch_id', session.batch_id)
    .is('revoked_at', null)

  if (!enrollments || enrollments.length === 0) return { success: true }

  // 4. Mark all present
  const nowStr = new Date().toISOString()
  const rows = enrollments.map((e) => ({
    session_id: sessionId,
    user_id: e.user_id,
    attended: true,
    marked_by: 'admin',
    joined_click_at: nowStr
  }))

  const { error } = await supabase
    .from('session_attendance')
    .upsert(rows, { onConflict: 'session_id,user_id' })

  if (error) return { error: error.message }
  return { success: true }
}

export async function finalizeAttendance(sessionId: string) {
  const supabase = await createClient()

  // 1. Authorize Admin
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  // 2. Fetch session details to find batch ID and course ID
  const { data: session } = await supabase
    .from('live_sessions')
    .select('batch_id, batches (course_id)')
    .eq('id', sessionId)
    .single()

  if (!session) return { error: 'Session not found' }
  const batch = Array.isArray(session.batches) ? session.batches[0] : session.batches
  const courseId = batch?.course_id

  if (!courseId) return { error: 'Associated course not found' }

  // 3. Update session status to completed
  const { error: sessionUpdateError } = await supabase
    .from('live_sessions')
    .update({ status: 'completed' })
    .eq('id', sessionId)

  if (sessionUpdateError) return { error: sessionUpdateError.message }

  // 4. Fetch all students enrolled in the batch
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('user_id')
    .eq('batch_id', session.batch_id)
    .is('revoked_at', null)

  // 5. Recalculate attendance & re-run checkCompletion / auto-issue certificates
  if (enrollments && enrollments.length > 0) {
    for (const e of enrollments) {
      await checkAndIssueCertificate(e.user_id, courseId)
    }
  }

  revalidatePath('/admin/batches')
  revalidatePath(`/admin/batches/${session.batch_id}`)
  return { success: true }
}
