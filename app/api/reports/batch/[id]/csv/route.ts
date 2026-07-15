import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: batchId } = await params
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

  // 2. Fetch batch and course details
  const { data: batch } = await supabase
    .from('batches')
    .select('name')
    .eq('id', batchId)
    .single()

  if (!batch) {
    return new NextResponse('Batch not found', { status: 404 })
  }

  // 3. Fetch scheduled live sessions
  const { data: sessions } = await supabase
    .from('live_sessions')
    .select('id, title')
    .eq('batch_id', batchId)
    .order('starts_at', { ascending: true })

  const sessionsList = sessions || []

  // 4. Fetch enrolled students
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      user_id,
      profiles (
        full_name
      )
    `)
    .eq('batch_id', batchId)
    .is('revoked_at', null)

  const studentsList = (enrollments || []).map((e) => {
    const studentProfile = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles
    return {
      userId: e.user_id,
      fullName: studentProfile?.full_name || 'Anonymous student'
    }
  })

  // 5. Fetch all attendance logs for these sessions
  const sessionIds = sessionsList.map((s) => s.id)
  let attendanceList: { session_id: string; user_id: string; attended: boolean }[] = []

  if (sessionIds.length > 0) {
    const { data } = await supabase
      .from('session_attendance')
      .select('session_id, user_id, attended')
      .in('session_id', sessionIds)
    attendanceList = (data as { session_id: string; user_id: string; attended: boolean }[]) || []
  }

  const attendanceMap = new Map<string, boolean>()
  attendanceList.forEach((a) => {
    attendanceMap.set(`${a.user_id}-${a.session_id}`, a.attended)
  })

  // 6. Generate CSV Content
  const headers = ['Student Name', ...sessionsList.map((s) => `"${s.title.replace(/"/g, '""')}"`)].join(',')
  const rows = studentsList.map((student) => {
    const cells = [
      `"${student.fullName.replace(/"/g, '""')}"`,
      ...sessionsList.map((s) => {
        const attended = attendanceMap.get(`${student.userId}-${s.id}`)
        if (attended === undefined) return '—'
        return attended ? 'Present' : 'Absent'
      })
    ]
    return cells.join(',')
  })

  const csvContent = [headers, ...rows].join('\r\n')
  const fileName = `attendance-report-${batch.name.replace(/[^a-zA-Z0-9]/g, '_')}.csv`

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`
    }
  })
}
