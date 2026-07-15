import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import Footer from '@/components/Footer'

export const revalidate = 3600 // Cache homepage catalog for 1 hour
import { formatISTDate } from '@/lib/date'
import CountdownTimer from '@/components/CountdownTimer'
import DownloadAppButton from '@/components/DownloadAppButton'
import { COURSE_CATEGORIES } from '@/lib/constants'

interface HomePageProps {
  searchParams: Promise<{ category?: string }>
}

export default async function Home({ searchParams }: HomePageProps) {
  const resolvedParams = await searchParams
  const category = resolvedParams.category || ''

  const supabase = await createClient()

  // 1. Fetch user (for navbar state)
  const { data: { user } } = await supabase.auth.getUser()

  // 2. Fetch courses
  let query = supabase
    .from('courses')
    .select(`
      id,
      slug,
      title,
      description,
      categories,
      delivery_type,
      price_inr_display,
      original_price_inr,
      thumbnail_url,
      created_at,
      sort_order,
      category_sort_orders
    `)
    .eq('status', 'published')

  if (!category || category === 'Popular') {
    // Default/Popular view: Show only popular courses
    query = query.eq('is_popular', true)
  } else {
    // Dedicated category tab: Show all courses under this category
    query = query.contains('categories', [category])
  }

  const { data: courses, error } = await query

  if (error) {
    console.error('Error fetching courses:', error)
  }

  // Tab-specific sequencing overrides sorting logic
  const sortedCourses = (courses || []).sort((a, b) => {
    const ordersA = (a.category_sort_orders as Record<string, number>) || {}
    const ordersB = (b.category_sort_orders as Record<string, number>) || {}

    // Check if category override exists
    const orderA = category && category !== 'Popular' ? (ordersA[category] ?? a.sort_order ?? 0) : (a.sort_order ?? 0)
    const orderB = category && category !== 'Popular' ? (ordersB[category] ?? b.sort_order ?? 0) : (b.sort_order ?? 0)

    if (orderA !== orderB) {
      return orderA - orderB
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  // 3. Fetch earliest open batch for each course to display next batch date in a single query
  const cohortCourseIds = sortedCourses
    .filter((c) => c.delivery_type !== 'recorded')
    .map((c) => c.id)

  const batchMap = new Map<string, string>()

  if (cohortCourseIds.length > 0) {
    const { data: allOpenBatches } = await supabase
      .from('batches')
      .select('course_id, starts_at')
      .in('course_id', cohortCourseIds)
      .eq('status', 'open')
      .order('starts_at', { ascending: true })

    allOpenBatches?.forEach((b) => {
      if (!batchMap.has(b.course_id)) {
        batchMap.set(b.course_id, b.starts_at)
      }
    })
  }

  const coursesWithBatchDate = sortedCourses.map((course) => {
    if (course.delivery_type === 'recorded') {
      return { ...course, nextBatchDate: 'Self-paced', rawNextBatchDate: null }
    }

    const earliestStart = batchMap.get(course.id)
    const nextBatchDate = earliestStart
      ? `Next batch: ${formatISTDate(earliestStart, { day: 'numeric', month: 'short' })}`
      : 'Next batch: TBD'
    const rawNextBatchDate = earliestStart || null

    return { ...course, nextBatchDate, rawNextBatchDate }
  })

  const categories = [
    'Popular',
    ...COURSE_CATEGORIES
  ]

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between relative overflow-hidden font-body selection:bg-primary/20 selection:text-primary-dark">
      {/* Brand-aligned soft ambient light effects */}
      <div className="absolute top-[-10%] left-[-5%] w-[550px] h-[550px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[450px] h-[450px] bg-primary-light/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Modern thin line grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_80%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-100 bg-white/70 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0">
            <Image src="/Logo.svg" alt="Embark AI" width={112} height={28} priority className="h-7 sm:h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden md:block">
              <DownloadAppButton />
            </div>
            <Link href="/courses" className="text-[10px] sm:text-xs font-bold text-primary uppercase tracking-wider font-mono">
              Courses
            </Link>
            <Link href="/community" className="text-[10px] sm:text-xs font-bold text-slate-655 hover:text-primary transition-colors uppercase tracking-wider font-mono">
              Community
            </Link>
            {user ? (
              <Link
                href="/dashboard"
                className="bg-primary hover:bg-primary-light text-white font-bold py-1.5 px-3 sm:py-2 sm:px-5 rounded-xl text-[10px] sm:text-xs transition-all duration-200 shadow-xs hover:scale-[1.02] cursor-pointer shrink-0"
              >
                My Dashboard
              </Link>
            ) : (
              <>
                <Link href="/auth/login" className="text-[10px] sm:text-xs font-bold text-slate-655 hover:text-primary transition-colors uppercase tracking-wider font-mono">
                  Log in
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-primary hover:bg-primary-light text-white font-bold py-1.5 px-3 sm:py-2 sm:px-5 rounded-xl text-[10px] sm:text-xs transition-all duration-200 shadow-xs hover:scale-[1.02] cursor-pointer shrink-0"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 md:py-16 relative z-10 space-y-12">
        
        {/* Page Hero Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 border border-primary/20 bg-primary/5 text-primary text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Popular Programs
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-955 font-display">
            Our{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-dark via-primary to-primary-light font-display">
              Featured Syllabus
            </span>
          </h1>
          <p className="text-slate-500 text-sm max-w-2xl leading-relaxed">
            Select a program track below. Explore our most popular, hands-on syllabus formats built for lifelong learning and practical workflows.
          </p>
        </div>

        {/* Category Pill Filters */}
        <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-100">
          {categories.map((cat) => {
            const active = (!category && cat === 'Popular') || category === cat
            const href = cat === 'Popular' ? '?' : `?category=${encodeURIComponent(cat)}`
            return (
              <Link
                key={cat}
                href={href}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  active
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-350 hover:bg-slate-50'
                }`}
              >
                {cat}
              </Link>
            )
          })}
        </div>

        {/* Courses Grid / Error / Empty State */}
        {error ? (
          /* Error State */
          <div className="border border-rose-200 rounded-3xl p-16 text-center bg-rose-50/30 shadow-xs max-w-lg mx-auto">
            <div className="text-5xl mb-4">⚠️</div>
            <h3 className="text-lg font-bold text-rose-800 mb-2 font-display">Failed to load courses</h3>
            <p className="text-slate-600 text-xs mb-6">
              An error occurred while loading the courses: {error.message || 'Unknown database error'}.
            </p>
            <Link
              href="/"
              className="inline-block bg-primary hover:bg-primary-light text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all shadow-xs"
            >
              Retry Loading Catalog
            </Link>
          </div>
        ) : coursesWithBatchDate.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coursesWithBatchDate.map((course) => {
              const badgeStyles = ({
                hybrid: 'bg-sky-50 text-sky-700 border border-sky-100',
                live: 'bg-rose-50 text-rose-700 border border-rose-100',
                recorded: 'bg-slate-100 text-slate-700 border border-slate-200'
              } as Record<string, string>)[course.delivery_type]

              return (
                <div key={course.id} className="bg-card border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col justify-between hover:translate-y-[-2px]">
                  {/* Thumbnail / Gradient image */}
                  <div className="relative h-44 bg-gradient-to-br from-slate-800 to-primary-dark flex items-center justify-center text-white/5 font-bold overflow-hidden border-b border-slate-250/20">
                    {course.thumbnail_url ? (
                      <Image
                        src={course.thumbnail_url}
                        alt={course.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <span className="text-8xl select-none font-display uppercase tracking-widest">
                        {course.title.slice(0, 2)}
                      </span>
                    )}
                    {/* Delivery type absolute badge */}
                    <div className="absolute top-4 left-4">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-xs ${badgeStyles}`}>
                        {course.delivery_type}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug font-display hover:text-primary transition-colors">
                        <Link href={`/courses/${course.slug}`}>{course.title}</Link>
                      </h3>
                      <p className="text-slate-500 text-[11px] leading-relaxed mt-1 line-clamp-2">
                        {course.description}
                      </p>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-slate-400 mb-3 flex flex-col gap-1.5 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {course.nextBatchDate}
                        </div>
                        {course.rawNextBatchDate && (
                          <CountdownTimer targetDate={course.rawNextBatchDate} />
                        )}
                      </div>

                      <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-extrabold text-slate-900 font-display">
                            {course.price_inr_display === 0 ? (
                              <span className="text-emerald-600 font-bold text-xs uppercase tracking-wider bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md font-body">Free</span>
                            ) : (
                              `₹${course.price_inr_display.toLocaleString('en-IN')}`
                            )}
                          </span>
                          {course.price_inr_display > 0 && course.original_price_inr && course.original_price_inr > course.price_inr_display && (
                            <span className="text-[11px] font-semibold text-slate-400 line-through font-mono">
                              ₹{course.original_price_inr.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/courses/${course.slug}`}
                          className="bg-primary hover:bg-primary-light text-white text-xs font-bold py-2 px-4 rounded-lg transition-all duration-150 shadow-2xs cursor-pointer"
                        >
                          Explore Syllabus
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="border border-dashed border-slate-200 rounded-3xl p-16 text-center bg-card shadow-xs max-w-lg mx-auto">
            <div className="text-5xl mb-4">🎓</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2 font-display">No courses found</h3>
            <p className="text-slate-500 text-xs mb-6">
              There are no courses matching &quot;{category || 'published'}&quot; at the moment. Check back soon!
            </p>
            <Link
              href="/"
              className="inline-block bg-primary hover:bg-primary-light text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all shadow-xs"
            >
              Reset Filters
            </Link>
          </div>
        )}

      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
