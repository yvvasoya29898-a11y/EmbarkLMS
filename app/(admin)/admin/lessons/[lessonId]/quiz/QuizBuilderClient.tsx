"use client"

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import {
  saveQuizConfigAction,
  saveQuizQuestionAction,
  deleteQuizQuestionAction
} from '@/lib/actions/quiz'

interface QuestionItem {
  id: string
  body: string
  options: string[]
  correct_index: number
  explanation: string | null
  sort_order: number
}

interface QuizBuilderClientProps {
  lessonId: string
  lessonTitle: string
  courseTitle: string
  courseSlug: string
  quiz: {
    id: string
    pass_pct: number
    max_attempts: number
  }
  questions: QuestionItem[]
}

export default function QuizBuilderClient({
  lessonId,
  lessonTitle,
  courseTitle,
  courseSlug,
  quiz,
  questions
}: QuizBuilderClientProps) {
  const router = useRouter()
  const { toast, confirm } = useToast()
  const [isPending, startTransition] = useTransition()

  // Config State
  const [passPct, setPassPct] = useState(quiz.pass_pct)
  const [maxAttempts, setMaxAttempts] = useState(quiz.max_attempts)
  const [configSuccess, setConfigSuccess] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)

  // Editing Question State
  const [editingQuestion, setEditingQuestion] = useState<Partial<QuestionItem> | null>(null)
  const [questionError, setQuestionError] = useState<string | null>(null)

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault()
    setConfigSuccess(false)
    setConfigError(null)

    startTransition(async () => {
      const result = await saveQuizConfigAction(lessonId, passPct, maxAttempts)
      if (result.error) {
        setConfigError(result.error)
      } else {
        setConfigSuccess(true)
        router.refresh()
      }
    })
  }

  const handleStartAddQuestion = () => {
    setEditingQuestion({
      id: undefined,
      body: '',
      options: ['', ''],
      correct_index: 0,
      explanation: '',
      sort_order: questions.length > 0 ? Math.max(...questions.map(q => q.sort_order)) + 10 : 10
    })
    setQuestionError(null)
  }

  const handleStartEditQuestion = (q: QuestionItem) => {
    setEditingQuestion({
      ...q
    })
    setQuestionError(null)
  }

  const handleOptionChange = (idx: number, val: string) => {
    if (!editingQuestion || !editingQuestion.options) return
    const newOptions = [...editingQuestion.options]
    newOptions[idx] = val
    setEditingQuestion({
      ...editingQuestion,
      options: newOptions
    })
  }

  const handleAddOptionInput = () => {
    if (!editingQuestion || !editingQuestion.options) return
    setEditingQuestion({
      ...editingQuestion,
      options: [...editingQuestion.options, '']
    })
  }

  const handleRemoveOptionInput = (idx: number) => {
    if (!editingQuestion || !editingQuestion.options) return
    if (editingQuestion.options.length <= 2) {
      setQuestionError('A question must have at least 2 options.')
      return
    }
    const newOptions = editingQuestion.options.filter((_, i) => i !== idx)
    let newCorrect = editingQuestion.correct_index ?? 0
    if (newCorrect >= newOptions.length) {
      newCorrect = newOptions.length - 1
    }
    setEditingQuestion({
      ...editingQuestion,
      options: newOptions,
      correct_index: newCorrect
    })
  }

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault()
    setQuestionError(null)

    if (!editingQuestion || !editingQuestion.body) {
      setQuestionError('Question body text is required.')
      return
    }

    const opts = editingQuestion.options || []
    if (opts.some(o => !o.trim())) {
      setQuestionError('All option fields must have text.')
      return
    }

    startTransition(async () => {
      const result = await saveQuizQuestionAction(
        quiz.id,
        editingQuestion.id || null,
        editingQuestion.body!,
        opts,
        editingQuestion.correct_index || 0,
        editingQuestion.explanation || '',
        editingQuestion.sort_order || 10
      )

      if (result.error) {
        setQuestionError(result.error)
      } else {
        setEditingQuestion(null)
        router.refresh()
      }
    })
  }

  const handleDeleteQuestion = async (questionId: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Question',
      message: 'Are you sure you want to delete this question?',
      confirmText: 'Delete',
      isDestructive: true
    })
    if (!isConfirmed) return

    startTransition(async () => {
      const result = await deleteQuizQuestionAction(questionId)
      if (result.error) {
        toast.error(result.error)
      } else {
        router.refresh()
      }
    })
  }

  // Idempotent reordering controls
  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= questions.length) return

    const currentQ = questions[index]
    const otherQ = questions[targetIdx]

    // Swap sort orders
    startTransition(async () => {
      // Temporarily swap sort orders in DB
      await saveQuizQuestionAction(quiz.id, currentQ.id, currentQ.body, currentQ.options, currentQ.correct_index, currentQ.explanation || '', otherQ.sort_order)
      await saveQuizQuestionAction(quiz.id, otherQ.id, otherQ.body, otherQ.options, otherQ.correct_index, otherQ.explanation || '', currentQ.sort_order)
      router.refresh()
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between font-body">
      
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="space-y-1">
            <Link
              href="/admin/batches"
              className="text-xs font-bold text-slate-400 hover:text-slate-650 transition-colors"
            >
              ← Back to batches
            </Link>
            <h1 className="text-lg font-bold text-slate-900 font-display">
              Quiz Builder: {lessonTitle}
            </h1>
            <p className="text-xs text-slate-450 font-normal">
              Course Cohort: {courseTitle}
            </p>
          </div>
          <Link
            href={`/learn/${courseSlug}`}
            target="_blank"
            className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl text-xs transition-colors shrink-0 text-center"
          >
            Preview Curriculum Outlines ↗
          </Link>
        </div>
      </header>

      {/* Main Core Editor Grid */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Configurations Edit Panel) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-3xs">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5 font-display">
              Quiz Configurations
            </h3>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              {configSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold rounded-xl">
                  ✓ Config settings saved successfully!
                </div>
              )}
              {configError && (
                <div className="p-3 bg-red-50 text-red-650 border border-red-100 font-bold rounded-xl">
                  ⚠️ {configError}
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-slate-600">Passing score percentage</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={passPct}
                  onChange={(e) => setPassPct(parseInt(e.target.value) || 70)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600">Maximum Attempts allowed</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 2)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/20"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-3xs cursor-pointer select-none"
              >
                Save Settings
              </button>
            </form>
          </div>
        </div>

        {/* Right Column (Questions list & Active Forms) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Question Form Drawer */}
          {editingQuestion ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  {editingQuestion.id ? 'Edit Question' : 'Add Question'}
                </h3>
                <button
                  onClick={() => setEditingQuestion(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs">
                {questionError && (
                  <div className="p-3 bg-red-50 text-red-650 border border-red-100 font-bold rounded-xl">
                    ⚠️ {questionError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Question Body</label>
                  <textarea
                    rows={3}
                    value={editingQuestion.body || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, body: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none"
                    placeholder="Enter question text body..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-semibold text-slate-600 block">Options List</label>
                  <div className="space-y-2">
                    {editingQuestion.options?.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correct-option-index"
                          checked={editingQuestion.correct_index === idx}
                          onChange={() => setEditingQuestion({ ...editingQuestion, correct_index: idx })}
                          className="accent-primary h-4 w-4 shrink-0 cursor-pointer"
                          title="Set as correct answer"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 focus:bg-white focus:outline-none"
                          placeholder={`Option ${idx + 1}`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveOptionInput(idx)}
                          className="text-rose-500 hover:text-rose-700 text-xs font-semibold py-1 px-2.5 rounded-lg border border-slate-200 hover:bg-rose-50/10 cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddOptionInput}
                    className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold py-1.5 px-3 rounded-lg mt-1 cursor-pointer"
                  >
                    + Add Option
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Explanation Note (Shown to student post-submit)</label>
                  <textarea
                    rows={2}
                    value={editingQuestion.explanation || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none"
                    placeholder="Provide an explanation for the correct answer..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-primary hover:bg-primary-light text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  {isPending ? 'Saving question details...' : 'Save Question'}
                </button>
              </form>
            </div>
          ) : (
            /* QUESTIONS LIST PANELS */
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-3xs">
              <div className="flex justify-between items-center border-b border-slate-150 pb-3">
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  Questions Pool ({questions.length})
                </h3>
                <button
                  onClick={handleAddOptionInput}
                  type="button"
                  className="hidden"
                />
                <button
                  onClick={handleStartAddQuestion}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors cursor-pointer shadow-3xs"
                >
                  + Add Question
                </button>
              </div>

              {questions.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {questions.map((q, idx) => (
                    <div key={q.id} className="py-4 space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1 max-w-lg">
                          <h4 className="text-xs font-bold text-slate-900 leading-snug">
                            {idx + 1}. {q.body}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Sort Order: {q.sort_order}
                          </span>
                        </div>

                        {/* Reordering and Actions controls */}
                        <div className="flex items-center gap-1.5">
                          {/* Reordering */}
                          <button
                            onClick={() => handleMoveQuestion(idx, 'up')}
                            disabled={idx === 0 || isPending}
                            className="bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 text-slate-600 font-bold p-1 rounded cursor-pointer"
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => handleMoveQuestion(idx, 'down')}
                            disabled={idx === questions.length - 1 || isPending}
                            className="bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 text-slate-600 font-bold p-1 rounded cursor-pointer"
                            title="Move Down"
                          >
                            ▼
                          </button>

                          <div className="w-px h-5 bg-slate-200 mx-1" />

                          {/* Actions */}
                          <button
                            onClick={() => handleStartEditQuestion(q)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-1 px-2.5 border border-slate-200 rounded-lg text-[10px] cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="bg-white hover:bg-rose-50 text-rose-600 font-bold py-1 px-2.5 border border-slate-200 rounded-lg text-[10px] cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Options breakdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pl-2 border-l border-slate-200">
                        {q.options.map((opt, oidx) => {
                          const isCorrect = q.correct_index === oidx
                          return (
                            <div
                              key={oidx}
                              className={`p-2 rounded-lg border font-medium ${
                                isCorrect
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold'
                                  : 'bg-slate-50 border-slate-150 text-slate-500'
                              }`}
                            >
                              <span>{isCorrect ? '✓ ' : '• '}</span>
                              {opt}
                            </div>
                          )
                        })}
                      </div>

                      {q.explanation && (
                        <div className="bg-slate-50 p-2.5 rounded-lg text-[10px] text-slate-500 border border-slate-200 pl-3">
                          <span className="font-bold text-slate-600 block">Explanation note:</span>
                          <p className="mt-0.5 font-normal">{q.explanation}</p>
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No questions added yet to this quiz. Click &quot;Add Question&quot; above to start.
                </div>
              )}
            </div>
          )}

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-6 text-center text-xs text-slate-450">
        <p>© {new Date().getFullYear()} Embark AI Institute. Admin Panel.</p>
      </footer>

    </div>
  )
}
