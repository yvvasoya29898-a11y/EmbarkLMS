"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import FeedbackForm from '@/components/FeedbackForm'

interface CompletionClientProps {
  courseId: string
  courseTitle: string
  studentName: string
  verifyCode: string
  issueDate: string
  certificateId: string
}

const AcademicLogoSvg = () => (
  <svg viewBox="0 0 100 100" className="w-14 h-14 mx-auto select-none" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="#c5a880" strokeWidth="1.5" strokeLinecap="round">
      {/* Laurel Wreaths */}
      <path d="M 35,72 C 22,63 22,40 31,27 M 25,62 C 19,53 21,43 28,34" />
      <path d="M 35,72 L 31,69 M 31,62 L 27,59 M 29,52 L 25,49 M 30,42 L 26,39 M 32,32 L 28,29" strokeWidth="2" />
      <path d="M 65,72 C 78,63 78,40 69,27 M 75,62 C 81,53 79,43 72,34" />
      <path d="M 65,72 L 69,69 M 69,62 L 73,59 M 71,52 L 75,49 M 70,42 L 74,39 M 68,32 L 72,29" strokeWidth="2" />
      
      {/* Shield */}
      <path d="M 40,28 L 60,28 C 60,28 61.5,45 60,58 C 58.5,68 50,73 50,73 C 50,73 41.5,68 40,58 C 38.5,45 40,28 40,28 Z" strokeWidth="2" fill="#0f172a" />
      <path d="M 43,31 L 57,31 C 57,31 58.2,45 57,56 C 55.8,65 50,70 50,70 C 50,70 44.2,65 43,56 C 41.8,45 43,31 43,31 Z" strokeWidth="1" />
      
      {/* Letter 'E' */}
      <path d="M 46,39 L 54,39 M 46,45 L 52,45 M 46,51 L 54,51 M 46,39 L 46,51" strokeWidth="2" stroke="#c5a880" />
    </g>
  </svg>
)

