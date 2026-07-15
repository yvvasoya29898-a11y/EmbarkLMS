import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import UsersManagementClient, { UserProfile, UserEnrollment } from './UsersManagementClient'

export default async function AdminUsersPage() {
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

  // 2. Fetch all profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role, created_at')
    .order('created_at', { ascending: false })

  if (profilesError) {
    console.error('Error fetching user profiles:', profilesError)
  }

  // 3. Fetch all auth users from Service Role Client to map emails
  const emailMap: Record<string, string> = {}
  try {
    const serviceClient = createServiceRoleClient()
    const { data: authUsersData, error: authUsersError } = await serviceClient.auth.admin.listUsers({
      perPage: 1000
    })

    if (authUsersError) {
      console.error('Error listing auth users:', authUsersError)
    } else {
      authUsersData?.users?.forEach((u) => {
        emailMap[u.id] = u.email || ''
      })
    }
  } catch (err) {
    console.error('Failed to query service role auth users list:', err)
  }

  // 4. Fetch enrollments with course & batch titles
  const { data: enrollments, error: enrollmentsError } = await supabase
    .from('enrollments')
    .select(`
      id,
      user_id,
      course_id,
      batch_id,
      courses (
        title
      ),
      batches (
        name
      )
    `)
    .is('revoked_at', null)

  if (enrollmentsError) {
    console.error('Error fetching enrollments:', enrollmentsError)
  }

  // Map enrollments by user_id
  const enrollmentsMap: Record<string, UserEnrollment[]> = {}
  enrollments?.forEach((e) => {
    const courseDetail = Array.isArray(e.courses) ? e.courses[0] : e.courses
    const batchDetail = Array.isArray(e.batches) ? e.batches[0] : e.batches

    if (!enrollmentsMap[e.user_id]) {
      enrollmentsMap[e.user_id] = []
    }
    enrollmentsMap[e.user_id].push({
      id: e.id,
      course_title: courseDetail?.title || 'Unknown Course',
      batch_name: batchDetail?.name || null
    })
  })

  // 5. Merge data to UserProfile shape
  const formattedUsers: UserProfile[] = (profiles || []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    phone: p.phone,
    role: p.role,
    created_at: p.created_at,
    email: emailMap[p.id] || 'No Email Registered',
    enrollments: enrollmentsMap[p.id] || []
  }))

  return (
    <UsersManagementClient
      initialUsers={formattedUsers}
      currentAdminId={user.id}
    />
  )
}
