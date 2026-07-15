import React from 'react'
import Script from 'next/script'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800 p-6 relative overflow-hidden font-body">
      {/* Load Google Identity Services script */}
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />

      {/* Decorative ambient light using brand colors */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-primary-light/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col items-center mb-6">
            <span className="text-2xl font-bold tracking-tight text-primary font-display">
              Embark LMS
            </span>
            <p className="text-xs text-slate-400 mt-1 font-semibold">Learn AI, implementation-first</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
