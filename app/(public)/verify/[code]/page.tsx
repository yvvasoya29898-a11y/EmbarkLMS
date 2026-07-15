import React from 'react'
import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const revalidate = 86400 // Cache certificate verification for 1 day

interface VerifyPageProps {
  params: Promise<{ code: string }>
}

const AcademicLogoSvg = () => (
  <svg viewBox="0 0 100 100" className="w-14 h-14 mx-auto select-none" xmlns="http://www.w3.org/2000/svg">
    {/* Hexagon background */}
    <path
      d="M 50,15 Q 53,15 56,17 L 76,29 Q 79,31 80,34 L 80,66 Q 79,69 76,71 L 56,83 Q 53,85 50,85 Q 47,85 44,83 L 24,71 Q 21,69 20,66 L 20,34 Q 21,31 24,29 L 44,17 Q 47,15 50,15 Z"
      fill="#3b5a80"
    />
    {/* Serpentine E path */}
    <path
      d="M 65,31 L 35,31 L 35,44 L 65,44 L 65,57 L 35,57 L 35,70 L 65,70"
      fill="none"
      stroke="white"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
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

export default async function VerifyCertificatePage({ params }: VerifyPageProps) {
  const { code } = await params
  const supabase = createServiceRoleClient()

  // Query certificate joined with profile and course using the service role client (security rule #6)
  const { data: cert, error } = await supabase
    .from('certificates')
    .select(`
      id,
      verify_code,
      issued_at,
      profiles (
        full_name
      ),
      courses (
        title
      )
    `)
    .eq('verify_code', code)
    .maybeSingle()

  if (error || !cert) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-body">
        <div className="max-w-md w-full bg-slate-950 border border-slate-800 p-8 rounded-2xl shadow-xl text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-lg font-bold text-white font-display">No Certificate Found</h2>
          <p className="text-xs text-slate-400">
            The verification code provided is invalid or has expired. Please check the URL and try again.
          </p>
          <Link
            href="/"
            className="inline-block bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2 px-4 rounded-xl transition-all shadow-3xs"
          >
            Go to home page
          </Link>
        </div>
      </div>
    )
  }

  const profile = Array.isArray(cert.profiles) ? cert.profiles[0] : cert.profiles
  const course = Array.isArray(cert.courses) ? cert.courses[0] : cert.courses
  const studentName = profile?.full_name || 'Student'
  const courseTitle = course?.title || 'Professional Course'
  const issueDate = new Date(cert.issued_at).toLocaleDateString('en-IN', { dateStyle: 'long' })

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between p-6 font-body">
      {/* Header logo badge */}
      <header className="max-w-2xl w-full mx-auto py-4 flex justify-between items-center text-xs">
        <Link href="/" className="font-bold text-slate-400 hover:text-white transition-colors">
          ← Visit embarkai.in
        </Link>
        <span className="text-emerald-500 font-bold flex items-center gap-1 font-semibold">
          🛡️ Authenticity Verified
        </span>
      </header>

      {/* Main framed certificate display */}
      <main className="flex-1 max-w-2xl w-full mx-auto flex flex-col items-center justify-center py-6">
        <div className="w-full bg-slate-950 p-4 sm:p-5 rounded-3xl shadow-2xl border border-slate-850 relative">
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
            <div className="pt-2 flex flex-col items-center">
              <AcademicLogoSvg />
              <span className="text-[11px] font-extrabold text-[#3b5a80] uppercase tracking-[0.25em] mt-2 font-display">
                EMBARK
              </span>
              <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-[0.15em] -mt-0.5">
                AI INSTITUTE
              </span>
            </div>

            <div className="space-y-1">
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
              Verification Code: {code}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-2xl w-full mx-auto text-center py-4 text-[10px] text-slate-500">
        © {new Date().getFullYear()} Embark AI Institute. All rights reserved.
      </footer>
    </div>
  )
}
