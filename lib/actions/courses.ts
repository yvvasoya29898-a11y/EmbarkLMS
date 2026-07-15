"use server"

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Helper to authenticate and authorize admin
 */
async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Not authenticated')
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required')
  }
  return { supabase, user }
}

/* ==========================================================================
   COURSES CRUD
   ========================================================================== */

export async function createCourse(data: {
  title: string
  slug: string
  categories: string[]
  delivery_type: 'recorded' | 'live' | 'hybrid'
  price_inr_display: number
  sort_order?: number
  original_price_inr?: number
}) {
  try {
    const { supabase } = await checkAdmin()

    // Validate slug uniqueness or insert will fail
    const { data: course, error } = await supabase
      .from('courses')
      .insert({
        title: data.title,
        slug: data.slug.toLowerCase().trim(),
        categories: data.categories || [],
        delivery_type: data.delivery_type,
        price_inr_display: data.price_inr_display,
        sort_order: data.sort_order || 0,
        original_price_inr: data.original_price_inr || 0,
        status: 'draft',
        completion_criteria: {
          min_attendance_pct: 75,
          all_quizzes_passed: true,
          all_lessons_completed: false
        }
      })
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') {
        return { error: 'A course with this URL slug already exists.' }
      }
      return { error: error.message }
    }

    revalidatePath('/admin/courses')
    return { success: true, courseId: course.id }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Something went wrong'
    return { error: errMsg }
  }
}

export async function updateCourse(
  id: string,
  data: {
    title: string
    slug: string
    categories: string[]
    delivery_type: 'recorded' | 'live' | 'hybrid'
    price_inr_display: number
    status: 'draft' | 'published' | 'archived'
    is_popular: boolean
    completion_criteria: {
      min_attendance_pct: number
      all_quizzes_passed: boolean
      all_lessons_completed: boolean
    }
    thumbnail_url?: string | null
    highlights?: { title: string; desc: string; icon: string }[]
    instructors?: { name: string; title: string; bio: string; avatar_url?: string | null }[]
    faqs?: { question: string; answer: string }[]
    sort_order?: number
    category_sort_orders?: Record<string, number>
    original_price_inr?: number
  }
) {
  try {
    const { supabase } = await checkAdmin()

    const { error } = await supabase
      .from('courses')
      .update({
        title: data.title,
        slug: data.slug.toLowerCase().trim(),
        categories: data.categories || [],
        delivery_type: data.delivery_type,
        price_inr_display: data.price_inr_display,
        status: data.status,
        is_popular: data.is_popular,
        completion_criteria: data.completion_criteria,
        thumbnail_url: data.thumbnail_url || null,
        highlights: data.highlights || [],
        instructors: data.instructors || [],
        faqs: data.faqs || [],
        sort_order: data.sort_order !== undefined ? data.sort_order : 0,
        category_sort_orders: data.category_sort_orders || {},
        original_price_inr: data.original_price_inr !== undefined ? data.original_price_inr : 0
      })
      .eq('id', id)

    if (error) {
      if (error.code === '23505') {
        return { error: 'A course with this URL slug already exists.' }
      }
      return { error: error.message }
    }

    revalidatePath('/admin/courses')
    revalidatePath(`/admin/courses/${id}`)
    revalidatePath(`/courses/${data.slug}`)
    revalidatePath('/courses')
    return { success: true }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Something went wrong'
    return { error: errMsg }
  }
}

export async function deleteCourse(id: string) {
  try {
    const { supabase } = await checkAdmin()

    // Cascade delete on table references will handle related records
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/admin/courses')
    return { success: true }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Something went wrong'
    return { error: errMsg }
  }
}

/* ==========================================================================
   MODULES CRUD
   ========================================================================== */

export async function createModule(courseId: string, title: string, sortOrder: number) {
  try {
    const { supabase } = await checkAdmin()

    const { data: moduleData, error } = await supabase
      .from('modules')
      .insert({
        course_id: courseId,
        title,
        sort_order: sortOrder,
        drip_locked: false
      })
      .select('id')
      .single()

    if (error) {
      return { error: error.message }
    }

    revalidatePath(`/admin/courses/${courseId}`)
    return { success: true, moduleId: moduleData.id }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Something went wrong'
    return { error: errMsg }
  }
}

