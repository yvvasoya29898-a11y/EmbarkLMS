import React from 'react'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import QuizBuilderClient from './QuizBuilderClient'

interface QuizBuilderPageProps {
  params: Promise<{ lessonId: string }>
}

export default async function QuizBuilderPage({ params }: QuizBuilderPageProps) {
  const { lessonId } = await params
  const supabase = await createClient()

  // 1. Authenticate user & check admin role
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

  // 2. Fetch lesson details joined with modules and courses to get slugs
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select(`
      id,
      title,
      type,
      module_id,
      modules (
        id,
        course_id,
        courses (
          id,
          title,
          slug
        )
      )
    `)
    .eq('id', lessonId)
    .single()

  if (lessonError || !lesson) {
    notFound()
  }

  if (lesson.type !== 'quiz') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 text-slate-800 font-body">
        <div className="max-w-md text-center bg-white border border-slate-200 p-8 rounded-2xl shadow-xs space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-lg font-bold text-slate-900 font-display">Invalid Lesson Type</h2>
          <p className="text-xs text-slate-500">
            This lesson is not set as a quiz lesson type.
          </p>
          <Link href="/admin/batches" className="text-primary text-xs font-bold underline">
            ← Back to batches
          </Link>
        </div>
      </div>
    )
  }

  const moduleInfo = Array.isArray(lesson.modules) ? lesson.modules[0] : lesson.modules
  const courseInfo = moduleInfo && (Array.isArray(moduleInfo.courses) ? moduleInfo.courses[0] : moduleInfo.courses)
  const courseSlug = courseInfo?.slug || ''
  const courseTitle = courseInfo?.title || 'Course'

  // 3. Fetch or initialize Quiz Configuration
  const { data: initialQuiz } = await supabase
    .from('quizzes')
    .select('id, pass_pct, max_attempts')
    .eq('lesson_id', lessonId)
    .maybeSingle()

  let quiz = initialQuiz

  if (!quiz) {
    // Automatically initialize a quiz config row for this lesson to prevent blank issues
    const { data: newQuiz, error: insertError } = await supabase
      .from('quizzes')
      .insert({
        lesson_id: lessonId,
        pass_pct: 70,
        max_attempts: 2
      })
      .select('id, pass_pct, max_attempts')
      .single()

    if (insertError || !newQuiz) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 text-slate-800 font-body">
          <div className="max-w-md text-center bg-white border border-slate-200 p-8 rounded-2xl shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 font-display">Error initializing Quiz</h2>
            <p className="text-xs text-slate-500 mt-2">
              {insertError?.message || 'Could not instantiate database row.'}
            </p>
          </div>
        </div>
      )
    }
    quiz = newQuiz
  }

  // 4. Fetch all questions including correct answers (admin view)
  const { data: questions } = await supabase
    .from('questions')
    .select('id, body, options, correct_index, explanation, sort_order')
    .eq('quiz_id', quiz.id)
    .order('sort_order', { ascending: true })

  return (
    <QuizBuilderClient
      lessonId={lessonId}
      lessonTitle={lesson.title}
      courseTitle={courseTitle}
      courseSlug={courseSlug}
      quiz={{
        id: quiz.id,
        pass_pct: quiz.pass_pct,
        max_attempts: quiz.max_attempts
      }}
      questions={questions || []}
    />
  )
}
