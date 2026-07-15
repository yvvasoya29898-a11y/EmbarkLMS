"use client"

import React, { useState, useTransition } from 'react'
import { submitFeedbackAction } from '@/lib/actions/feedback'

interface FeedbackFormProps {
  courseId: string
  sessionId?: string | null
}

export default function FeedbackForm({ courseId, sessionId = null }: FeedbackFormProps) {
  const [rating, setRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [comments, setComments] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      setErrorMsg('Please select a star rating.')
      return
    }

    setErrorMsg(null)
    startTransition(async () => {
      const result = await submitFeedbackAction(courseId, sessionId, rating, comments)
      if (result.error) {
        setErrorMsg(result.error)
      } else {
        setSuccess(true)
      }
    })
  }

  if (success) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center space-y-2">
        <span className="text-2xl">💖</span>
        <h4 className="text-sm font-bold text-white font-display">Thank you for your feedback!</h4>
        <p className="text-xs text-slate-400 font-normal">
          Your response has been submitted and helps us improve our curriculum.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 text-left">
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-white font-display">
          {sessionId ? 'Rate this Session' : 'Rate this Course'}
        </h4>
        <p className="text-[11px] text-slate-400 font-normal">
          Share your feedback anonymously to help improve class delivery.
        </p>
      </div>

      {errorMsg && (
        <div className="p-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-[10px] font-semibold font-mono">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Star selector */}
      <div className="flex gap-1.5 items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            disabled={isPending}
            className="text-2xl cursor-pointer transition-colors focus:outline-none disabled:opacity-50 select-none text-left"
          >
            <span className={star <= (hoverRating || rating) ? 'text-amber-500' : 'text-slate-700'}>
              ★
            </span>
          </button>
        ))}
        {rating > 0 && (
          <span className="text-[11px] font-bold text-slate-400 font-mono pl-1">
            ({rating} / 5)
          </span>
        )}
      </div>

      {/* Comments input */}
      <div className="space-y-1">
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Any comments or suggestions for the speaker?..."
          disabled={isPending}
          className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none w-full min-h-[70px] resize-y font-normal"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer select-none disabled:opacity-50 text-center"
      >
        {isPending ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </form>
  )
}
