import React from 'react'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CourseEditorClient from './CourseEditorClient'

interface CourseDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminCourseDetailPage({ params }: CourseDetailPageProps) {
  const { id } = await params
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

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, description, slug, delivery_type, status, price_inr_display, original_price_inr, completion_criteria, is_popular, sort_order, thumbnail_url, categories, category_sort_orders, created_at, highlights, instructors, faqs')
    .eq('id', id)
    .single()

  if (courseError || !course) {
    notFound()
  }

  const { data: modules, error: modulesError } = await supabase
    .from('modules')
    .select('id, course_id, title, sort_order, drip_locked')
    .eq('course_id', id)
    .order('sort_order', { ascending: true })

  if (modulesError) {
    console.error('Error fetching modules:', modulesError)
  }

  const moduleList = modules || []
  const moduleIds = moduleList.map((m) => m.id)

  // 4. Fetch Curriculum Lessons
  let lessonList: {
    id: string
    module_id: string
    title: string
    type: 'video' | 'notes' | 'quiz' | 'recording'
    video_url: string | null
    content_md: string | null
    sort_order: number
    is_free_preview: boolean
  }[] = []
  if (moduleIds.length > 0) {
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, module_id, title, type, video_url, content_md, sort_order, is_free_preview')
      .in('module_id', moduleIds)
      .order('sort_order', { ascending: true })

    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError)
    } else {
      lessonList = (lessons || []) as unknown as typeof lessonList
    }
  }

  // 5. Fetch Resources (materials) for these lessons
  const lessonIds = lessonList.map((l) => l.id)
  let resourceList: {
    id: string
    lesson_id: string
    title: string
    file_url: string
  }[] = []
  if (lessonIds.length > 0) {
    const { data: resources, error: resourcesError } = await supabase
      .from('resources')
      .select('id, lesson_id, title, file_url')
      .in('lesson_id', lessonIds)

    if (resourcesError) {
      console.error('Error fetching resources:', resourcesError)
    } else {
      resourceList = (resources || []) as unknown as typeof resourceList
    }
  }

  const { data: batches } = await supabase
    .from('batches')
    .select('id, course_id, name, starts_at, duration_min, is_active, created_at, ends_at, invite_code, status')
    .eq('course_id', id)
    .order('starts_at', { ascending: false })

  return (
    <div className="space-y-6 font-body">
      <div>
        <Link
          href="/admin/courses"
          className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          ← Back to courses
        </Link>
      </div>

      <CourseEditorClient
        course={course}
        initialModules={moduleList}
        initialLessons={lessonList}
        initialResources={resourceList}
        initialBatches={batches || []}
      />
    </div>
  )
}
