"use server"

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkAndIssueCertificate } from './certificates'

export async function submitQuizAttemptAction(
  quizId: string,
  lessonId: string,
  courseSlug: string,
  answers: Record<string, number>
) {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'You must be logged in to submit a quiz.' }

  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('id, pass_pct, max_attempts, lesson_id')
    .eq('id', quizId)
    .single()

  if (quizError || !quiz) return { error: 'Quiz configuration not found.' }

  // Verify enrollment
  const { data: lesson } = await supabase
    .from('lessons')
    .select('module_id, modules (course_id)')
    .eq('id', quiz.lesson_id)
    .single()
  const moduleInfo = Array.isArray(lesson?.modules) ? lesson?.modules[0] : lesson?.modules
  const courseId = moduleInfo?.course_id

  if (!courseId) {
    return { error: 'Associated course not found.' }
  }

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

  // Count existing attempts
  const { count: attemptCount } = await supabase
    .from('quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('quiz_id', quizId)

  if ((attemptCount || 0) >= quiz.max_attempts) {
    return { error: `You have reached the maximum attempt limit of ${quiz.max_attempts} for this quiz.` }
  }

  // 2. Fetch questions with correct answers (securely server-side only)
  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('id, body, options, correct_index, explanation, sort_order')
    .eq('quiz_id', quizId)
    .order('sort_order', { ascending: true })

  if (questionsError || !questions || questions.length === 0) {
    return { error: 'No questions found for this quiz.' }
  }

  // 3. Compute score and construct feedback payload
  let correctCount = 0
  const feedback = questions.map((q) => {
    const studentAnswer = answers[q.id]
    const isCorrect = studentAnswer === q.correct_index
    if (isCorrect) correctCount++
    
    return {
      id: q.id,
      body: q.body,
      options: q.options as string[],
      studentAnswer,
      correctIndex: q.correct_index,
      isCorrect,
      explanation: q.explanation
    }
  })

  const scorePct = Math.round((correctCount / questions.length) * 100)
  const passed = scorePct >= quiz.pass_pct

  const nextAttemptNum = (attemptCount || 0) + 1

  // 4. Record attempt in database
  const { error: insertError } = await supabase
    .from('quiz_attempts')
    .insert({
      user_id: user.id,
      quiz_id: quizId,
      score_pct: scorePct,
      answers,
      attempt_number: nextAttemptNum
    })

  if (insertError) {
    if (insertError.code === '23505') {
      return { error: 'Your attempt is already being processed. Please wait.' }
    }
    return { error: insertError.message }
  }



  // 5. If passed, mark lesson complete idempotently
  if (passed) {
    await supabase
      .from('progress')
      .upsert(
        { user_id: user.id, lesson_id: quiz.lesson_id, completed_at: new Date().toISOString() },
        { onConflict: 'user_id,lesson_id' }
      )
    if (courseId) {
      await checkAndIssueCertificate(user.id, courseId)
    }
  }

  revalidatePath(`/learn/${courseSlug}`)
  return {
    success: true,
    scorePct,
    passed,
    attemptsRemaining: quiz.max_attempts - (attemptCount || 0) - 1,
    feedback
  }
}

export async function saveQuizConfigAction(lessonId: string, passPct: number, maxAttempts: number) {
  const supabase = await createClient()

  // Verify Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Unauthorized')

  // Upsert quiz config
  const { error } = await supabase
    .from('quizzes')
    .upsert({
      lesson_id: lessonId,
      pass_pct: passPct,
      max_attempts: maxAttempts
    }, {
      onConflict: 'lesson_id'
    })

  if (error) return { error: error.message }
  return { success: true }
}

export async function saveQuizQuestionAction(
  quizId: string,
  questionId: string | null,
  body: string,
  options: string[],
  correctIndex: number,
  explanation: string,
  sortOrder: number
) {
  const supabase = await createClient()

  // Verify Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Unauthorized')

  if (questionId) {
    // Update question
    const { error } = await supabase
      .from('questions')
      .update({
        body,
        options,
        correct_index: correctIndex,
        explanation,
        sort_order: sortOrder
      })
      .eq('id', questionId)

    if (error) return { error: error.message }
  } else {
    // Insert new question
    const { error } = await supabase
      .from('questions')
      .insert({
        quiz_id: quizId,
        body,
        options,
        correct_index: correctIndex,
        explanation,
        sort_order: sortOrder
      })

    if (error) return { error: error.message }
  }

  return { success: true }
}

export async function deleteQuizQuestionAction(questionId: string) {
  const supabase = await createClient()

  // Verify Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Unauthorized')

  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', questionId)

  if (error) return { error: error.message }
  return { success: true }
}
