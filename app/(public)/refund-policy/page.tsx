import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Refund Policy | Embark LMS',
  description: 'Refund policy for offline payments at Embark LMS.',
}

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col justify-between relative overflow-hidden font-body">
      {/* Brand-aligned ambient light glow */}
      <div className="absolute top-[-10%] left-[-5%] w-[550px] h-[550px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Modern thin line grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_80%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-100 bg-white/70 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <Image src="/Logo.svg" alt="Embark AI" width={112} height={28} priority className="h-7 sm:h-8 w-auto" />
          </Link>
          <Link href="/courses" className="text-xs font-bold text-primary uppercase tracking-wider font-mono">
            Explore Courses
          </Link>
        </div>
      </header>

      {/* Main content container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 relative z-10 space-y-8">
        <div className="space-y-3 pb-6 border-b border-slate-100">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
            Refund & Cancellation Policy
          </h1>
          <p className="text-xs text-slate-400 font-mono uppercase tracking-widest">
            Embark AI Institute · Gandhinagar, Gujarat, India · Last Updated: July 2026
          </p>
        </div>

        <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-6 text-slate-655 font-medium">
          
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 font-display">1. 7-Day Refund Guarantee</h2>
            <p>
              We want to make sure you are completely satisfied with your learning path. Students are eligible to request a **full refund within 7 calendar days** from the exact date and time course access is granted in the LMS.
            </p>
            <p className="text-slate-500 italic">
              Example: If your enrollment is approved on Monday at 10:00 AM, you have until the following Monday at 10:00 AM to submit a refund request.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 font-display">2. How to Request a Refund</h2>
            <p>
              Because payments are processed offline, refunds must be initiated manually. To request a refund:
            </p>
            <ul className="list-disc pl-5 space-y-2 font-semibold text-slate-800">
              <li><strong>Call our support team:</strong> Contact our team on our registered phone coordinates.</li>
              <li><strong>Email us:</strong> Write an email to our official registration support channel stating your name, registered email, phone number, program name, and payment reference code.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 font-display">3. Processing & Verification</h2>
            <p>
              Upon receiving your phone or email request, our administration team will review your account data. Once verified, the refund will be processed manually (via UPI or direct bank IMPS/NEFT transfer) to your source account.
            </p>
            <p className="font-semibold text-slate-800">
              Manual refunds are resolved within 7 to 10 working days from the date of request verification.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 font-display">4. Eligibility & Abuse Prevention</h2>
            <p>
              Refund requests will not be processed if:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>The refund request is submitted after the 7-day window.</li>
              <li>You have already completed more than 50% of the lessons in the course curriculum.</li>
              <li>You have downloaded course reference certificates or completed more than 2 graded quizzes.</li>
            </ul>
            <p className="text-slate-500 mt-3">
              Refunds are processed after deducting any applicable transaction charges or taxes incurred during the payment verification lifecycle.
            </p>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  )
}
