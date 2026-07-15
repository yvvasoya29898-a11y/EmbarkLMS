"use client"

import React, { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordResetAction } from '@/lib/actions/auth'

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, null)

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 text-center mb-1 font-display">Forgot password?</h2>
      <p className="text-xs text-slate-500 text-center mb-6">
        Enter your email address and we will send you a password reset link.
      </p>

      {state?.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs font-semibold">
          {String(state.error)}
        </div>
      )}

      {state?.message && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs space-y-1.5 leading-relaxed font-semibold">
          <p>{state.message}</p>
          {process.env.NODE_ENV === 'development' && (
            <p className="text-[10px] text-slate-500 font-medium">
              💡 Dev Tip: If using local Supabase development, check your local Inbucket mailbox at <a href="http://localhost:54324" target="_blank" rel="noopener noreferrer" className="text-primary underline">http://localhost:54324</a> to find the reset link email.
            </p>
          )}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Email address</label>
          <input
            name="email"
            type="email"
            required
            placeholder="ravi@example.com"
            className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-xl py-2 px-3 text-sm text-slate-800 focus:outline-hidden transition-all placeholder-slate-400 font-medium"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-primary hover:bg-primary-light text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all duration-150 cursor-pointer disabled:opacity-50 shadow-xs"
        >
          {isPending ? 'Sending request...' : 'Send reset link'}
        </button>
      </form>

      <div className="text-center mt-6">
        <Link
          href="/auth/login"
          className="text-xs text-slate-500 hover:text-slate-700 font-semibold underline"
        >
          ← Back to login
        </Link>
      </div>
    </div>
  )
}
