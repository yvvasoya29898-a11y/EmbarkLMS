"use client"

import React, { useState, useTransition } from 'react'
import { redeemInviteCodeAction } from '@/lib/actions/enrollment'

interface InviteCodeFormProps {
  className?: string
  onSuccessRedirect?: boolean
}

export default function InviteCodeForm({ className = '', onSuccessRedirect = true }: InviteCodeFormProps) {
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    const cleanCode = inviteCode.trim().toUpperCase()
    if (!cleanCode) {
      setError('Please enter an invite code.')
      return
    }

    startTransition(async () => {
      const response = await redeemInviteCodeAction(cleanCode)
      if (response.error) {
        setError(response.error)
      } else {
        setSuccessMsg(`Success! You have been enrolled in "${response.courseTitle}".`)
        setInviteCode('')
        if (onSuccessRedirect && typeof window !== 'undefined') {
          // Soft delay to let success message display before reloading/redirecting
          setTimeout(() => {
            window.location.href = `/learn/${response.courseSlug}`
          }, 1500)
        }
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-3 font-body ${className}`}>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="ENTER COHORT CODE (E.G. IITB-AI-2026)"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
            disabled={isPending}
            className="w-full text-xs font-mono uppercase bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20 text-slate-800 py-3 px-4 rounded-xl outline-none transition-all placeholder:text-slate-400 placeholder:normal-case font-semibold tracking-wider"
          />
          {inviteCode && (
            <button
              type="button"
              onClick={() => setInviteCode('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-650 p-1 text-sm font-bold transition-colors"
            >
              ✕
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-slate-900 hover:bg-slate-850 text-white text-xs font-bold py-3 px-5 rounded-xl transition-all shadow-3xs hover:shadow-2xs cursor-pointer shrink-0 disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {isPending ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Verifying...</span>
            </>
          ) : (
            <span>Redeem Code</span>
          )}
        </button>
      </div>

      {error && (
        <div className="text-[11px] font-bold text-rose-650 bg-rose-50 border border-rose-100/50 py-2 px-3.5 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
          ⚠️ {error}
        </div>
      )}

      {successMsg && (
        <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100/50 py-2 px-3.5 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
          ✓ {successMsg}
        </div>
      )}
    </form>
  )
}
