import React from 'react'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'

export const metadata = {
  title: 'Privacy Policy | Embark LMS',
  description: 'Privacy policy and data collection terms for Embark LMS users.',
}

export default async function PrivacyPolicyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-xs text-slate-400 font-mono uppercase tracking-widest">
            Embark AI Institute · Gandhinagar, Gujarat, India · Last Updated: July 2026
          </p>
        </div>

        <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-6 text-slate-650 font-medium">

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 font-display">1. Who We Are</h2>
            <p>
              This website and LMS are operated by <strong>Embark AI Institute</strong>, located in Gandhinagar, Gujarat, India. We offer technical programs in artificial intelligence and automation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 font-display">2. What Information We Collect</h2>
            <p>
              To deliver our courses, we collect and store only the basic details required to set up your account and coordinate payments:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Personal Data:</strong> Your full name and email address.</li>
              <li><strong>Contact Data:</strong> Your phone number (required to coordinate offline payments and share course updates).</li>
              <li><strong>Enrollment Request details:</strong> UPI/bank transaction payment reference keys and student-written notes.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 font-display">3. Data Storage & Hosting</h2>
            <p>
              We host and store your profile records, quiz attempts, and course completion progress using cloud infrastructure services provided by Supabase. By accessing our services, you consent to the collection, processing, and storage of your personal data on these secure database servers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 font-display">4. Third-Party Services We Use</h2>
            <p>
              We integrate specific external platforms to support course operations:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>YouTube Embeds:</strong> Recorded lessons are delivered via unlisted YouTube video players. By playing videos, YouTube may log caching and browser details as governed by Google&apos;s privacy settings.</li>
              <li><strong>Transactional Emails:</strong> We use email delivery services (e.g. Resend) to send account setups, course batch confirmations, and PDF certificate delivery emails.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 font-display">5. Security of Your Data</h2>
            <p>
              We restrict access to database tables using Supabase Row-Level Security (RLS) policies. Only you can view your progress, certificates, and profile values, and only authorized administrators can create batch access links or view enrollment data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 font-display">6. Consent & Grievance Redressal</h2>
            <p>
              You can contact us to correct or request deletion of your profile credentials. For any data protection queries or complaints, you may contact our Grievance Officer at <strong>learn@embarkai.in</strong> or through the main website. We aim to address any grievances within the statutory timelines prescribed under Indian IT laws.
            </p>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  )
}