const SignatureSvg = () => (
  <svg viewBox="0 0 150 45" className="w-24 h-6 select-none -mb-1" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M10,28 Q22,8 28,15 T35,32 T45,18 T55,28 T68,12 T75,30 T85,15 T95,25 T105,10 T115,28 T125,18 T135,22 M25,20 L55,20"
      fill="none"
      stroke="#1e40af"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const GoldSealSvg = () => (
  <svg viewBox="0 0 80 80" className="w-12 h-12 select-none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M 40,10 L 42,13 L 45,11 L 46,14 L 49,13 L 50,16 L 53,15 L 54,18 L 57,17 L 57,20 L 60,19 L 60,22 L 63,22 L 62,25 L 65,25 L 64,28 L 66,29 L 65,32 L 67,33 L 65,36 L 66,38 L 64,40 L 66,42 L 64,44 L 65,47 L 63,48 L 64,51 L 62,52 L 63,55 L 60,55 L 60,58 L 57,57 L 57,60 L 54,59 L 53,62 L 50,61 L 49,64 L 46,63 L 45,66 L 42,64 L 40,67 L 38,64 L 35,66 L 34,63 L 31,64 L 30,61 L 27,62 L 26,59 L 23,60 L 23,57 L 20,58 L 20,55 L 17,55 L 18,52 L 15,51 L 17,48 L 15,47 L 16,44 L 14,42 L 16,40 L 14,38 L 15,36 L 13,33 L 15,32 L 14,29 L 16,28 L 15,25 L 18,25 L 17,22 L 20,22 L 20,19 L 23,20 L 23,17 L 26,18 T 30,16 L 31,13 L 34,14 L 35,11 L 38,13 Z"
      fill="#d4af37"
      stroke="#c5a880"
      strokeWidth="1"
    />
    <circle cx="40" cy="40" r="23" fill="#c5a880" stroke="#b8860b" strokeWidth="1" />
    <circle cx="40" cy="40" r="20" fill="none" stroke="#fff" strokeWidth="0.8" strokeDasharray="3,2" opacity="0.6" />
    <text x="40" y="36" fill="#fff" fontSize="4.2" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle" letterSpacing="0.3">EMBARK AI</text>
    <text x="40" y="42" fill="#fff" fontSize="4.2" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle" letterSpacing="0.3">OFFICIAL</text>
    <text x="40" y="48" fill="#fff" fontSize="3.2" fontFamily="sans-serif" textAnchor="middle" opacity="0.9">SEAL</text>
    <polygon points="40,52 41,54 43.5,54 41.5,55.5 42.2,58 40,56.5 37.8,58 38.5,55.5 36.5,54 39,54" fill="#fff" />
  </svg>
)

export default function CompletionClient({
  courseId,
  courseTitle,
  studentName,
  verifyCode,
  issueDate,
  certificateId
}: CompletionClientProps) {
  const [copied, setCopied] = useState(false)
  const verifyUrl = `${window.location.origin}/verify/${verifyCode}`

  const handleCopy = () => {
    navigator.clipboard.writeText(verifyUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between font-body">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto flex justify-between items-center text-xs">
          <Link
            href="/dashboard"
            className="font-bold text-slate-400 hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <span className="font-bold text-emerald-450 flex items-center gap-1">
            <span>🎉</span> Completed Successfully
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-12 flex flex-col items-center justify-center space-y-8">
        
        {/* Congratulations Message */}
        <div className="text-center space-y-2">
          <div className="text-4xl">🎓</div>
          <h1 className="text-2xl font-bold text-white font-display">
            Congratulations, {studentName}!
          </h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed font-normal">
            You have successfully completed all lessons, passed all quizzes, and met the attendance threshold for:
          </p>
          <p className="text-sm text-primary font-bold">{courseTitle}</p>
        </div>

        {/* Premium Framed Certificate Preview */}
        <div className="w-full max-w-2xl bg-slate-950 p-4 sm:p-5 rounded-3xl shadow-2xl border border-slate-850 relative">
          {/* Inner Card */}
          <div className="w-full bg-[#fcfcf9] text-slate-900 border-4 border-slate-900 p-6 sm:p-10 rounded-2xl relative space-y-6 text-center select-none shadow-inner">
            {/* Gold Accent Inner Border */}
            <div className="absolute inset-1.5 border border-[#c5a880]/80 rounded-lg pointer-events-none" />

            {/* Corner Brackets */}
            <div className="absolute top-3 left-3 w-5 h-5 border-t border-l border-[#c5a880]" />
            <div className="absolute top-3 right-3 w-5 h-5 border-t border-r border-[#c5a880]" />
            <div className="absolute bottom-3 left-3 w-5 h-5 border-b border-l border-[#c5a880]" />
            <div className="absolute bottom-3 right-3 w-5 h-5 border-b border-r border-[#c5a880]" />

            <div className="absolute top-3.5 right-3.5 bg-rose-600 text-white text-[8px] font-bold uppercase tracking-wider py-0.5 px-2.5 rounded-md shadow-xs z-10 font-body">
              Verified Credentials
            </div>

            {/* Logo Crest */}
            <div className="pt-2">
              <AcademicLogoSvg />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#c5a880] uppercase tracking-widest block font-mono">
                EMBARK AI INSTITUTE
              </span>
              <h2 className="text-lg font-extrabold text-slate-900 font-display uppercase tracking-wide">
                Certificate of Completion
              </h2>
              <span className="text-[8px] text-slate-400 italic block tracking-wide font-body">
                In Recognition of Academic & Practical Excellence
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-[9px] text-slate-500 italic block font-body">This is proudly presented to</span>
              <h3 className="text-2xl font-extrabold text-slate-900 font-display italic">
                {studentName}
              </h3>
              <div className="w-36 h-[1px] bg-[#c5a880]/60 mx-auto" />
            </div>

            <p className="text-[9.5px] text-slate-500 max-w-md mx-auto leading-relaxed font-normal font-body">
              for successfully meeting all graduation requirements, completing assignments, and demonstrating core competencies in the professional syllabus of:
            </p>
            
            <h4 className="text-base font-extrabold text-slate-900 uppercase tracking-wide font-display">
              {courseTitle}
            </h4>

            {/* Seal and Signatures row */}
            <div className="border-t border-slate-200/60 pt-5 flex justify-between items-end gap-4 font-body">
              {/* Left: Issue Date */}
              <div className="text-left space-y-1 w-1/4">
                <div className="w-full h-[1px] bg-slate-200 mb-1" />
                <span className="block text-[6.5px] text-slate-400 font-bold uppercase tracking-wider">Issue Date</span>
                <span className="text-slate-700 font-bold font-mono text-[9px]">{issueDate}</span>
              </div>

              {/* Center: Gold Seal */}
              <div className="w-1/3 flex justify-center -mb-2">
                <GoldSealSvg />
              </div>

              {/* Right: Signature */}
              <div className="text-center space-y-1 w-1/4 flex flex-col items-center">
                <SignatureSvg />
                <div className="w-full h-[1px] bg-slate-200 mb-1" />
                <span className="block text-[6.5px] text-slate-400 font-bold uppercase tracking-wider">Authorized Signature</span>
                <span className="text-slate-700 font-bold text-[8.5px]">Yogi Vasoya</span>
                <span className="text-[7px] text-slate-400 block -mt-0.5">Founder, Embark AI</span>
              </div>
            </div>

            {/* Bottom mini verification */}
            <div className="pt-2 text-center text-[7px] text-slate-400 font-mono">
              Verification Code: {verifyCode}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap justify-center gap-3 w-full max-w-md">
          <a
            href={`/api/certificates/${certificateId}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-6 rounded-xl text-xs transition-colors text-center shadow-xs cursor-pointer select-none"
          >
            📄 Download Certificate PDF
          </a>
          <button
            onClick={handleCopy}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-3 px-6 rounded-xl text-xs transition-colors text-center cursor-pointer select-none"
          >
            {copied ? '✓ Link Copied!' : '🔗 Copy Verification Link'}
          </button>
        </div>

        <Link
          href="/dashboard"
          className="text-xs font-bold text-slate-400 hover:text-white transition-colors underline"
        >
          Go to Student Dashboard
        </Link>

        {/* Feedback Section */}
        <div className="w-full max-w-md pt-4">
          <FeedbackForm courseId={courseId} sessionId={null} />
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-850 bg-slate-950 py-6 px-6 text-center text-xs text-slate-505">
        <p>© {new Date().getFullYear()} Embark AI Institute. All rights reserved.</p>
      </footer>

    </div>
  )
}
