import React from 'react'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FeedbackForm from '@/components/FeedbackForm'

interface WatchPageProps {
  params: Promise<{ courseSlug: string; sessionId: string }>
}

function getYouTubeVideoId(url: string): string {
  let videoId = ''
  try {
    if (url.includes('youtube.com/watch')) {
      const parsed = new URL(url)
      videoId = parsed.searchParams.get('v') || ''
    } else if (url.includes('youtu.be/')) {
      const parts = url.split('youtu.be/')
      videoId = parts[1]?.split('?')[0] || ''
    } else if (url.includes('youtube.com/embed/')) {
      const parts = url.split('youtube.com/embed/')
      videoId = parts[1]?.split('?')[0] || ''
    }
  } catch (e) {
    console.error('Error parsing YouTube URL:', e)
  }
  return videoId
}

export default async function WatchRecordingPage({ params }: WatchPageProps) {
  const { courseSlug, sessionId } = await params
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

  // 3. Verify enrollment in course
  const { data: enrollment, error: enrollError } = await supabase
    .from('enrollments')
    .select('id, batch_id, batches (name)')
    .eq('user_id', user.id)
    .eq('course_id', course.id)
    .is('revoked_at', null)
    .maybeSingle()

  if (enrollError || !enrollment || !enrollment.batch_id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 text-slate-300 font-body">
        <div className="max-w-md text-center bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-xl space-y-4">
          <div className="text-4xl">🔒</div>
          <h2 className="text-lg font-bold text-white font-display">Access Denied</h2>
          <p className="text-xs text-slate-400">
            You must be enrolled in this course to watch class recordings.
          </p>
          <Link
            href="/courses"
            className="inline-block bg-primary hover:bg-primary-light text-white text-xs font-bold py-2 px-4 rounded-xl transition-all"
          >
            Browse Catalog
          </Link>
        </div>
      </div>
    )
  }

  const batch = Array.isArray(enrollment.batches) ? enrollment.batches[0] : enrollment.batches
  const batchName = batch?.name || 'Cohort Batch'

  // 4. Fetch the session recording details (explicit columns, EXCLUDING meeting_url)
  const { data: session, error: sessionError } = await supabase
    .from('live_sessions')
    .select('id, title, description, recording_url, starts_at')
    .eq('id', sessionId)
    .eq('batch_id', enrollment.batch_id)
    .single()

  if (sessionError || !session || !session.recording_url) {
    notFound()
  }

  // 5. Extract YouTube ID
  const videoId = getYouTubeVideoId(session.recording_url)
  if (!videoId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 text-slate-300 font-body">
        <div className="max-w-md text-center bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-xl space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-lg font-bold text-white font-display">Invalid Recording URL</h2>
          <p className="text-xs text-slate-400">
            The recording link is not a standard YouTube video format.
          </p>
          <Link
            href={`/learn/${courseSlug}/live`}
            className="inline-block bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-2 px-4 rounded-xl transition-all"
          >
            ← Back to live schedule
          </Link>
        </div>
      </div>
    )
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-body">
      
      {/* Cinema Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center text-xs">
          <Link
            href={`/learn/${courseSlug}/live`}
            className="font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1"
          >
            ← Back to live schedule
          </Link>
          <div className="font-semibold text-slate-400 font-mono">
            {course.title} · <span className="text-slate-300">{batchName}</span>
          </div>
        </div>
      </header>

      {/* Main Cinema Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8 space-y-6">
        
        {/* Video Embed Player Section */}
        <div className="bg-black border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative aspect-video">
          <iframe
            src={embedUrl}
            title={session.title}
            className="absolute inset-0 w-full h-full border-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Video details & Feedback */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-3 bg-slate-900 border border-slate-850 p-6 rounded-2xl shadow-xs">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md">
                Class Recording
              </span>
              <span className="text-[10px] text-slate-400 font-mono font-medium">
                Class Date: {new Date(session.starts_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
              </span>
            </div>

            <div>
              <h1 className="text-lg font-bold text-white leading-snug font-display">
                {session.title}
              </h1>
              {session.description ? (
                <p className="text-slate-350 text-xs mt-2 leading-relaxed font-normal">
                  {session.description}
                </p>
              ) : (
                <p className="text-slate-500 text-xs mt-2 italic font-normal">
                  No description provided for this session.
                </p>
              )}
            </div>
          </div>

          <div>
            <FeedbackForm courseId={course.id} sessionId={session.id} />
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-6 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto">
          <p>© {new Date().getFullYear()} Embark AI Institute. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}
