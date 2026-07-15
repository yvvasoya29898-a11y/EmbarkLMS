"use server"

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkAndIssueCertificate } from './certificates'

export async function markLessonComplete(lessonId: string, courseSlug: string) {
  const supabase = await createClient()

  // 1. Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'You must be logged in to mark progress.' }
  }

  // Fetch course_id of the lesson
  const { data: lesson } = await supabase
    .from('lessons')
    .select('module_id, modules (course_id)')
    .eq('id', lessonId)
    .single()
  const moduleInfo = Array.isArray(lesson?.modules) ? lesson?.modules[0] : lesson?.modules
  const courseId = moduleInfo?.course_id

  // 2. Write progress row (idempotently utilizing unique index conflict)
  const { error } = await supabase
    .from('progress')
    .upsert(
      { user_id: user.id, lesson_id: lessonId, completed_at: new Date().toISOString() },
      { onConflict: 'user_id,lesson_id' }
    )

  if (error) {
    return { error: error.message }
  }

  // 3. Auto issue certificate if criteria met
  if (courseId) {
    await checkAndIssueCertificate(user.id, courseId)
  }

  revalidatePath(`/learn/${courseSlug}`)
  return { success: true }
}

