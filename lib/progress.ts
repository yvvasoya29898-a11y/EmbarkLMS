import { createClient } from '@/lib/supabase/server'

/**
 * Computes completion percentage of lessons inside a course for a user
 */
export async function getCourseProgress(userId: string, courseId: string): Promise<number> {
  const supabase = await createClient()

  // 1. Fetch all modules of this course
  const { data: modules } = await supabase
    .from('modules')
    .select('id')
    .eq('course_id', courseId)

  if (!modules || modules.length === 0) return 0
  const moduleIds = modules.map((m) => m.id)

  // 2. Fetch all lessons in these modules
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id')
    .in('module_id', moduleIds)

  if (!lessons || lessons.length === 0) return 0
  const lessonIds = lessons.map((l) => l.id)

  // 3. Count completed lessons
  const { count } = await supabase
    .from('progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('lesson_id', lessonIds)

  return Math.round(((count || 0) / lessons.length) * 100)
}

/**
 * Computes completion percentage of lessons inside multiple courses for a user in bulk
 */
export async function getBulkCourseProgress(userId: string, courseIds: string[]): Promise<Record<string, number>> {
  if (courseIds.length === 0) return {}
  const supabase = await createClient()

  // 1. Fetch all modules for these courses
  const { data: allModules } = await supabase
    .from('modules')
    .select('id, course_id')
    .in('course_id', courseIds)

  if (!allModules || allModules.length === 0) {
    const result: Record<string, number> = {}
    courseIds.forEach(id => result[id] = 0)
    return result
  }

  const moduleToCourseMap = new Map<string, string>()
  const moduleIds: string[] = []
  allModules.forEach((m) => {
    moduleToCourseMap.set(m.id, m.course_id)
    moduleIds.push(m.id)
  })

  // 2. Fetch all lessons in these modules
  const { data: allLessons } = await supabase
    .from('lessons')
    .select('id, module_id')
    .in('module_id', moduleIds)

  if (!allLessons || allLessons.length === 0) {
    const result: Record<string, number> = {}
    courseIds.forEach(id => result[id] = 0)
    return result
  }

  const courseLessonsCount = new Map<string, number>()
  const lessonToCourseMap = new Map<string, string>()
  const lessonIds: string[] = []

  allLessons.forEach((l) => {
    const cid = moduleToCourseMap.get(l.module_id)
    if (cid) {
      courseLessonsCount.set(cid, (courseLessonsCount.get(cid) || 0) + 1)
      lessonToCourseMap.set(l.id, cid)
      lessonIds.push(l.id)
    }
  })

  // 3. Count completed lessons for these lessons
  const { data: allCompleted } = await supabase
    .from('progress')
    .select('lesson_id')
    .eq('user_id', userId)
    .in('lesson_id', lessonIds)

  const courseCompletedCount = new Map<string, number>()
  allCompleted?.forEach((c) => {
    const cid = lessonToCourseMap.get(c.lesson_id)
    if (cid) {
      courseCompletedCount.set(cid, (courseCompletedCount.get(cid) || 0) + 1)
    }
  })

  // Calculate percentages
  const results: Record<string, number> = {}
  courseIds.forEach((cid) => {
    const total = courseLessonsCount.get(cid) || 0
    if (total === 0) {
      results[cid] = 0
    } else {
      const completed = courseCompletedCount.get(cid) || 0
      results[cid] = Math.round((completed / total) * 100)
    }
  })

  return results
}

interface ModuleDripItem {
  id: string
  sort_order: number
  drip_locked: boolean
}

interface LessonDripItem {
  id: string
  module_id: string
}

/**
 * Calculates drip lock evaluations for each module.
 * A drip_locked module is locked if the previous module (by sort_order)
 * is not 100% complete for this user (i.e. contains lessons and not all are completed).
 */
export function calculateModuleLocks<
  M extends ModuleDripItem,
  L extends LessonDripItem
>(
  modules: M[],
  lessons: L[],
  completedLessonIds: Set<string>
): Record<string, boolean> {
  const sortedModules = [...modules].sort((a, b) => a.sort_order - b.sort_order)
  const lessonsByModule: Record<string, L[]> = {}
  lessons.forEach((l) => {
    if (!lessonsByModule[l.module_id]) {
      lessonsByModule[l.module_id] = []
    }
    lessonsByModule[l.module_id].push(l)
  })

  const moduleLocks: Record<string, boolean> = {}
  sortedModules.forEach((m, idx) => {
    if (m.drip_locked && idx > 0) {
      const prevMod = sortedModules[idx - 1]
      const prevLessons = lessonsByModule[prevMod.id] || []
      
      // Locked if there are lessons in the previous module and not all of them are completed
      const allPrevCompleted =
        prevLessons.length > 0 &&
        prevLessons.every((l) => completedLessonIds.has(l.id))
      moduleLocks[m.id] = !allPrevCompleted
    } else {
      moduleLocks[m.id] = false
    }
  })

  return moduleLocks
}

