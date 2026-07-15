import React from 'react'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-slate-100 bg-slate-50/80 backdrop-blur-md py-10 px-6 relative z-10 font-body text-slate-500">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        
        {/* Brand details */}
        <div className="space-y-2">
          <div className="flex flex-col">
            <span className="text-sm font-extrabold tracking-tight text-slate-900 font-display">
              Embark AI Institute
            </span>
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest mt-0.5">
              embarkai.in
            </span>
          </div>
          <p className="text-[11px] text-slate-400 max-w-xs leading-normal">
            Online learning platform for AI and technology courses. Implementation-First.
          </p>
        </div>

        {/* Navigation & Legal Links */}
        <div className="flex flex-wrap gap-x-8 gap-y-4 text-xs font-semibold">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Explore</span>
            <Link href="/courses" className="hover:text-primary transition-colors">Courses</Link>
            <Link href="/community" className="hover:text-primary transition-colors">Community</Link>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Legal Policies</span>
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link href="/refund-policy" className="hover:text-primary transition-colors">Refund Policy</Link>
          </div>
        </div>

      </div>

      {/* Copyright row */}
      <div className="max-w-6xl mx-auto border-t border-slate-200/50 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-medium text-slate-400 font-mono">
        <p>© {new Date().getFullYear()} Embark AI Institute. All rights reserved.</p>
        <div className="flex gap-4">
          <a
            href="https://embarkai.in"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors uppercase tracking-wider"
          >
            Main Website
          </a>
        </div>
      </div>
    </footer>
  )
}
