import React from 'react'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { checkAndIssueCertificate } from '@/lib/actions/certificates'
import CompletionClient from './CompletionClient'

interface CompletionPageProps {
  params: Promise<{ courseSlug: string }>
}

export default async function CompletionPage({ params }: CompletionPageProps) {
  const { courseSlug } = await params
  const supabase = await createClient()

  // 1. Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // 2. Fetch course details
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, slug')
    .eq('slug', courseSlug)
    .single()

  if (courseError || !course) {
    notFound()
  }

  // 3. Verify enrollment
  const { data: enrollment, error: enrollError } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', course.id)
    .is('revoked_at', null)
    .maybeSingle()

  if (enrollError || !enrollment) {
    redirect(`/courses/${courseSlug}`)
  }

  // 4. Try fetching certificate
  let { data: cert } = await supabase
    .from('certificates')
    .select('id, verify_code, issued_at')
    .eq('user_id', user.id)
    .eq('course_id', course.id)
    .maybeSingle()

  if (!cert) {
    // Attempt auto-issuing on the fly
    const issued = await checkAndIssueCertificate(user.id, course.id)
    if (!issued) {
      // Not complete yet, redirect to curriculum entry
      redirect(`/learn/${courseSlug}`)
    }
    
    // Fetch certificate again
    const { data: newCert } = await supabase
      .from('certificates')
      .select('id, verify_code, issued_at')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .single()
    cert = newCert
  }

  if (!cert) {
    notFound()
  }

  // 5. Fetch student profile details
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  return (
    <CompletionClient
      courseId={course.id}
      courseTitle={course.title}
      studentName={profile?.full_name || 'Student'}
      verifyCode={cert.verify_code}
      issueDate={new Date(cert.issued_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
      certificateId={cert.id}
    />
  )
}
