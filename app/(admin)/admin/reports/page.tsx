import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReportsClient from './ReportsClient'

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const half = Math.floor(sorted.length / 2)
  if (sorted.length % 2 !== 0) {
    return sorted[half]
  }
  return (sorted[half - 1] + sorted[half]) / 2.0
}

export default async function AdminReportsPage() {
  const supabase = await createClient()

  // 1. Authorize Admin
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  // 2. Fetch all batches for selection
  const { data: batches } = await supabase
    .from('batches')
    .select(`
      id,
      name,
      courses (
        title
      )
    `)
    .order('name', { ascending: true })

  const formattedBatches = (batches || []).map((b) => {
    const courseDetail = Array.isArray(b.courses) ? b.courses[0] : b.courses
    return {
      id: b.id,
      name: b.name,
      courses: courseDetail ? { title: courseDetail.title } : null
    }
  })

  // 3. Fetch enrollment requests for lead conversion metrics
  const { data: requests } = await supabase
    .from('enrollment_requests')
    .select('status, created_at, updated_at')

  const funnelCounts = {
    new: 0,
    contacted: 0,
    paid: 0,
    enrolled: 0,
    dropped: 0
  }

  const contactTimes: number[] = []

  if (requests) {
    requests.forEach((r) => {
      if (r.status === 'new') funnelCounts.new++
      else if (r.status === 'contacted') funnelCounts.contacted++
      else if (r.status === 'paid') funnelCounts.paid++
      else if (r.status === 'enrolled') funnelCounts.enrolled++
      else if (r.status === 'dropped') funnelCounts.dropped++

      // If transitioned out of new, log the duration in minutes
      if (['contacted', 'paid', 'enrolled'].includes(r.status)) {
        const diffMs = new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()
        contactTimes.push(Math.max(0, diffMs / (1000 * 60)))
      }
    })
  }

  const medianContactMinutes = calculateMedian(contactTimes)

  // 4. Fetch feedback statistics
  const { data: feedback } = await supabase
    .from('feedback')
    .select(`
      id,
      rating,
      comments,
      created_at,
      profiles (
        full_name
      ),
      courses (
        title
      ),
      live_sessions (
        title
      )
    `)
    .order('created_at', { ascending: false })

  const totalFeedback = feedback?.length || 0
  const totalRatingSum = feedback?.reduce((acc, curr) => acc + curr.rating, 0) || 0
  const averageRating = totalFeedback > 0 ? totalRatingSum / totalFeedback : 0

  const recentComments = (feedback || []).slice(0, 10).map((f) => {
    const studentProfile = Array.isArray(f.profiles) ? f.profiles[0] : f.profiles
    const course = Array.isArray(f.courses) ? f.courses[0] : f.courses
    const session = Array.isArray(f.live_sessions) ? f.live_sessions[0] : f.live_sessions

    return {
      id: f.id,
      rating: f.rating,
      comments: f.comments,
      studentName: studentProfile?.full_name || 'Anonymous student',
      courseTitle: course?.title || 'Course',
      category: session ? `Session: ${session.title}` : 'Course Completion'
    }
  })

  return (
    <div className="space-y-6 font-body p-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900 font-display">
          Analytics & Performance Reports
        </h1>
        <p className="text-xs text-slate-500 font-normal">
          Evaluate course feedback scores, student risk statuses, and cohort conversion funnels.
        </p>
      </div>

      <ReportsClient
        batches={formattedBatches}
        funnelCounts={funnelCounts}
        medianContactMinutes={medianContactMinutes}
        feedbackStats={{
          averageRating,
          totalFeedback,
          recentComments
        }}
      />
    </div>
  )
}
