"use server"

import { createClient } from '@/lib/supabase/server'

export async function getLiveSessionMeetingUrl(sessionId: string) {
  const supabase = await createClient()

  // 1. Get logged-in user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'You must be logged in to join a session.' }
  }

  // 2. Fetch session details including batch_id and starts_at/duration
  const { data: session, error: sessionError } = await supabase
    .from('live_sessions')
    .select('batch_id, starts_at, duration_min, meeting_url')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    return { error: 'Session not found.' }
  }

  // 3. Verify user is enrolled in the session's batch (or is admin)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isAdmin = profile?.role === 'admin'

  if (!isAdmin) {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('batch_id', session.batch_id)
      .is('revoked_at', null)
      .maybeSingle()

    if (!enrollment) {
      return { error: 'You are not enrolled in the batch for this session.' }
    }
  }

  // 4. Verify the join window: Starts at starts_at - 15 minutes and ends when session finishes
  const now = new Date()
  const startsAt = new Date(session.starts_at)
  const endsAt = new Date(startsAt.getTime() + session.duration_min * 60 * 1000)
  const joinWindowStart = new Date(startsAt.getTime() - 15 * 60 * 1000)

  if (now < joinWindowStart || now > endsAt) {
    return { error: 'The join button is only active from 15 minutes before class until it completes.' }
  }

  // 5. Log join click automatically in session_attendance
  const { error: attError } = await supabase
    .from('session_attendance')
    .upsert({
      session_id: sessionId,
      user_id: user.id,
      joined_click_at: now.toISOString(),
      attended: true,
      marked_by: 'auto'
    }, {
      onConflict: 'session_id,user_id'
    })

  if (attError) {
    console.error('Error logging attendance join-click:', attError)
  }

  // 6. Return the meeting URL
  if (!session.meeting_url) {
    return { error: 'Meeting URL not set yet by admin.' }
  }

  return { success: true, url: session.meeting_url }
}

export async function scheduleLiveSession(
  batchId: string,
  title: string,
  description: string,
  startsAt: string,
  durationMin: number,
  meetingUrl: string
) {
  const supabase = await createClient()

  // 1. Authorize Admin
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Unauthorized')

  // 2. Validate input fields
  if (!title || !startsAt || !meetingUrl) {
    return { error: 'Title, Date & Time, and Meeting URL are required.' }
  }

  // 3. Insert session
  const { error } = await supabase
    .from('live_sessions')
    .insert({
      batch_id: batchId,
      title,
      description: description || null,
      starts_at: startsAt,
      duration_min: durationMin || 55,
      meeting_url: meetingUrl,
      status: 'upcoming'
    })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function postSessionRecordingUrl(sessionId: string, recordingUrl: string) {
  const supabase = await createClient()

  // 1. Authorize Admin
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Unauthorized')

  // 2. Validate input
  if (!recordingUrl || recordingUrl.trim().length === 0) {
    return { error: 'Recording URL is required.' }
  }

  // 3. Update recording URL and status
  const { error } = await supabase
    .from('live_sessions')
    .update({
      recording_url: recordingUrl,
      status: 'completed'
    })
    .eq('id', sessionId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
