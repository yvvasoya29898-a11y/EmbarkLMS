import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CourseListClient from './CourseListClient'

export default async function AdminCoursesPage() {
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

  // 2. Fetch all courses
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, title, slug, delivery_type, status, original_price_inr, price_inr_display, sort_order, created_at, categories, thumbnail_url, category_sort_orders')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (coursesError) {
    console.error('Error fetching courses:', coursesError)
  }

  // 3. Fetch batches and active enrollments counts to enrich the table
  const { data: batches } = await supabase
    .from('batches')
    .select('id, course_id')

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, course_id')
    .is('revoked_at', null)

  // Map counts per course
  const batchCounts: Record<string, number> = {}
  batches?.forEach((b) => {
    batchCounts[b.course_id] = (batchCounts[b.course_id] || 0) + 1
  })

  const studentCounts: Record<string, number> = {}
  enrollments?.forEach((e) => {
    studentCounts[e.course_id] = (studentCounts[e.course_id] || 0) + 1
  })

  const formattedCourses = (courses || []).map((c) => ({
    ...c,
    batch_count: batchCounts[c.id] || 0,
    student_count: studentCounts[c.id] || 0
  }))

  return (
    <CourseListClient initialCourses={formattedCourses} />
  )
}
