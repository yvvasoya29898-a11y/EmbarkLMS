"use client"

import React, { useActionState } from 'react'
import { completeProfileAction, signOutAction } from '@/lib/actions/auth'

export default function CompleteProfilePage() {
  const [state, formAction, isPending] = useActionState(completeProfileAction, null)

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 text-center mb-1 font-display">One last step</h2>
      <p className="text-xs text-slate-455 text-center mb-6">We need your phone number to proceed with enrollment requests</p>

      {state?.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs font-semibold">
          {String(state.error)}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">
            Phone (required — our team calls to enroll you)
          </label>
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            required
            placeholder="+91 98250 XXXXX"
            className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-xl py-2 px-3 text-sm text-slate-800 focus:outline-hidden transition-all placeholder-slate-400 font-medium"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-primary hover:bg-primary-light text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all duration-150 cursor-pointer disabled:opacity-50 shadow-xs"
        >
          {isPending ? 'Saving...' : 'Complete profile'}
        </button>
      </form>

      <div className="text-center mt-6">
        <form action={signOutAction}>
          <button type="submit" className="text-xs text-slate-400 hover:text-slate-600 underline cursor-pointer font-semibold">
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
