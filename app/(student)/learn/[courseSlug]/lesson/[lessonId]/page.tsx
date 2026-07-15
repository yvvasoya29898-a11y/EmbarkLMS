import React from 'react'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCourseProgress, calculateModuleLocks } from '@/lib/progress'
import LessonPlayerClient, { LessonItem, ModuleOutlineItem, ResourceItem, QuizItem, QuizAttemptItem } from './LessonPlayerClient'

interface LessonPlayerPageProps {
  params: Promise<{ courseSlug: string; lessonId: string }>
}

export default async function LessonPlayerPage({ params }: LessonPlayerPageProps) {
  const { courseSlug, lessonId } = await params
  const supabase = await createClient()

  // 1. Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  const loggedIn = !authError && user

  // 2. Fetch current lesson
  const { data: currentLesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id, title, type, video_url, content_md, module_id, is_free_preview')
    .eq('id', lessonId)
    .single()

  if (lessonError || !currentLesson) {
    notFound()
  }

  // 3. Fetch course details
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, slug')
    .eq('slug', courseSlug)
    .single()

  if (courseError || !course) {
    notFound()
  }

  // 4. Verify enrollment & gating (Bypass for is_free_preview lessons)
  let isEnrolled = false
  if (loggedIn) {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .is('revoked_at', null)
      .maybeSingle()
    isEnrolled = !!enrollment
  }

  if (!currentLesson.is_free_preview && !isEnrolled) {
    // Gated lesson: user must be logged in and enrolled
    if (!loggedIn) {
      redirect(`/auth/login?next=/learn/${courseSlug}/lesson/${lessonId}`)
    } else {
      redirect(`/courses/${courseSlug}`)
    }
  }

  // 5. Fetch modules and lessons of this course to construct outline
  const { data: modules } = await supabase
    .from('modules')
    .select('id, title, sort_order, drip_locked')
    .eq('course_id', course.id)
    .order('sort_order', { ascending: true })

  const moduleIds = (modules || []).map((m) => m.id)

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, type, module_id, sort_order')
    .in('module_id', moduleIds)
    .order('sort_order', { ascending: true })

  // 6. Fetch user completed progress if logged in
  let completedLessonIds = new Set<string>()
  let progressPercent = 0

  if (loggedIn) {
    const { data: progressData } = await supabase
      .from('progress')
      .select('lesson_id')
      .eq('user_id', user.id)

    completedLessonIds = new Set((progressData || []).map((p) => p.lesson_id))
    progressPercent = await getCourseProgress(user.id, course.id)
  }

  // 7. Calculate drip lock evaluations
  const sortedModules = [...(modules || [])].sort((a, b) => a.sort_order - b.sort_order)
  const lessonsByModule: Record<string, typeof lessons> = {}
  lessons?.forEach((l) => {
    if (!lessonsByModule[l.module_id]) {
      lessonsByModule[l.module_id] = []
    }
    lessonsByModule[l.module_id]?.push(l)
  })

  const moduleLocks = calculateModuleLocks(modules || [], lessons || [], completedLessonIds)

  // Enforce server-side locks gating
  if (moduleLocks[currentLesson.module_id] && !currentLesson.is_free_preview) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 text-slate-300 font-body">
        <div className="max-w-md text-center bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-xl space-y-4">
          <div className="text-4xl">🔒</div>
          <h2 className="text-lg font-bold text-white font-display">Lesson Locked</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            This module has a drip-lock enabled. You must complete 100% of the lessons in the previous module to unlock this lesson.
          </p>
          <Link
            href={`/learn/${courseSlug}`}
            className="inline-block bg-primary hover:bg-primary-light text-white text-xs font-bold py-2 px-5 rounded-xl transition-all shadow-2xs"
          >
            Go to current study
          </Link>
        </div>
      </div>
    )
  }

  // 8. Fetch resources for this lesson
  const { data: resources } = await supabase
    .from('resources')
    .select('id, title, file_url')
    .eq('lesson_id', lessonId)

  // 9. Fetch Quiz details if current lesson is a quiz
  let quizDetails = null
  let quizAttemptsList: QuizAttemptItem[] = []

  if (currentLesson.type === 'quiz') {
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('id, pass_pct, max_attempts')
      .eq('lesson_id', lessonId)
      .single()

    if (quiz) {
      const { data: questions } = await supabase
        .from('questions')
        .select('id, body, options') // EXCLUDE correct_index and explanation (security rule #3)
        .eq('quiz_id', quiz.id)
        .order('sort_order', { ascending: true })

      quizDetails = {
        ...quiz,
        questions: questions || []
      }

      if (loggedIn) {
        const { data: attempts } = await supabase
          .from('quiz_attempts')
          .select('id, score_pct, attempted_at')
          .eq('user_id', user.id)
          .eq('quiz_id', quiz.id)
          .order('attempted_at', { ascending: true })

        quizAttemptsList = attempts || []
      }
    }
  }

  // 10. Format outline items for component presentation
  const formattedOutline = sortedModules.map((m) => {
    const modLessons = lessonsByModule[m.id] || []
    return {
      module_id: m.id,
      module_title: m.title,
      is_locked: moduleLocks[m.id],
      lessons: modLessons.map((l) => ({
        id: l.id,
        title: l.title,
        type: l.type,
        is_completed: completedLessonIds.has(l.id)
      }))
    }
  })

  return (
    <LessonPlayerClient
      courseSlug={courseSlug}
      courseTitle={course.title}
      currentLesson={currentLesson as LessonItem}
      outline={formattedOutline as ModuleOutlineItem[]}
      resources={(resources || []) as ResourceItem[]}
      quiz={quizDetails as QuizItem | null}
      quizAttempts={quizAttemptsList}
      progressPercent={progressPercent}
    />
  )
}
