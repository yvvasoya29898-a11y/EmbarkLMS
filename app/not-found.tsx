import React from 'react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col items-center justify-center p-6 relative overflow-hidden font-body">
      {/* Brand themed ambient light glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] bg-primary/10 rounded-full blur-[100px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[450px] h-[450px] bg-primary-light/10 rounded-full blur-[100px] pointer-events-none animate-pulse duration-[8000ms]" />

      <div className="max-w-md w-full text-center space-y-6 relative z-10">
        {/* Animated Brand Logo Element */}
        <div className="flex flex-col items-center gap-1.5 mb-2">
          <span className="text-xl font-bold tracking-tight text-primary font-display">
            Embark LMS
          </span>
          <div className="w-12 h-1 bg-gradient-to-r from-primary to-primary-light rounded-full" />
        </div>

        {/* Graphical 404 display */}
        <div className="relative inline-block select-none">
          <h1 className="text-8xl md:text-9xl font-extrabold tracking-tighter bg-gradient-to-br from-primary via-primary-light to-primary-dark bg-clip-text text-transparent">
            404
          </h1>
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-primary-light rounded-2xl blur-md opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 -z-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold tracking-tight text-slate-900 font-display">
            Lost in Latent Space?
          </h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
            The neural pathway you requested does not exist or has been pruned. Let&apos;s guide you back to active training paths.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-4">
          <Link
            href="/"
            className="bg-primary hover:bg-primary-light text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all duration-150 shadow-2xs hover:shadow-sm text-center"
          >
            🏠 Return Home
          </Link>
          <Link
            href="/courses"
            className="bg-white hover:bg-slate-50 border border-slate-250 text-slate-700 font-bold py-2.5 px-6 rounded-xl text-xs transition-all duration-150 text-center"
          >
            📚 Browse Courses
          </Link>
        </div>
      </div>
    </div>
  )
}
