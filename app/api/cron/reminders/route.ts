import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/email/resend'

export async function GET(request: NextRequest) {
  // 1. Authorize Vercel Cron Trigger (only in production)
  const authHeader = request.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const serviceClient = createServiceRoleClient()
  const now = new Date()

  // Define 1-hour window (between T+45m and T+75m)
  const oneHourStart = new Date(now.getTime() + 45 * 60 * 1000).toISOString()
  const oneHourEnd = new Date(now.getTime() + 75 * 60 * 1000).toISOString()

  // Define 24-hour window (between T+23.5h and T+24.5h)
  const twentyFourHourStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000).toISOString()
  const twentyFourHourEnd = new Date(now.getTime() + 24.5 * 60 * 60 * 1000).toISOString()

  // 2. Query 1h sessions
  const { data: sessions1h } = await serviceClient
    .from('live_sessions')
    .select(`
      id,
      title,
      starts_at,
      batch_id,
      batches (
        course_id,
        courses (
          title
        )
      )
    `)
    .gte('starts_at', oneHourStart)
    .lte('starts_at', oneHourEnd)

  // 3. Query 24h sessions
  const { data: sessions24h } = await serviceClient
    .from('live_sessions')
    .select(`
      id,
      title,
      starts_at,
      batch_id,
      batches (
        course_id,
        courses (
          title
        )
      )
    `)
    .gte('starts_at', twentyFourHourStart)
    .lte('starts_at', twentyFourHourEnd)

  let sentCount = 0

  // 4. Process 1h Reminders
  if (sessions1h && sessions1h.length > 0) {
    for (const session of sessions1h) {
      const { data: enrollments } = await serviceClient
        .from('enrollments')
        .select('user_id')
        .eq('batch_id', session.batch_id)
        .is('revoked_at', null)

      const batch = Array.isArray(session.batches) ? session.batches[0] : session.batches
      const course = batch ? (Array.isArray(batch.courses) ? batch.courses[0] : batch.courses) : null
      const courseTitle = course?.title || 'Professional Cohort'

      if (enrollments && enrollments.length > 0) {
        const userIds = enrollments.map((e) => e.user_id)
        const { data: profiles } = await serviceClient
          .from('profiles')
          .select('id, email')
          .in('id', userIds)

        const emailMap = new Map<string, string>()
        profiles?.forEach((p) => {
          if (p.email) emailMap.set(p.id, p.email)
        })

        const emailPromises = enrollments.map(async (e) => {
          const email = emailMap.get(e.user_id)
          if (email) {
            await sendEmail({
              to: email,
              subject: `[Reminder] Live Class: ${session.title} starts in 1 hour!`,
              html: `
                <div style="font-family: sans-serif; padding: 20px; line-height: 1.6; color: #333;">
                  <h2 style="color: #e11d48;">Live Class starting in 1 hour</h2>
                  <p>Hi there,</p>
                  <p>This is a reminder that the live session <strong>${session.title}</strong> for the course <strong>${courseTitle}</strong> starts in 1 hour.</p>
                  <p><strong>Starts at:</strong> ${new Date(session.starts_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)</p>
                  <p>Log in to your portal and join from the dashboard:</p>
                  <p><a href="https://embarkai.in/dashboard" style="background-color: #e11d48; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Join Live Session</a></p>
                  <br/>
                  <p>Best regards,<br/>The Embark AI Team</p>
                </div>
              `
            })
            return true
          }
          return false
        })
        const results = await Promise.all(emailPromises)
        sentCount += results.filter(Boolean).length
      }
    }
  }

  // 5. Process 24h Reminders
  if (sessions24h && sessions24h.length > 0) {
    for (const session of sessions24h) {
      const { data: enrollments } = await serviceClient
        .from('enrollments')
        .select('user_id')
        .eq('batch_id', session.batch_id)
        .is('revoked_at', null)

      const batch = Array.isArray(session.batches) ? session.batches[0] : session.batches
      const course = batch ? (Array.isArray(batch.courses) ? batch.courses[0] : batch.courses) : null
      const courseTitle = course?.title || 'Professional Cohort'

      if (enrollments && enrollments.length > 0) {
        const userIds = enrollments.map((e) => e.user_id)
        const { data: profiles } = await serviceClient
          .from('profiles')
          .select('id, email')
          .in('id', userIds)

        const emailMap = new Map<string, string>()
        profiles?.forEach((p) => {
          if (p.email) emailMap.set(p.id, p.email)
        })

        const emailPromises = enrollments.map(async (e) => {
          const email = emailMap.get(e.user_id)
          if (email) {
            await sendEmail({
              to: email,
              subject: `[Reminder] Live Class: ${session.title} starts in 24 hours!`,
              html: `
                <div style="font-family: sans-serif; padding: 20px; line-height: 1.6; color: #333;">
                  <h2 style="color: #e11d48;">Live Class tomorrow</h2>
                  <p>Hi there,</p>
                  <p>This is a reminder that the live session <strong>${session.title}</strong> for the course <strong>${courseTitle}</strong> is scheduled to start in 24 hours.</p>
                  <p><strong>Starts at:</strong> ${new Date(session.starts_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)</p>
                  <p>Log in to your portal to review course materials before the session:</p>
                  <p><a href="https://embarkai.in/dashboard" style="background-color: #e11d48; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Student Dashboard</a></p>
                  <br/>
                  <p>Best regards,<br/>The Embark AI Team</p>
                </div>
              `
            })
            return true
          }
          return false
        })
        const results = await Promise.all(emailPromises)
        sentCount += results.filter(Boolean).length
      }
    }
  }

  return NextResponse.json({ success: true, emails_sent: sentCount })
}
