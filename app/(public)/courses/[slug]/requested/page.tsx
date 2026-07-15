import React from 'react'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RequestedPageClient from './RequestedPageClient'

interface RequestedPageProps {
  params: Promise<{ slug: string }>
}

export default async function RequestedPage({ params }: RequestedPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // 1. Get logged-in user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/courses/${slug}/requested`)}`)
  }

  // 2. Fetch course details
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, slug')
    .eq('slug', slug)
    .single()

  if (courseError || !course) {
    notFound()
  }

  // 3. Fetch user's active enrollment request for this course
  const { data: request, error: requestError } = await supabase
    .from('enrollment_requests')
    .select('id, student_note, status')
    .eq('user_id', user.id)
    .eq('course_id', course.id)
    .in('status', ['new', 'contacted', 'paid'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // If no open request exists, redirect back to course landing page
  if (requestError || !request) {
    redirect(`/courses/${slug}`)
  }

  // 4. Fetch profile phone number
  const { data: profile } = await supabase
    .from('profiles')
    .select('phone')
    .eq('id', user.id)
    .single()

  const phone = profile?.phone || ''

  // 5. Fetch earliest open batch name for display
  const { data: batches } = await supabase
    .from('batches')
    .select('name')
    .eq('course_id', course.id)
    .eq('status', 'open')
    .order('starts_at', { ascending: true })
    .limit(1)

  const batchName = batches?.[0]?.name || null

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-slate-900 via-slate-950 to-black text-slate-800 p-6">
      {/* Dynamic ambient lights */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md flex justify-center">
        <RequestedPageClient
          requestId={request.id}
          courseTitle={course.title}
          batchName={batchName}
          initialPhone={phone}
          initialStudentNote={request.student_note}
        />
      </div>
    </div>
  )
}
