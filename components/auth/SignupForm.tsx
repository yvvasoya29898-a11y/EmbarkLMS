"use client"

import React, { useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import { signUpAction } from '@/lib/actions/auth'
import { createClient } from '@/lib/supabase/client'

interface SignupFormProps {
  next?: string
}

interface GoogleCredentialResponse {
  credential: string
}

interface GoogleGsi {
  accounts?: {
    id?: {
      initialize: (config: {
        client_id: string
        ux_mode?: string
        callback: (response: GoogleCredentialResponse) => Promise<void> | void
      }) => void
      renderButton: (
        parent: HTMLElement,
        options: {
          theme?: string
          size?: string
          width?: string
          text?: string
          shape?: string
          logo_alignment?: string
        }
      ) => void
    }
  }
}

export default function SignupForm({ next = '' }: SignupFormProps) {
  const [state, formAction, isPending] = useActionState(signUpAction, null)
  const [googleError, setGoogleError] = useState<string | null>(null)

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) return

    const initGoogleSignIn = () => {
      const win = window as unknown as { google?: GoogleGsi }
      const google = win.google
      if (google?.accounts?.id) {
        google.accounts.id.initialize({
          client_id: clientId,
          ux_mode: 'popup',
          callback: async (response: GoogleCredentialResponse) => {
            setGoogleError(null)
            const supabase = createClient()
            const { error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: response.credential,
            })
            if (error) {
              setGoogleError(error.message)
            } else {
              window.location.href = next || '/dashboard'
            }
          }
        })

        const btnElement = document.getElementById('google-signin-btn')
        if (btnElement) {
          const containerWidth = btnElement.parentElement?.clientWidth || 384
          const buttonWidth = Math.max(200, Math.min(400, containerWidth))

          google.accounts.id.renderButton(btnElement, {
            theme: 'outline',
            size: 'large',
            width: String(buttonWidth),
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left'
          })
        }
      }
    }

    if (typeof window !== 'undefined') {
      const win = window as unknown as { google?: GoogleGsi }
      if (win.google?.accounts?.id) {
        initGoogleSignIn()
      } else {
        const interval = setInterval(() => {
          const checkWin = window as unknown as { google?: GoogleGsi }
          if (checkWin.google?.accounts?.id) {
            initGoogleSignIn()
            clearInterval(interval)
          }
        }, 100)
        return () => clearInterval(interval)
      }
    }
  }, [next])

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 text-center mb-1 font-display">Create your account</h2>
      <p className="text-xs text-slate-400 text-center mb-6">Start your AI learning journey</p>

      {state?.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs font-semibold">
          {String(state.error)}
        </div>
      )}

      {/* Google Identity Services Sign Up Button */}
      <div className="mb-4">
        {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
          <div className="p-3 bg-amber-50 border border-amber-250 text-amber-800 rounded-xl text-xs space-y-1 font-semibold leading-relaxed">
            <p>⚠️ Google Client ID not configured</p>
            <p className="text-[10px] text-slate-500 font-medium">
              Please add <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to your <code>.env.local</code> file.
            </p>
          </div>
        ) : (
          <>
            <div id="google-signin-btn" className="w-full flex justify-center min-h-[40px] items-center" />
            {googleError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs text-center font-semibold">
                ⚠️ {googleError}
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-3 my-4">
        <div className="h-px bg-slate-200 flex-1" />
        <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">or</span>
        <div className="h-px bg-slate-200 flex-1" />
      </div>

      {/* Email / Password Sign Up Form */}
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Full name</label>
          <input
            name="fullName"
            type="text"
            required
            placeholder="e.g. Ravi Patel"
            className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-xl py-2 px-3 text-sm text-slate-800 focus:outline-hidden transition-all placeholder-slate-400 font-medium"
          />
        </div>

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

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Password</label>
          <input
            name="password"
            type="password"
            required
            placeholder="••••••••"
            className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-xl py-2 px-3 text-sm text-slate-800 focus:outline-hidden transition-all placeholder-slate-400 font-medium"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-primary hover:bg-primary-light text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all duration-150 cursor-pointer disabled:opacity-50 shadow-xs"
        >
          {isPending ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <div className="text-center mt-6">
        <p className="text-xs text-slate-500 font-medium">
          Already have an account?{' '}
          <Link href={`/auth/login${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="text-primary hover:text-primary-dark font-bold underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
