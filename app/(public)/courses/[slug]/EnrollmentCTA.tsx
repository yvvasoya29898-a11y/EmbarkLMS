"use client"

import React, { useActionState, startTransition } from 'react'
import Link from 'next/link'
import { createEnrollmentRequest, enrollInFreeCourse } from '@/lib/actions/enrollment'

interface EnrollmentCTAProps {
  courseId: string
  courseSlug: string
  userLoggedIn: boolean
  hasPhone: boolean
  isEnrolled: boolean
  pendingRequestStatus: string | null
  isFree?: boolean
}

export default function EnrollmentCTA({
  courseId,
  courseSlug,
  userLoggedIn,
  hasPhone,
  isEnrolled,
  pendingRequestStatus,
  isFree = false
}: EnrollmentCTAProps) {
  // Use server action via form action state
  const [state, formAction, isPending] = useActionState(
    async (_prevState: { error?: string; message?: string } | null, _formData: FormData) => {
      if (isFree) {
        return enrollInFreeCourse(courseId)
      } else {
        return createEnrollmentRequest(courseId)
      }
    },
    null
  )

  // 1. Logged Out State
  if (!userLoggedIn) {
    const signupUrl = `/auth/signup?next=${encodeURIComponent(`/courses/${courseSlug}`)}`
    return (
      <div className="space-y-4">
        <Link
          href={signupUrl}
          className="w-full inline-flex items-center justify-center bg-primary hover:bg-primary-light text-white font-bold py-3 px-6 rounded-xl text-sm transition-all duration-150 shadow-md shadow-primary/10 text-center font-body cursor-pointer"
        >
          {isFree ? 'Enroll Now (Free)' : 'Request enrollment'}
        </Link>
        <p className="text-slate-500 text-[11px] leading-relaxed text-center font-medium">
          {isFree ? 'Create an account to enroll immediately.' : 'Please log in or create an account to request enrollment.'}
        </p>
      </div>
    )
  }

  // 2. Profile Incomplete (No Phone) State
  if (userLoggedIn && !hasPhone && !isFree) {
    const completeProfileUrl = `/auth/complete-profile?next=${encodeURIComponent(`/courses/${courseSlug}`)}`
    return (
      <div className="space-y-4">
        <Link
          href={completeProfileUrl}
          className="w-full inline-flex items-center justify-center bg-primary hover:bg-primary-light text-white font-bold py-3 px-6 rounded-xl text-sm transition-all duration-150 shadow-md text-center font-body cursor-pointer"
        >
          Complete profile to enroll
        </Link>
        <p className="text-amber-600 text-[11px] leading-relaxed text-center font-medium bg-amber-50 p-2.5 rounded-lg border border-amber-100">
          ⚠️ A phone number is required on your profile so our team can call you for offline payment.
        </p>
      </div>
    )
  }

  // 3. Enrolled State
  if (isEnrolled) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard"
          className="w-full inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl text-sm transition-all duration-150 shadow-md text-center"
        >
          Go to Dashboard
        </Link>
        <div className="text-emerald-700 text-[11px] leading-relaxed text-center font-semibold bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
          ✓ You are currently enrolled in this course!
        </div>
      </div>
    )
  }

  // 4. Request Pending State
  if (pendingRequestStatus) {
    let displayStatus = 'Awaiting call'
    if (pendingRequestStatus === 'contacted') displayStatus = 'Contacted'
    if (pendingRequestStatus === 'paid') displayStatus = 'Payment processing'

    return (
      <div className="space-y-4">
        <button
          disabled
          className="w-full bg-slate-100 border border-slate-200 text-slate-400 font-bold py-3 px-6 rounded-xl text-sm cursor-not-allowed text-center"
        >
          Request pending — we&apos;ll call you
        </button>
        <div className="text-sky-700 text-[11px] leading-relaxed text-center font-semibold bg-sky-50 p-2.5 rounded-lg border border-sky-100 flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping" />
          Status: {displayStatus}
        </div>
      </div>
    )
  }

  // 5. Default State (Logged in, has phone, not enrolled, no request)
  return (
    <form
      action={(formData) => {
        startTransition(() => {
          formAction(formData)
        })
      }}
      className="space-y-4"
    >
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary hover:bg-primary-light text-white font-bold py-3 px-6 rounded-xl text-sm transition-all duration-150 shadow-md shadow-primary/10 cursor-pointer disabled:opacity-50 text-center"
      >
        {isPending ? (isFree ? 'Enrolling...' : 'Requesting...') : isFree ? 'Enroll Now (Free)' : 'Request enrollment'}
      </button>

      {state?.error === 'duplicate_request' && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs leading-relaxed font-semibold">
          {(state as { message?: string }).message}
        </div>
      )}

      {state?.error && state.error !== 'duplicate_request' && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs leading-relaxed font-semibold">
          {(state as { message?: string }).message || state.error}
        </div>
      )}
    </form>
  )
}
