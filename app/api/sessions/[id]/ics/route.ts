import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // 2. Fetch session details
  const { data: session, error: sessionError } = await supabase
    .from('live_sessions')
    .select('id, batch_id, title, description, starts_at, duration_min')
    .eq('id', id)
    .single()

  if (sessionError || !session) {
    return new NextResponse('Session not found', { status: 404 })
  }

  // 3. Verify user is enrolled in the session's batch (or is admin)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isAdmin = profile?.role === 'admin'

  if (!isAdmin) {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('batch_id', session.batch_id)
      .is('revoked_at', null)
      .maybeSingle()

    if (!enrollment) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  // 4. Generate ICS file content
  const startsAt = new Date(session.starts_at)
  const endsAt = new Date(startsAt.getTime() + session.duration_min * 60 * 1000)

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const cleanDescription = (session.description || 'Join live class via Embark LMS.')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Embark AI//Embark LMS//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${session.id}@embarkai.in`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(startsAt)}`,
    `DTEND:${formatDate(endsAt)}`,
    `SUMMARY:${session.title}`,
    `DESCRIPTION:${cleanDescription}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="class-session-${id}.ics"`,
    },
  })
}
