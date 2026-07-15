"use client"

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { submitQuizAttemptAction } from '@/lib/actions/quiz'

interface QuestionProps {
  id: string
  body: string
  options: string[]
}

interface AttemptProps {
  id: string
  score_pct: number
  attempted_at: string
}

interface FeedbackQuestion {
  id: string
  body: string
  options: string[]
  studentAnswer?: number
  correctIndex: number
  isCorrect: boolean
  explanation: string | null
}

interface QuizWizardClientProps {
  courseSlug: string
  courseTitle: string
  lessonId: string
  lessonTitle: string
  quizId: string
  quizConfig: {
    pass_pct: number
    max_attempts: number
  }
  questions: QuestionProps[]
  previousAttempts: AttemptProps[]
  isPassed: boolean
}

export default function QuizWizardClient({
  courseSlug,
  courseTitle,
  lessonId,
  lessonTitle,
  quizId,
  quizConfig,
  questions,
  previousAttempts,
  isPassed
}: QuizWizardClientProps) {
  const router = useRouter()
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [isPending, startTransition] = useTransition()

  // State to hold returned grading results
  const [result, setResult] = useState<{
    scorePct: number
    passed: boolean
    attemptsRemaining: number
    feedback: FeedbackQuestion[]
  } | null>(null)

  const [submitError, setSubmitError] = useState<string | null>(null)

  const currentQuestion = questions[currentIdx]
  const totalQuestions = questions.length
  const progressPercent = Math.round(((currentIdx + 1) / totalQuestions) * 100)

  const handleSelectOption = (optionIndex: number) => {
    setAnswers({
      ...answers,
      [currentQuestion.id]: optionIndex
    })
  }

  const handleNext = () => {
    if (currentIdx < totalQuestions - 1) {
      setCurrentIdx(currentIdx + 1)
    }
  }

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1)
    }
  }

  const handleSubmit = () => {
    // Verify all answered
    const unanswered = questions.some((q) => answers[q.id] === undefined)
    if (unanswered) {
      setSubmitError('Please answer all questions before submitting.')
      return
    }

    setSubmitError(null)
    startTransition(async () => {
      const response = await submitQuizAttemptAction(quizId, lessonId, courseSlug, answers)
      if (response.error) {
        setSubmitError(response.error)
      } else {
        setResult({
          scorePct: response.scorePct!,
          passed: response.passed!,
          attemptsRemaining: response.attemptsRemaining!,
          feedback: response.feedback as FeedbackQuestion[]
        })
        router.refresh()
      }
    })
  }

  const handleRetry = () => {
    setAnswers({})
    setResult(null)
    setCurrentIdx(0)
    setSubmitError(null)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between font-body">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto flex justify-between items-center text-xs">
          <div className="space-y-1">
            <Link
              href={`/learn/${courseSlug}/lesson/${lessonId}`}
              className="font-bold text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Outline
            </Link>
            <h1 className="text-slate-350 font-bold font-mono">
              {courseTitle} · <span className="text-slate-100">{lessonTitle}</span>
            </h1>
          </div>
          <span className="font-bold text-slate-500 font-mono">
            Attempts: {previousAttempts.length}/{quizConfig.max_attempts}
          </span>
        </div>
      </header>

      {/* Main Core Viewport */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-8 flex flex-col justify-center">
        
        {/* SUBMITTED RESULT VIEW CARD */}
        {result ? (
          <div className="space-y-6">
            
            {/* Score Summary Card */}
            <div className="bg-slate-950 border border-slate-800 p-8 rounded-3xl text-center space-y-6 shadow-2xl">
              <div className="inline-flex flex-col items-center justify-center h-28 w-28 rounded-full border-4 border-slate-800 bg-slate-900 relative">
                <span className="text-2xl font-bold font-mono text-white">
                  {result.scorePct}%
                </span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                  Your Score
                </span>
              </div>

              <div>
                <span className={`inline-block font-bold text-[11px] uppercase tracking-wider px-3.5 py-1 rounded-lg ${
                  result.passed ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-600/10 text-rose-450 border border-rose-500/20'
                }`}>
                  {result.passed ? 'Passed 🎉' : 'Failed ❌'}
                </span>
                <p className="text-slate-400 text-xs mt-3 leading-relaxed">
                  {result.passed
                    ? 'Congratulations! You have met the pass criteria and unlocked the checkmark.'
                    : `You scored ${result.scorePct}%, which is below the passing score of ${quizConfig.pass_pct}%.`}
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3 pt-2">
                {result.passed ? (
                  <Link
                    href={`/learn/${courseSlug}`}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-colors shadow-2xs cursor-pointer"
                  >
                    Continue study →
                  </Link>
                ) : result.attemptsRemaining > 0 ? (
                  <button
                    onClick={handleRetry}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-colors cursor-pointer shadow-2xs"
                  >
                    Retry Quiz ({result.attemptsRemaining} remaining)
                  </button>
                ) : (
                  <span className="text-slate-500 text-xs font-semibold py-2">
                    Attempts exhausted. Contact Admin.
                  </span>
                )}
                <Link
                  href={`/learn/${courseSlug}/lesson/${lessonId}`}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 px-5 rounded-xl text-xs transition-colors border border-slate-700"
                >
                  Return to outline
                </Link>
              </div>
            </div>

            {/* Explanations Feedback Accordion list */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-300">Question Review</h3>
              
              <div className="space-y-4">
                {result.feedback.map((q, idx) => (
                  <div
                    key={q.id}
                    className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <h4 className="text-xs font-bold text-slate-200 leading-snug">
                        {idx + 1}. {q.body}
                      </h4>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        q.isCorrect ? 'bg-emerald-600/10 text-emerald-400' : 'bg-rose-600/10 text-rose-400'
                      }`}>
                        {q.isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {q.options.map((opt, oidx) => {
                        const isStudentSel = q.studentAnswer === oidx
                        const isCorrectOpt = q.correctIndex === oidx
                        
                        let borderStyle = 'border-slate-800 bg-slate-950/20 text-slate-400'
                        if (isCorrectOpt) {
                          borderStyle = 'border-emerald-600 bg-emerald-600/10 text-white'
                        } else if (isStudentSel && !isCorrectOpt) {
                          borderStyle = 'border-rose-600 bg-rose-600/10 text-white'
                        }

                        return (
                          <div
                            key={oidx}
                            className={`p-3 rounded-xl border flex justify-between items-center ${borderStyle}`}
                          >
                            <span>{opt}</span>
                            {isCorrectOpt && <span className="text-emerald-500 font-bold">✓</span>}
                            {isStudentSel && !isCorrectOpt && <span className="text-rose-500 font-bold">✗</span>}
                          </div>
                        )
                      })}
                    </div>

                    {q.explanation && (
                      <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-850">
                        <span className="text-[10px] font-bold text-primary block uppercase tracking-wider mb-1">
                          Explanation
                        </span>
                        <p className="text-slate-400 text-xs leading-relaxed font-normal">
                          {q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          /* ACTIVE WIZARD SCREEN LAYOUT */
          <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 space-y-6">
            
            {/* Step Progress Info */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold font-mono">
                <span className="text-slate-450 uppercase">Question progress</span>
                <span className="text-primary">{currentIdx + 1} of {totalQuestions}</span>
              </div>
              <div className="w-full h-1 bg-slate-850 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Error alerts */}
            {submitError && (
              <div className="p-3.5 bg-rose-600/10 border border-rose-500/20 text-rose-450 text-xs font-bold rounded-xl">
                ⚠️ {submitError}
              </div>
            )}

            {/* Question Screen */}
            <div className="space-y-5">
              <h3 className="text-sm font-bold text-slate-100 leading-snug">
                {currentQuestion.body}
              </h3>

              <div className="space-y-2 text-xs">
                {currentQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer select-none flex items-center gap-3 ${
                      answers[currentQuestion.id] === idx
                        ? 'bg-primary/10 border-primary text-white font-bold'
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400 font-medium'
                    }`}
                  >
                    <span className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                      answers[currentQuestion.id] === idx ? 'border-primary bg-primary' : 'border-slate-700'
                    }`}>
                      {answers[currentQuestion.id] === idx && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                    <span>{opt}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Back/Next/Submit Controls */}
            <div className="flex justify-between items-center border-t border-slate-850 pt-5">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIdx === 0}
                className="bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 text-slate-200 font-bold py-2 px-5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Back
              </button>

              {currentIdx === totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold py-2 px-6 rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                >
                  {isPending ? 'Grading quiz...' : 'Submit Quiz'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="bg-primary hover:bg-primary-light text-white font-bold py-2 px-6 rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                >
                  Next
                </button>
              )}
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 px-6 text-center text-xs text-slate-505">
        <p>© {new Date().getFullYear()} Embark AI Institute. All rights reserved.</p>
      </footer>

    </div>
  )
}