export async function updateModule(
  id: string,
  courseId: string,
  data: {
    title: string
    sort_order: number
    drip_locked: boolean
  }
) {
  try {
    const { supabase } = await checkAdmin()

    const { error } = await supabase
      .from('modules')
      .update({
        title: data.title,
        sort_order: data.sort_order,
        drip_locked: data.drip_locked
      })
      .eq('id', id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath(`/admin/courses/${courseId}`)
    return { success: true }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Something went wrong'
    return { error: errMsg }
  }
}

export async function deleteModule(id: string, courseId: string) {
  try {
    const { supabase } = await checkAdmin()

    const { error } = await supabase
      .from('modules')
      .delete()
      .eq('id', id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath(`/admin/courses/${courseId}`)
    return { success: true }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Something went wrong'
    return { error: errMsg }
  }
}

/* ==========================================================================
   LESSONS CRUD
   ========================================================================== */

export async function createLesson(
  courseId: string,
  moduleId: string,
  data: {
    title: string
    type: 'video' | 'notes' | 'quiz' | 'recording'
    video_url?: string | null
    content_md?: string | null
    sort_order: number
    is_free_preview: boolean
  }
) {
  try {
    const { supabase } = await checkAdmin()

    const { data: lesson, error } = await supabase
      .from('lessons')
      .insert({
        module_id: moduleId,
        title: data.title,
        type: data.type,
        video_url: data.video_url || null,
        content_md: data.content_md || null,
        sort_order: data.sort_order,
        is_free_preview: data.is_free_preview
      })
      .select('id')
      .single()

    if (error) {
      return { error: error.message }
    }

    revalidatePath(`/admin/courses/${courseId}`)
    return { success: true, lessonId: lesson.id }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Something went wrong'
    return { error: errMsg }
  }
}

export async function updateLesson(
  id: string,
  courseId: string,
  data: {
    title: string
    type: 'video' | 'notes' | 'quiz' | 'recording'
    video_url?: string | null
    content_md?: string | null
    sort_order: number
    is_free_preview: boolean
  }
) {
  try {
    const { supabase } = await checkAdmin()

    const { error } = await supabase
      .from('lessons')
      .update({
        title: data.title,
        type: data.type,
        video_url: data.video_url || null,
        content_md: data.content_md || null,
        sort_order: data.sort_order,
        is_free_preview: data.is_free_preview
      })
      .eq('id', id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath(`/admin/courses/${courseId}`)
    return { success: true }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Something went wrong'
    return { error: errMsg }
  }
}

export async function deleteLesson(id: string, courseId: string) {
  try {
    const { supabase } = await checkAdmin()

    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath(`/admin/courses/${courseId}`)
    return { success: true }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Something went wrong'
    return { error: errMsg }
  }
}

/* ==========================================================================
   RESOURCES (MATERIALS) CRUD
   ========================================================================== */

export async function createResource(
  courseId: string,
  lessonId: string,
  title: string,
  fileUrl: string
) {
  try {
    const { supabase } = await checkAdmin()

    const { error } = await supabase
      .from('resources')
      .insert({
        lesson_id: lessonId,
        title,
        file_url: fileUrl
      })

    if (error) {
      return { error: error.message }
    }

    revalidatePath(`/admin/courses/${courseId}`)
    return { success: true }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Something went wrong'
    return { error: errMsg }
  }
}

export async function deleteResource(id: string, courseId: string) {
  try {
    const { supabase } = await checkAdmin()

    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath(`/admin/courses/${courseId}`)
    return { success: true }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Something went wrong'
    return { error: errMsg }
  }
}

/* ==========================================================================
   BATCHES CREATION DIRECTLY FROM COURSE EDITOR
   ========================================================================== */

export async function createBatch(
  courseId: string,
  name: string,
  startsAt: string,
  endsAt: string,
  inviteCode: string,
  status: 'open' | 'running' | 'completed'
) {
  try {
    const { supabase } = await checkAdmin()

    const { error } = await supabase
      .from('batches')
      .insert({
        course_id: courseId,
        name,
        starts_at: startsAt || null,
        ends_at: endsAt || null,
        invite_code: inviteCode.trim() || null,
        status: status || 'open'
      })

    if (error) {
      if (error.code === '23505') {
        return { error: 'A batch with this invite code already exists.' }
      }
      return { error: error.message }
    }

    revalidatePath(`/admin/courses/${courseId}`)
    revalidatePath('/admin/batches')
    return { success: true }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Something went wrong'
    return { error: errMsg }
  }
}

export async function updateCourseSortOrder(courseId: string, sortOrder: number) {
  try {
    const { supabase } = await checkAdmin()

    const { error } = await supabase
      .from('courses')
      .update({ sort_order: sortOrder })
      .eq('id', courseId)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/admin/courses')
    revalidatePath('/')
    return { success: true }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Something went wrong'
    return { error: errMsg }
  }
}

export async function updateCourseCategorySortOrder(courseId: string, category: string, order: number) {
  try {
    const { supabase } = await checkAdmin()

    // 1. Fetch current orders JSONB
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select('category_sort_orders')
      .eq('id', courseId)
      .single()

    if (fetchError || !course) {
      return { error: fetchError?.message || 'Course not found' }
    }

    const currentOrders = (course.category_sort_orders as Record<string, number>) || {}
    const updatedOrders = {
      ...currentOrders,
      [category]: order
    }

    // 2. Persist back
    const { error: updateError } = await supabase
      .from('courses')
      .update({ category_sort_orders: updatedOrders })
      .eq('id', courseId)

    if (updateError) {
      return { error: updateError.message }
    }

    revalidatePath('/admin/courses')
    revalidatePath('/')
    return { success: true }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Something went wrong'
    return { error: errMsg }
  }
}
