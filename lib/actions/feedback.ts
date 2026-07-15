"use server"

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitFeedbackAction(
  courseId: string,
  sessionId: string | null,
  rating: number,
  comments: string
) {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'You must be logged in to submit feedback.' }

  // Check enrollment
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .is('revoked_at', null)
    .maybeSingle()

  if (!enrollment) {
    return { error: 'Access denied: You are not enrolled in this course.' }
  }

  // 2. Validate input
  if (rating < 1 || rating > 5) return { error: 'Rating must be between 1 and 5.' }

  // 3. Prevent duplicate feedback
  const query = supabase
    .from('feedback')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)

  if (sessionId) {
    query.eq('session_id', sessionId)
  } else {
    query.is('session_id', null)
  }

  const { data: existing } = await query.maybeSingle()
  if (existing) {
    return { error: 'You have already submitted feedback for this session/course.' }
  }

  // 4. Insert feedback row
  const { error } = await supabase
    .from('feedback')
    .insert({
      user_id: user.id,
      course_id: courseId,
      session_id: sessionId || null,
      rating,
      comments: comments.trim() || null
    })

  if (error) return { error: error.message }

  return { success: true }
}
