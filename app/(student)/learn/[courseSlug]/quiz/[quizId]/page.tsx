import React from 'react'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import QuizWizardClient from './QuizWizardClient'

interface QuizPageProps {
  params: Promise<{ courseSlug: string; quizId: string }>
}

export default async function QuizPage({ params }: QuizPageProps) {
  const { courseSlug, quizId } = await params
  const supabase = await createClient()

  // 1. Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // 2. Fetch quiz details joined with lessons
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select(`
      id,
      pass_pct,
      max_attempts,
      lesson_id,
      lessons (
        id,
        title,
        module_id
      )
    `)
    .eq('id', quizId)
    .single()

  if (quizError || !quiz) {
    notFound()
  }

  const lesson = Array.isArray(quiz.lessons) ? quiz.lessons[0] : quiz.lessons
  if (!lesson) {
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

  // 4. Verify enrollment in course
  const { data: enrollment, error: enrollError } = await supabase
    .from('enrollments')
    .select('id, batch_id')
    .eq('user_id', user.id)
    .eq('course_id', course.id)
    .is('revoked_at', null)
    .maybeSingle()

  if (enrollError || !enrollment) {
    redirect(`/courses/${courseSlug}`)
  }

  // 5. Fetch previous attempts by user
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('id, score_pct, attempted_at')
    .eq('user_id', user.id)
    .eq('quiz_id', quizId)
    .order('attempted_at', { ascending: true })

  const attemptsList = attempts || []

  // Check if lesson is already marked as completed (i.e. user already passed the quiz)
  const { data: progress } = await supabase
    .from('progress')
    .select('id')
    .eq('user_id', user.id)
    .eq('lesson_id', lesson.id)
    .maybeSingle()

  const isCompleted = !!progress

  // Enforce attempt limits if not completed
  if (!isCompleted && attemptsList.length >= quiz.max_attempts) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 text-slate-300 font-body">
        <div className="max-w-md text-center bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-xl space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-lg font-bold text-white font-display">Attempt Limit Reached</h2>
          <p className="text-xs text-slate-400">
            You have used all {quiz.max_attempts} attempts for this quiz. Please contact your instructor to reset attempts.
          </p>
          <Link
            href={`/learn/${courseSlug}/lesson/${lesson.id}`}
            className="inline-block bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all"
          >
            ← Back to lesson outlines
          </Link>
        </div>
      </div>
    )
  }

  // 6. SECURITY: Query questions list, SELECTING ONLY id, body, options, sort_order.
  // Never select correct_index or explanation.
  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('id, body, options, sort_order')
    .eq('quiz_id', quizId)
    .order('sort_order', { ascending: true })

  if (questionsError || !questions || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 text-slate-300 font-body">
        <div className="max-w-md text-center bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-xl space-y-4">
          <div className="text-4xl">✏️</div>
          <h2 className="text-lg font-bold text-white font-display">Empty Quiz</h2>
          <p className="text-xs text-slate-400">
            This quiz has no questions published yet. Please check back later.
          </p>
          <Link
            href={`/learn/${courseSlug}/lesson/${lesson.id}`}
            className="inline-block bg-slate-705 hover:bg-slate-600 text-white text-xs font-bold py-2 px-4 rounded-xl transition-all"
          >
            ← Back to outline
          </Link>
        </div>
      </div>
    )
  }

  const formattedQuestions = (questions || []).map((q) => ({
    id: q.id,
    body: q.body,
    options: (q.options as string[]) || []
  }))

  return (
    <QuizWizardClient
      courseSlug={courseSlug}
      courseTitle={course.title}
      lessonId={lesson.id}
      lessonTitle={lesson.title}
      quizId={quizId}
      quizConfig={{
        pass_pct: quiz.pass_pct,
        max_attempts: quiz.max_attempts
      }}
      questions={formattedQuestions}
      previousAttempts={attemptsList}
      isPassed={isCompleted}
    />
  )
}
