'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service if needed
    console.error('LMS Application Error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col items-center justify-center p-6 relative overflow-hidden font-body">
      {/* Brand themed ambient light glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] bg-rose-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[450px] h-[450px] bg-primary-light/5 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[8000ms]" />

      {/* Modern thin line grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)] opacity-20 pointer-events-none" />

      <div className="max-w-md w-full text-center space-y-6 relative z-10">
        {/* Animated Brand Logo Element */}
        <div className="flex flex-col items-center gap-1.5 mb-2">
          <span className="text-xl font-bold tracking-tight text-primary font-display">
            Embark LMS
          </span>
          <div className="w-12 h-1 bg-gradient-to-r from-primary to-primary-light rounded-full" />
        </div>

        {/* Graphical Error display */}
        <div className="relative inline-flex p-4 rounded-2xl bg-rose-50 border border-rose-100/80 text-rose-600 shadow-sm animate-bounce duration-1000">
          <AlertCircle className="w-12 h-12" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-display">
            System Interrupt
          </h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
            An unexpected error interrupted the execution flow. The details have been logged. Let&apos;s reboot the current context.
          </p>
          {error.digest && (
            <p className="text-[10px] text-slate-400 font-mono select-all">
              Digest: {error.digest}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-4">
          <button
            type="button"
            onClick={() => reset()}
            className="bg-primary hover:bg-primary-light text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all duration-150 shadow-2xs hover:scale-[1.02] cursor-pointer"
          >
            🔄 Reboot Flow (Try Again)
          </button>
          <Link
            href="/"
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-xl text-xs transition-all duration-150 text-center"
          >
            🏠 Return Home
          </Link>
        </div>
      </div>
    </div>
  )
}
