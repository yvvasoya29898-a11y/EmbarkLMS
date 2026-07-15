"use server"

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

interface CompletionCriteria {
  min_attendance_pct: number
  all_quizzes_passed: boolean
  all_lessons_completed: boolean
}

/**
 * Reusable function that evaluates if a user has completed a course based on its completion criteria JSON.
 */
export async function checkCompletion(userId: string, courseId: string): Promise<boolean> {
  const supabase = await createClient()

  // 1. Fetch course details and its completion criteria
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('completion_criteria')
    .eq('id', courseId)
    .single()

  if (courseError || !course) return false

  const criteria = (course.completion_criteria as unknown as CompletionCriteria) || {
    min_attendance_pct: 75,
    all_quizzes_passed: true,
    all_lessons_completed: false
  }

  // Fetch modules to associate lessons and quizzes
  const { data: modules } = await supabase
    .from('modules')
    .select('id')
    .eq('course_id', courseId)

  if (!modules || modules.length === 0) return false
  const moduleIds = modules.map((m) => m.id)

  // 2. Evaluate all_lessons_completed
  if (criteria.all_lessons_completed) {
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id')
      .in('module_id', moduleIds)

    if (lessons && lessons.length > 0) {
      const lessonIds = lessons.map((l) => l.id)
      const { count: completedCount } = await supabase
        .from('progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('lesson_id', lessonIds)

      if ((completedCount || 0) < lessons.length) {
        return false
      }
    }
  }

  // 3. Evaluate all_quizzes_passed
  if (criteria.all_quizzes_passed) {
    const { data: quizLessons } = await supabase
      .from('lessons')
      .select('id')
      .eq('type', 'quiz')
      .in('module_id', moduleIds)

    if (quizLessons && quizLessons.length > 0) {
      const quizLessonIds = quizLessons.map((l) => l.id)
      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, pass_pct')
        .in('lesson_id', quizLessonIds)

      if (quizzes && quizzes.length > 0) {
        const quizIds = quizzes.map((q) => q.id)
        const { data: attempts } = await supabase
          .from('quiz_attempts')
          .select('quiz_id, score_pct')
          .eq('user_id', userId)
          .in('quiz_id', quizIds)

        for (const q of quizzes) {
          const hasPassed = (attempts || []).some(
            (a) => a.quiz_id === q.id && a.score_pct >= q.pass_pct
          )
          if (!hasPassed) {
            return false
          }
        }
      }
    }
  }

  // 4. Evaluate min_attendance_pct
  if (criteria.min_attendance_pct > 0) {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('batch_id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .is('revoked_at', null)
      .maybeSingle()

    if (enrollment && enrollment.batch_id) {
      const { data: sessions } = await supabase
        .from('live_sessions')
        .select('id, starts_at, duration_min')
        .eq('batch_id', enrollment.batch_id)

      if (sessions && sessions.length > 0) {
        const now = new Date()
        // Filter sessions that have already completed
        const completedSessions = sessions.filter((s) => {
          const endsAt = new Date(new Date(s.starts_at).getTime() + s.duration_min * 60 * 1000)
          return endsAt <= now
        })

        if (completedSessions.length > 0) {
          const { data: attendance } = await supabase
            .from('session_attendance')
            .select('session_id')
            .eq('user_id', userId)
            .eq('attended', true)

          const attendedSessionIds = new Set((attendance || []).map((a) => a.session_id))
          const attendedCount = completedSessions.filter((s) => attendedSessionIds.has(s.id)).length
          
          const attendancePct = Math.round((attendedCount / completedSessions.length) * 100)
          if (attendancePct < criteria.min_attendance_pct) {
            return false
          }
        }
      }
    }
  }

  return true
}

/**
 * Checks completion criteria and automatically inserts a certificate row (idempotently).
 */
export async function checkAndIssueCertificate(userId: string, courseId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()

  // 1. Run criteria evaluations
  const isCompleted = await checkCompletion(userId, courseId)
  if (!isCompleted) return false

  // 2. Insert into certificates (idempotent unique index constraint check)
  const { error } = await supabase
    .from('certificates')
    .upsert(
      { user_id: userId, course_id: courseId, issued_at: new Date().toISOString() },
      { onConflict: 'user_id,course_id' }
    )

  if (error) {
    console.error('Error auto-issuing certificate:', error)
    return false
  }

  return true
}
