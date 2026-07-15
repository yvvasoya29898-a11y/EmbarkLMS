import React from 'react'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCourseProgress, calculateModuleLocks } from '@/lib/progress'

interface CourseLearnEntryPageProps {
  params: Promise<{ courseSlug: string }>
}

export default async function CourseLearnEntryPage({ params }: CourseLearnEntryPageProps) {
  const { courseSlug } = await params
  const supabase = await createClient()

  // 1. Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // 2. Fetch course details
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, slug, delivery_type, description')
    .eq('slug', courseSlug)
    .single()

  if (courseError || !course) {
    notFound()
  }

  // 3. Verify enrollment in course
  const { data: enrollment, error: enrollError } = await supabase
    .from('enrollments')
    .select('id, batches(name)')
    .eq('user_id', user.id)
    .eq('course_id', course.id)
    .is('revoked_at', null)
    .maybeSingle()

  if (enrollError || !enrollment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 text-slate-800 font-body">
        <div className="max-w-md text-center bg-white border border-slate-200 p-8 rounded-2xl shadow-xs space-y-4">
          <div className="text-4xl">🔒</div>
          <h2 className="text-lg font-bold text-slate-900 font-display">Access Denied</h2>
          <p className="text-xs text-slate-500">
            You must be enrolled in this course to access the curriculum.
          </p>
          <Link
            href="/courses"
            className="inline-block bg-primary hover:bg-primary-light text-white text-xs font-bold py-2 px-4 rounded-xl transition-all shadow-2xs"
          >
            Browse Catalog
          </Link>
        </div>
      </div>
    )
  }

  const batch = Array.isArray(enrollment.batches) ? enrollment.batches[0] : enrollment.batches
  const batchName = batch?.name || 'Cohort Batch'

  // 4. Fetch all modules and lessons ordered by sort_orders
  const { data: modules, error: modulesError } = await supabase
    .from('modules')
    .select('id, title, sort_order, drip_locked')
    .eq('course_id', course.id)
    .order('sort_order', { ascending: true })

  if (modulesError || !modules || modules.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 text-slate-855 font-body">
        <div className="max-w-md text-center bg-white border border-slate-200 p-8 rounded-2xl shadow-xs">
          <h3 className="text-base font-bold text-slate-900 font-display">Curriculum coming soon</h3>
          <p className="text-xs text-slate-500 mt-2">
            Modules and lessons are currently being structured for this course. Please check back later.
          </p>
          <Link href="/dashboard" className="text-primary text-xs font-bold underline mt-4 inline-block">
            Go to dashboard
          </Link>
        </div>
      </div>
    )
  }

  const moduleIds = modules.map((m) => m.id)
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, module_id, sort_order, type, is_free_preview')
    .in('module_id', moduleIds)
    .order('sort_order', { ascending: true })

  const lessonsList = lessons || []

  // 5. Fetch completed progress
  const { data: progress } = await supabase
    .from('progress')
    .select('lesson_id')
    .eq('user_id', user.id)

  const completedSet = new Set((progress || []).map((p) => p.lesson_id))
  const progressPercent = await getCourseProgress(user.id, course.id)
  const moduleLocks = calculateModuleLocks(modules || [], lessonsList, completedSet)

  // 6. Find next lesson
  const sortedLessons = [...lessonsList].sort((a, b) => {
    const moduleOrderMap = new Map<string, number>()
    modules.forEach((m, idx) => moduleOrderMap.set(m.id, idx))
    const aModIdx = moduleOrderMap.get(a.module_id) ?? 0
    const bModIdx = moduleOrderMap.get(b.module_id) ?? 0
    if (aModIdx !== bModIdx) return aModIdx - bModIdx
    return a.sort_order - b.sort_order
  })
  const nextLesson = sortedLessons.find((l) => !completedSet.has(l.id))

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between font-body">
      {/* Header navbar */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center text-xs">
          <Link
            href="/dashboard"
            className="font-bold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1"
          >
            ← {course.title} · <span className="text-slate-400 font-semibold">{course.delivery_type === 'recorded' ? 'Self-paced' : batchName}</span>
          </Link>

          <div className="font-bold text-slate-500">
            Progress:{' '}
            <span className="text-primary font-extrabold text-sm font-mono">
              {progressPercent}%
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200/80 text-xs font-semibold text-slate-400 gap-6">
          <span className="py-2.5 text-primary border-b-2 border-primary select-none font-bold">
            Roadmap / Curriculum
          </span>
          {course.delivery_type !== 'recorded' && (
            <Link href={`/learn/${courseSlug}/live`} className="py-2.5 hover:text-slate-600">
              Live Classes
            </Link>
          )}
        </div>

        {/* Progress gauge card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1.5 w-full sm:max-w-md">
            <h2 className="text-sm font-bold text-slate-900 font-display">Your Learning Journey</h2>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-455 font-bold font-mono">
              {completedSet.size} of {sortedLessons.length} lessons completed
            </p>
          </div>

          {nextLesson ? (
            <Link
              href={`/learn/${courseSlug}/lesson/${nextLesson.id}`}
              className="bg-primary hover:bg-primary-light text-white text-xs font-bold py-2.5 px-5 rounded-xl transition-all shadow-xs shrink-0"
            >
              Continue Learning →
            </Link>
          ) : (
            <Link
              href={`/learn/${courseSlug}/completion`}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-5 rounded-xl transition-all shadow-xs shrink-0"
            >
              Claim Certificate 🎓
            </Link>
          )}
        </div>

        {/* Roadmap Timeline */}
        <div className="space-y-6">
          {modules.map((mod, modIdx) => {
            const modLessons = sortedLessons.filter((l) => l.module_id === mod.id)
            const completedModLessons = modLessons.filter((l) => completedSet.has(l.id))
            const isModuleCompleted = modLessons.length > 0 && completedModLessons.length === modLessons.length

            return (
              <div key={mod.id} className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
                {/* Module Header */}
                <div className="bg-slate-50/50 border-b border-slate-100 p-4 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Module {modIdx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 font-display">
                      {mod.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {moduleLocks[mod.id] && (
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">
                        🔒 Drip Locked
                      </span>
                    )}
                    {isModuleCompleted && (
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded font-body">
                        ✓ Completed
                      </span>
                    )}
                  </div>
                </div>

                {/* Lessons list */}
                <div className="divide-y divide-slate-100">
                  {modLessons.length > 0 ? (
                    modLessons.map((lesson, lessonIdx) => {
                      const isCompleted = completedSet.has(lesson.id)
                      const isActive = nextLesson?.id === lesson.id

                      return (
                        <div
                          key={lesson.id}
                          className={`p-4 flex items-center justify-between gap-4 transition-colors ${
                            isActive ? 'bg-primary/5' : 'hover:bg-slate-50/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Visual Bullet dot */}
                            <div className="shrink-0">
                              {isCompleted ? (
                                <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold font-body">
                                  ✓
                                </div>
                              ) : isActive ? (
                                <div className="w-5 h-5 rounded-full border-2 border-primary animate-pulse flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-400 font-mono">
                                  {lessonIdx + 1}
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-800 truncate">
                                {lesson.title}
                              </h4>
                              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                                Format: {lesson.type}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {moduleLocks[mod.id] && !lesson.is_free_preview ? (
                              <button
                                disabled
                                className="bg-slate-100 text-slate-400 text-[10px] font-bold py-1.5 px-3 rounded-lg cursor-not-allowed"
                              >
                                🔒 Locked
                              </button>
                            ) : (
                              <Link
                                href={`/learn/${courseSlug}/lesson/${lesson.id}`}
                                className={`text-[10px] font-bold py-1.5 px-3.5 rounded-lg transition-all ${
                                  isCompleted
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-body'
                                    : isActive
                                      ? 'bg-primary hover:bg-primary-light text-white shadow-3xs font-body'
                                      : 'bg-slate-800 hover:bg-slate-900 text-white font-body'
                                }`}
                              >
                                {isCompleted ? 'Review' : isActive ? 'Resume' : 'Start'}
                              </Link>
                            )}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="p-4 text-slate-400 italic text-xs text-center">
                      No lessons available in this module yet.
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 px-6 text-center text-xs text-slate-455">
        <p>© {new Date().getFullYear()} Embark AI Institute. All rights reserved.</p>
      </footer>
    </div>
  )
}
