import React from 'react'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'

export const metadata = {
  title: 'Terms of Service | Embark LMS',
  description: 'Terms of Service for Embark LMS users.',
}

export default async function TermsOfServicePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col justify-between relative overflow-hidden font-body">
      {/* Brand-aligned ambient light glow */}
      <div className="absolute top-[-10%] left-[-5%] w-[550px] h-[550px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Modern thin line grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_80%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Header */}
      <Header user={user} />

      {/* Main content container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 relative z-10 space-y-8">
        <div className="space-y-3 pb-6 border-b border-slate-100">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
            Terms of Service
          </h1>
          <p className="text-xs text-slate-400 font-mono uppercase tracking-widest">
            Embark AI Institute · Gandhinagar, Gujarat, India · Last Updated: July 2026
          </p>
        </div>

        <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-6 text-slate-655 font-medium">
          
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 font-display">1. Agreement to Terms</h2>
            <p>
              By creating an account on Embark LMS, you agree to these Terms of Service. These terms constitute a legal agreement between you and <strong>Embark AI Institute</strong> (Gandhinagar, Gujarat, India).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 font-display">2. Registration and Account Security</h2>
            <p>
              You must provide an accurate name, email address, and phone number to sign up. You agree to receive transactional emails and operational calls on your registered phone number regarding your enrollment requests, course schedules, and batch updates.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 font-display">3. Enrollment Requests & Offline Payment Verification</h2>
            <p>
              Our LMS operates with an offline payment workflow:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Submitting an enrollment request does not guarantee course access.</li>
              <li>You must complete the fee transfer offline (UPI, net banking, or direct deposit) as instructed by our team.</li>
              <li>Access to a cohort batch is manually approved and granted by the administrator only after verifying the transaction reference code you submit.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 font-display">4. Intellectual Property & Video Delivery</h2>
            <p>
              All materials, code files, quiz answers, and videos rendered inside Embark LMS are properties of Embark AI Institute:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 font-semibold text-slate-850">
              <li>Lessons containing YouTube unlisted embeds are for individual learning only.</li>
              <li>Sharing private YouTube URLs, Zoom/Meet live session access keys, or quiz questions outside the platform is strictly prohibited.</li>
              <li>Violation of these terms will lead to immediate account suspension and revocation of course access without refund.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 font-display">5. Limitation of Liability</h2>
            <p>
              We provide the learning management platform on an &quot;as-is&quot; basis under database hosting services from Supabase. While we strive for maximum uptime, we are not responsible for technical outages, data loss on Supabase, or disruptions in unlisted YouTube streams. In no event shall the total liability of Embark AI Institute for any claim exceed the total fee amount paid by the student for the active course.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 font-display">6. Governing Law and Jurisdiction</h2>
            <p>
              These Terms of Service are governed by the laws of India. Any legal dispute or claim arising out of these terms shall be subject to the exclusive jurisdiction of the courts located in <strong>Gandhinagar, Gujarat, India</strong>.
            </p>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  )
}
