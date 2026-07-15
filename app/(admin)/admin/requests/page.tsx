import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RequestsInbox, { EnrollmentRequest } from './RequestsInbox'

export default async function AdminRequestsPage() {
  const supabase = await createClient()

  // 1. Double check admin authentication & authorization
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

  // 2. Fetch all enrollment requests
  // Explicitly select profiles and courses fields
  const { data: requests, error: requestsError } = await supabase
    .from('enrollment_requests')
    .select(`
      id,
      user_id,
      course_id,
      status,
      student_note,
      admin_notes,
      payment_reference,
      created_at,
      updated_at,
      profiles (
        full_name,
        phone
      ),
      courses (
        title,
        delivery_type
      )
    `)
    .order('created_at', { ascending: false })

  if (requestsError) {
    console.error('Error fetching enrollment requests:', requestsError)
  }

  // 3. Fetch active open batches for the requested courses
  const courseIds = Array.from(new Set((requests || []).map((r) => r.course_id)))
  let batches: Array<{
    id: string
    course_id: string
    name: string
    starts_at: string
    status: string
  }> = []

  if (courseIds.length > 0) {
    const { data: batchesData, error: batchesError } = await supabase
      .from('batches')
      .select('id, course_id, name, starts_at, status')
      .in('course_id', courseIds)
      .eq('status', 'open')

    if (batchesError) {
      console.error('Error fetching batches:', batchesError)
    } else {
      batches = batchesData || []
    }
  }

  // Group batches by course_id
  const batchesGrouped: Record<string, typeof batches> = {}
  batches.forEach((b) => {
    if (!batchesGrouped[b.course_id]) {
      batchesGrouped[b.course_id] = []
    }
    batchesGrouped[b.course_id].push(b)
  })

  // Format initialRequests types strictly for client usage
  const formattedRequests: EnrollmentRequest[] = (requests || []).map((r) => {
    const profs = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
    const crs = Array.isArray(r.courses) ? r.courses[0] : r.courses
    
    return {
      id: r.id,
      user_id: r.user_id,
      course_id: r.course_id,
      status: r.status,
      student_note: r.student_note,
      admin_notes: r.admin_notes,
      payment_reference: r.payment_reference,
      created_at: r.created_at,
      updated_at: r.updated_at,
      profiles: profs ? { full_name: profs.full_name, phone: profs.phone } : null,
      courses: crs ? { title: crs.title, delivery_type: crs.delivery_type } : null
    }
  })

  return (
    <div className="space-y-6 font-body">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-display">
          Lead Inbox
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Review student enrollment requests, log payments collected offline, and grant course access.
        </p>
      </div>

      <RequestsInbox
        initialRequests={formattedRequests}
        batchesGrouped={batchesGrouped}
      />
    </div>
  )
}
