"use server"

import { createClient } from '@/lib/supabase/server'

interface StudentReportRow {
  userId: string
  fullName: string
  attendancePct: number
  lessonsCompleted: number
  quizAverage: number
  status: 'On track' | 'At risk'
}

export async function getBatchReportData(batchId: string): Promise<{ students: StudentReportRow[], error?: string }> {
  try {
    const supabase = await createClient()

    // 1. Authorize Admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: 'Not authenticated', students: [] }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return { error: 'Unauthorized', students: [] }

    // 2. Fetch batch details and course details
    const { data: batch } = await supabase
      .from('batches')
      .select('id, course_id, courses (completion_criteria)')
      .eq('id', batchId)
      .single()

    if (!batch) return { error: 'Batch not found', students: [] }
    interface CompletionCriteria {
      min_attendance_pct: number
    }

    const course = Array.isArray(batch.courses) ? batch.courses[0] : batch.courses
    const courseId = batch.course_id
    const criteria = (course?.completion_criteria as unknown as CompletionCriteria) || { min_attendance_pct: 75 }
    const minAttendancePct = criteria.min_attendance_pct || 75

    // 3. Fetch completed sessions in the batch
    const { data: sessions } = await supabase
      .from('live_sessions')
      .select('id, starts_at, duration_min')
      .eq('batch_id', batchId)

    const now = new Date()
    const completedSessions = (sessions || []).filter((s) => {
      const endsAt = new Date(new Date(s.starts_at).getTime() + s.duration_min * 60 * 1000)
      return endsAt <= now
    })

    // 4. Fetch all lessons in the course
    const { data: modules } = await supabase.from('modules').select('id').eq('course_id', courseId)
    if (!modules || modules.length === 0) return { students: [] }
    const moduleIds = modules.map((m) => m.id)
    
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id')
      .in('module_id', moduleIds)

    // Fetch quizzes in the course
    const { data: quizLessons } = await supabase
      .from('lessons')
      .select('id')
      .eq('type', 'quiz')
      .in('module_id', moduleIds)
    const quizLessonIds = (quizLessons || []).map((ql) => ql.id)
    
    let quizIds: string[] = []
    if (quizLessonIds.length > 0) {
      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id')
        .in('lesson_id', quizLessonIds)
      quizIds = (quizzes || []).map((q) => q.id)
    }

    // 5. Fetch enrolled students
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

    if (!enrollments || enrollments.length === 0) return { students: [] }

    const studentIds = enrollments.map((e) => e.user_id)

    // 6. Bulk fetch metrics across all batch students
    // A. Bulk fetch Attendance
    const { data: allAttendance } = await supabase
      .from('session_attendance')
      .select('user_id, session_id')
      .in('user_id', studentIds)
      .eq('attended', true)

    const attendanceMap = new Map<string, Set<string>>()
    allAttendance?.forEach((a) => {
      if (!attendanceMap.has(a.user_id)) {
        attendanceMap.set(a.user_id, new Set())
      }
      attendanceMap.get(a.user_id)?.add(a.session_id)
    })

    // B. Bulk fetch Progress (completed lessons & latest activity date)
    const lessonIds = (lessons || []).map((l) => l.id)
    const progressCountMap = new Map<string, number>()
    const progressLatestMap = new Map<string, Date>()

    if (lessonIds.length > 0) {
      const { data: allProgress } = await supabase
        .from('progress')
        .select('user_id, lesson_id, completed_at')
        .in('user_id', studentIds)
        .in('lesson_id', lessonIds)

      allProgress?.forEach((p) => {
        // Increment completed count
        progressCountMap.set(p.user_id, (progressCountMap.get(p.user_id) || 0) + 1)
        // Track latest progress timestamp
        const date = new Date(p.completed_at)
        const currentLatest = progressLatestMap.get(p.user_id)
        if (!currentLatest || date > currentLatest) {
          progressLatestMap.set(p.user_id, date)
        }
      })
    }

    // C. Bulk fetch Quiz attempts (scores & latest attempt date)
    const quizScoresMap = new Map<string, number[]>()
    const quizLatestMap = new Map<string, Date>()

    if (quizIds.length > 0) {
      const { data: allAttempts } = await supabase
        .from('quiz_attempts')
        .select('user_id, score_pct, attempted_at')
        .in('user_id', studentIds)
        .in('quiz_id', quizIds)

      allAttempts?.forEach((a) => {
        // Accumulate quiz scores
        if (!quizScoresMap.has(a.user_id)) {
          quizScoresMap.set(a.user_id, [])
        }
        quizScoresMap.get(a.user_id)?.push(a.score_pct)
        // Track latest quiz timestamp
        const date = new Date(a.attempted_at)
        const currentLatest = quizLatestMap.get(a.user_id)
        if (!currentLatest || date > currentLatest) {
          quizLatestMap.set(a.user_id, date)
        }
      })
    }

    // 7. Aggregate results in memory for each student
    const studentRows: StudentReportRow[] = []

    for (const e of enrollments) {
      const studentProfile = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles
      const name = studentProfile?.full_name || 'Anonymous student'
      
      // Attendance %
      let attendancePct = 100
      if (completedSessions.length > 0) {
        const attendedSet = attendanceMap.get(e.user_id) || new Set<string>()
        const attendedCount = completedSessions.filter((s) => attendedSet.has(s.id)).length
        attendancePct = Math.round((attendedCount / completedSessions.length) * 100)
      }

      // Lessons completed
      const lessonsCompleted = progressCountMap.get(e.user_id) || 0

      // Quiz average
      let quizAverage = 0
      const scores = quizScoresMap.get(e.user_id) || []
      if (scores.length > 0) {
        const sum = scores.reduce((acc, curr) => acc + curr, 0)
        quizAverage = Math.round(sum / scores.length)
      }

      // Inactivity check: Find latest activity date
      const lastProgressDate = progressLatestMap.get(e.user_id) || null
      const lastQuizDate = quizLatestMap.get(e.user_id) || null

      const dates = [lastProgressDate, lastQuizDate].filter(Boolean) as Date[]
      const latestActivity = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null

      const inactiveDays = latestActivity ? Math.floor((now.getTime() - latestActivity.getTime()) / (1000 * 60 * 60 * 24)) : 999
      
      // Status flag: At risk if attendance below min threshold OR inactive >= 7 days
      const isAtRisk = attendancePct < minAttendancePct || inactiveDays >= 7
      const status = isAtRisk ? 'At risk' : 'On track'

      studentRows.push({
        userId: e.user_id,
        fullName: name,
        attendancePct,
        lessonsCompleted,
        quizAverage,
        status
      })
    }

    return { students: studentRows }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Failed to retrieve report data'
    return { error: errMsg, students: [] }
  }
}
