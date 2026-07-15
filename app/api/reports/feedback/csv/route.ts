import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { formatISTDateTime } from '@/lib/date'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // 1. Authorize Admin
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return new NextResponse('Forbidden', { status: 403 })
  }

  // 2. Fetch feedback records joined with profiles, courses, and sessions
  const { data: feedbackList } = await supabase
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

  const headers = ['Student Name', 'Course Title', 'Category', 'Rating', 'Comments', 'Created At (IST)'].join(',')
  const rows = (feedbackList || []).map((f) => {
    const studentProfile = Array.isArray(f.profiles) ? f.profiles[0] : f.profiles
    const course = Array.isArray(f.courses) ? f.courses[0] : f.courses
    const session = Array.isArray(f.live_sessions) ? f.live_sessions[0] : f.live_sessions

    const category = session ? `Session: ${session.title}` : 'Course Completion'

    const cells = [
      `"${(studentProfile?.full_name || 'Anonymous').replace(/"/g, '""')}"`,
      `"${(course?.title || 'Unknown').replace(/"/g, '""')}"`,
      `"${category.replace(/"/g, '""')}"`,
      f.rating,
      `"${(f.comments || '').replace(/"/g, '""')}"`,
      `"${formatISTDateTime(f.created_at)}"`
    ]
    return cells.join(',')
  })

  const csvContent = [headers, ...rows].join('\r\n')
  const fileName = 'feedback-report.csv'

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`
    }
  })
}
