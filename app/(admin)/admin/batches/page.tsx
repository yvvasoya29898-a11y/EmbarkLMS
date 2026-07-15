import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatISTDate } from '@/lib/date'

export default async function AdminBatchesPage() {
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

  // 2. Fetch all batches
  const { data: batches, error: batchesError } = await supabase
    .from('batches')
    .select(`
      id,
      name,
      course_id,
      starts_at,
      ends_at,
      status,
      courses (
        title
      )
    `)
    .order('starts_at', { ascending: false })

  if (batchesError) {
    console.error('Error fetching batches:', batchesError)
  }

  // 3. Fetch enrollments to get student count per batch
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('batch_id')
    .is('revoked_at', null)

  const studentCountMap: Record<string, number> = {}
  enrollments?.forEach((e) => {
    if (e.batch_id) {
      studentCountMap[e.batch_id] = (studentCountMap[e.batch_id] || 0) + 1
    }
  })

  return (
    <div className="space-y-6 font-body">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-display">
            Batches &amp; Sessions
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage cohort schedules, Google Meet/Zoom links, and YouTube class recordings.
          </p>
        </div>
      </div>

      {/* Batches Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-slate-600">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-5 font-semibold">Batch name</th>
                <th className="py-3.5 px-5 font-semibold">Course</th>
                <th className="py-3.5 px-5 font-semibold">Date range</th>
                <th className="py-3.5 px-5 font-semibold">Students</th>
                <th className="py-3.5 px-5 font-semibold">Status</th>
                <th className="py-3.5 px-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batches && batches.length > 0 ? (
                batches.map((b) => {
                  const course = Array.isArray(b.courses) ? b.courses[0] : b.courses
                  const studentCount = studentCountMap[b.id] || 0

                  const statusColors = ({
                    open: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                    running: 'bg-amber-50 text-amber-700 border-amber-100',
                    completed: 'bg-slate-100 text-slate-500 border-slate-200'
                  } as Record<string, string>)[b.status]

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-4 px-5 font-semibold text-slate-900">
                        {b.name}
                      </td>
                      <td className="py-4 px-5 font-medium text-slate-700">
                        {course?.title || 'Unknown Course'}
                      </td>
                      <td className="py-4 px-5 font-medium text-slate-500">
                        {formatISTDate(b.starts_at, { day: 'numeric', month: 'short', year: 'numeric' })} – {formatISTDate(b.ends_at, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-4 px-5 font-bold font-mono text-slate-700">
                        {studentCount}
                      </td>
                      <td className="py-4 px-5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${statusColors}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <Link
                          href={`/admin/batches/${b.id}`}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 px-3 rounded-lg transition-colors inline-block text-[10px] shadow-2xs"
                        >
                          Manage Schedule
                        </Link>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No active batches found. Create one in courses to schedule sessions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
