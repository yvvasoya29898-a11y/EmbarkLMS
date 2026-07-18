import React from 'react'
import { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSimpleClient } from '@supabase/supabase-js'
import { formatISTDate } from '@/lib/date'
import EnrollmentCTA from './EnrollmentCTA'
import Header from '@/components/Header'
import InviteCodeForm from '@/components/InviteCodeForm'
import CurriculumAccordion from './CurriculumAccordion'
import FaqAccordion from './FaqAccordion'
import Footer from '@/components/Footer'

import {
  Brain as BrainIcon,
  GraduationCap as GraduationCapIcon,
  Cpu as CpuIcon,
  Code as CodeIcon,
  Award as AwardIcon,
  Clock as ClockIcon,
  FileDown as FileDownIcon,
  BookOpen as BookOpenIcon,
  Play as PlayIcon
} from 'lucide-react'

interface CoursePageProps {
  params: Promise<{ slug: string }>
}

interface HighlightItem {
  title: string
  desc: string
  icon: 'Brain' | 'GraduationCap' | 'Cpu' | 'Code' | 'Award'
}

interface InstructorItem {
  name: string
  title: string
  bio: string
  avatar_url?: string | null
}

interface FaqItem {
  question: string;
  answer: string;
}

const COURSE_CUSTOM_DETAILS: Record<string, {
  highlights: HighlightItem[]
  instructors: InstructorItem[]
}> = {
  'ai-for-educators': {
    highlights: [
      { title: 'AI Pedagogy', desc: 'Integrate LLMs into classroom teaching, lesson planning, and grading workflows.', icon: 'Brain' },
      { title: 'Smart Assessments', desc: 'Create auto-graded quizzes, rubrics, and feedback loops with AI tools.', icon: 'GraduationCap' },
      { title: 'Workflow Automation', desc: 'Build customized n8n automation workflows for faculty administration tasks.', icon: 'Cpu' },
      { title: 'Prompt Engineering', desc: 'Master advanced prompting (role-play, chain-of-thought) for education.', icon: 'Code' }
    ],
    instructors: [
      {
        name: 'Yogi Vasoya',
        title: 'Founder, Embark AI Institute',
        bio: 'AI researcher and educator. Helping educational institutions and faculty implement agentic AI tools, prompt engineering, and automated administrative workflows.'
      }
    ]
  }
}

const DEFAULT_CUSTOM_DETAILS = {
  highlights: [
    { title: 'Implementation-First', desc: 'Acquire real-world skills through direct code execution and workflows.', icon: 'Code' },
    { title: 'Advanced Curriculum', desc: 'Deep dive into state-of-the-art architectures and frameworks.', icon: 'Cpu' },
    { title: 'Verified Certification', desc: 'Get a validated certificate backed by completion criteria.', icon: 'Award' },
    { title: 'Expert Instruction', desc: 'Learn directly from experienced practitioners in the AI space.', icon: 'GraduationCap' }
  ] as HighlightItem[],
  instructors: [
    {
      name: 'Yogi Vasoya',
      title: 'Founder, Embark AI Institute',
      bio: 'AI researcher and educator. Helping educational institutions and faculty implement agentic AI tools, prompt engineering, and automated administrative workflows.'
    }
  ] as InstructorItem[]
}

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('courses')
    .select('title, description, thumbnail_url')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!course) {
    return {
      title: 'Course Not Found — Embark LMS',
    }
  }

  const title = `${course.title} — Embark LMS`
  const description = course.description || 'Learn AI and technology courses with practical workflows.'
  
  let imageUrl = 'https://embarkai.in/Logo.png'
  if (course.thumbnail_url) {
    if (course.thumbnail_url.startsWith('http')) {
      imageUrl = course.thumbnail_url
    } else {
      imageUrl = `https://embarkai.in${course.thumbnail_url.startsWith('/') ? '' : '/'}${course.thumbnail_url}`
    }
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: imageUrl,
          alt: course.title,
        }
      ],
      type: 'article',
      url: `https://embarkai.in/courses/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    }
  }
}

export const revalidate = 600 // Cache landing page for 10 minutes

export async function generateStaticParams() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables are missing during build. Skipping static page generation for courses.')
    return []
  }

  try {
    const supabase = createSimpleClient(supabaseUrl, supabaseAnonKey)
    const { data: courses, error } = await supabase
      .from('courses')
      .select('slug')
      .eq('status', 'published')

    if (error) {
      console.error('Failed to fetch courses for generateStaticParams:', error)
      return []
    }

    return (courses || []).map((course) => ({
      slug: course.slug,
    }))
  } catch (err) {
    console.error('Error during generateStaticParams:', err)
    return []
  }
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // 1. Fetch course details
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, description, slug, price_inr_display, original_price_inr, thumbnail_url, delivery_type, status, completion_criteria, is_popular, sort_order, categories, category_sort_orders, faqs, highlights, instructors, created_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (courseError || !course) {
    notFound()
  }

  // 2. Fetch modules
  const { data: modules } = await supabase
    .from('modules')
    .select('id, title, sort_order, drip_locked')
    .eq('course_id', course.id)
    .order('sort_order', { ascending: true })

  const moduleIds = (modules || []).map((m) => m.id)

  // 3. Fetch lessons
  let lessons: Array<{
    id: string
    module_id: string
    title: string
    type: 'video' | 'notes' | 'quiz' | 'recording'
    sort_order: number
    is_free_preview: boolean
    video_url: string | null
    content_md: string | null
  }> = []
  if (moduleIds.length > 0) {
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('id, module_id, title, type, sort_order, is_free_preview, video_url, content_md')
      .in('module_id', moduleIds)
      .order('sort_order', { ascending: true })
    lessons = lessonsData || []
  }

  // 4. Fetch earliest open batch
  const { data: batches } = await supabase
    .from('batches')
    .select('id, name, starts_at, ends_at, status')
    .eq('course_id', course.id)
    .in('status', ['open', 'running'])
    .order('starts_at', { ascending: true })
    .limit(1)

  const earliestBatch = batches?.[0]

  // 5. Fetch live sessions for that batch (explicit columns, EXCLUDING meeting_url)
  let liveSessions: Array<{
    id: string
    title: string
    description: string | null
    starts_at: string
    duration_min: number
    status: 'upcoming' | 'live' | 'completed'
  }> = []

  if (earliestBatch) {
    const { data: sessions } = await supabase
      .from('live_sessions')
      .select('id, title, description, starts_at, duration_min, status')
      .eq('batch_id', earliestBatch.id)
      .order('starts_at', { ascending: true })
    
    liveSessions = sessions || []
  }

  // 6. Fetch current user, profile, request status, and enrollment status
  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  let isEnrolled = false
  let pendingRequest = null

  if (user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, phone')
      .eq('id', user.id)
      .single()
    profile = profileData

    // Check if enrolled
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .is('revoked_at', null)
      .limit(1)
    isEnrolled = !!(enrollments && enrollments.length > 0)

    // Check for open request
    const { data: requests } = await supabase
      .from('enrollment_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .in('status', ['new', 'contacted', 'paid'])
      .order('created_at', { ascending: false })
      .limit(1)
    pendingRequest = requests?.[0]
  }

  // 7. Format completion criteria
  const criteria = course.completion_criteria as {
    min_attendance_pct?: number
    all_quizzes_passed?: boolean
    all_lessons_completed?: boolean
  }
  const criteriaList: string[] = []
  if (criteria?.min_attendance_pct && criteria.min_attendance_pct > 0) {
    criteriaList.push(`≥${criteria.min_attendance_pct}% live attendance`)
  }
  if (criteria?.all_quizzes_passed) {
    criteriaList.push('all quizzes passed')
  }
  if (criteria?.all_lessons_completed) {
    criteriaList.push('all lessons completed')
  }
  const criteriaText = criteriaList.length > 0 ? criteriaList.join(' + ') : 'completion'

  // Group lessons by module_id
  const lessonsByModule: Record<string, typeof lessons> = {}
  lessons.forEach((l) => {
    if (!lessonsByModule[l.module_id]) {
      lessonsByModule[l.module_id] = []
    }
    lessonsByModule[l.module_id].push(l)
  })

  // Load branding details dynamically from database if present, otherwise fall back to static/default mapping
  const courseRecord = course as unknown as {
    highlights?: HighlightItem[] | null
    instructors?: InstructorItem[] | null
    faqs?: FaqItem[] | null
  }
  
  const customDetails = COURSE_CUSTOM_DETAILS[course.slug] || DEFAULT_CUSTOM_DETAILS

  const highlights = (courseRecord.highlights && courseRecord.highlights.length > 0)
    ? courseRecord.highlights
    : customDetails.highlights

  const instructors = (courseRecord.instructors && courseRecord.instructors.length > 0)
    ? courseRecord.instructors
    : customDetails.instructors

  const faqs = (courseRecord.faqs && courseRecord.faqs.length > 0)
    ? courseRecord.faqs
    : null

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between relative overflow-hidden font-body">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <Header user={user} />

      {/* Immersive Split-Hero Header */}
      <div className="bg-slate-950 text-white relative py-16 px-6 overflow-hidden border-b border-slate-900">
        {/* Background glow decoration */}
        <div className="absolute -top-48 -left-48 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none animate-pulse duration-[8000ms]" />
        <div className="absolute -bottom-48 -right-48 w-96 h-96 bg-primary-light/10 rounded-full blur-3xl pointer-events-none animate-pulse duration-[8000ms]" />

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
          {/* Hero text */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                course.delivery_type === 'hybrid'
                  ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                  : course.delivery_type === 'live'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
              }`}>
                {course.delivery_type}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Verified certificate on completion
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white font-display">
              {course.title}
            </h1>
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed whitespace-pre-wrap max-w-2xl">
              {course.description}
            </p>
            {/* Quick badges info */}
            <div className="flex flex-wrap gap-4 pt-2 text-xs font-medium text-slate-400">
              <span className="flex items-center gap-1.5">
                🎓 {criteriaText}
              </span>
              {earliestBatch && (
                <span className="flex items-center gap-1.5">
                  🗓 Next batch: {formatISTDate(earliestBatch.starts_at, { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          </div>

          {/* Hero Thumbnail / Preview mockup */}
          <div className="lg:col-span-5 relative group w-full">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary-light rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition duration-1000" />
            <div className="relative aspect-video lg:aspect-4/3 w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
              {course.thumbnail_url ? (
                <Image
                  src={course.thumbnail_url}
                  alt={course.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-103"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
              ) : (
                <span className="text-8xl select-none font-display uppercase tracking-widest text-white/10 group-hover:text-white/15 transition-colors">
                  {course.title.slice(0, 2)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* Left Column: Highlights, Curriculum, Live schedule, Instructors, FAQ */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Key Highlights Grid */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary rounded-full" />
              What you will learn
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {highlights.map((highlight, idx) => {
                const IconComponent = {
                  Brain: BrainIcon,
                  GraduationCap: GraduationCapIcon,
                  Cpu: CpuIcon,
                  Code: CodeIcon,
                  Award: AwardIcon
                }[highlight.icon] || CodeIcon

                return (
                  <div key={idx} className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-3xs flex gap-4 transition-all hover:border-slate-350 hover:shadow-2xs">
                    <div className="p-3 bg-slate-50 text-primary border border-slate-100 rounded-xl h-fit">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-800">{highlight.title}</h4>
                      <p className="text-[11px] font-medium text-slate-500 leading-relaxed">{highlight.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Unified Learning Path Curriculum */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full" />
                Learning Path Roadmap
              </h3>
              <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                Step-by-step roadmap combining self-paced recorded modules and scheduled live classes.
              </p>
            </div>
            <CurriculumAccordion
              modules={modules || []}
              lessonsByModule={lessonsByModule}
              isEnrolled={isEnrolled}
              liveSessions={liveSessions}
            />
          </div>

          {/* Meet Your Instructors Section */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary rounded-full" />
              Meet your instructors
            </h3>
            <div className="space-y-4">
              {instructors.map((inst, idx) => (
                <div key={idx} className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-3xs flex flex-col sm:flex-row gap-5 items-start transition-all hover:border-slate-350">
                  {inst.avatar_url && inst.avatar_url.trim().length > 0 ? (
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-sm shrink-0 relative border border-slate-150 bg-slate-50">
                      <Image src={inst.avatar_url} alt={inst.name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white text-xl font-bold font-display select-none shadow-sm shrink-0">
                      {inst.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  )}
                  <div className="space-y-2 flex-1">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">{inst.name}</h4>
                      <p className="text-[10px] font-bold text-primary tracking-wide uppercase mt-0.5">{inst.title}</p>
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                      {inst.bio}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Frequently Asked Questions */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary rounded-full" />
              Frequently asked questions
            </h3>
            <FaqAccordion faqs={faqs} />
          </div>

        </div>

        {/* Right Column: Pricing & Sticky Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 lg:sticky lg:top-24">
            {/* Price block */}
            {/* Price block */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-2.5">
                <div className="text-3xl font-extrabold text-slate-900 font-display">
                  {course.price_inr_display === 0 ? (
                    <span className="text-emerald-600 font-extrabold">Free</span>
                  ) : (
                    `₹${course.price_inr_display.toLocaleString('en-IN')}`
                  )}
                </div>
                {course.price_inr_display > 0 && course.original_price_inr && course.original_price_inr > course.price_inr_display && (
                  <div className="text-sm font-semibold text-slate-400 line-through font-mono">
                    ₹{course.original_price_inr.toLocaleString('en-IN')}
                  </div>
                )}
              </div>

              {course.price_inr_display > 0 && (
                <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200/40 py-1.5 px-3 rounded-xl w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                  <span>
                    {course.original_price_inr && course.original_price_inr > course.price_inr_display
                      ? `🔥 Limited Time Offer: Save ${Math.round(((course.original_price_inr - course.price_inr_display) / course.original_price_inr) * 100)}% today!`
                      : '⏳ Limited slots left! Price rises soon.'}
                  </span>
                </div>
              )}

              <p className="text-slate-400 text-xs font-medium font-body leading-relaxed pt-1">
                {course.price_inr_display === 0
                  ? 'Complimentary access · lifetime self-paced learning'
                  : course.delivery_type === 'recorded'
                    ? 'One-time payment · includes lifetime access'
                    : 'One-time payment · includes live batch + lifetime recorded access'}
              </p>
            </div>

            {/* Action Buttons (CTA) */}
            <EnrollmentCTA
              courseId={course.id}
              courseSlug={course.slug}
              userLoggedIn={!!user}
              hasPhone={!!profile?.phone}
              isEnrolled={isEnrolled}
              pendingRequestStatus={pendingRequest?.status || null}
              isFree={course.price_inr_display === 0}
            />

            {/* Call SLA info */}
            {course.price_inr_display === 0 ? (
              <div className="border-t border-slate-100 pt-4 flex gap-3 text-slate-500 text-[11px] leading-relaxed font-medium">
                <span className="text-base leading-none">✨</span>
                <span>
                  This is a complimentary program. Get instant lifetime access to all learning materials with no payment or phone calls required.
                </span>
              </div>
            ) : (
              <div className="border-t border-slate-100 pt-4 flex gap-3 text-slate-500 text-[11px] leading-relaxed font-medium">
                <span className="text-base leading-none">📞</span>
                <span>
                  Our team will call you within 24 hours on your registered phone number to complete enrollment and offline payment (UPI / bank transfer).
                </span>
              </div>
            )}

            {/* List of features */}
            <div className="border-t border-slate-100 pt-4 space-y-3.5 text-xs font-semibold text-slate-650">
              {course.delivery_type !== 'recorded' && liveSessions.length > 0 ? (
                <div className="flex items-center gap-2.5">
                  <ClockIcon className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{liveSessions.length} live sessions (55 min each)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <BookOpenIcon className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Self-paced, study at your own time</span>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <PlayIcon className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Lifetime access to recorded lessons</span>
              </div>
              <div className="flex items-center gap-2.5">
                <AwardIcon className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="capitalize">Verified certificate ({criteriaText})</span>
              </div>
              <div className="flex items-center gap-2.5">
                <FileDownIcon className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Downloadable coding resources & files</span>
              </div>
            </div>
          </div>

          {/* Cohort Invite Card */}
          {!isEnrolled && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-500 space-y-2.5 mt-6 shadow-3xs">
              <div className="font-bold text-slate-850 uppercase tracking-wider">Have a cohort invite code?</div>
              <p className="leading-relaxed font-medium text-slate-550">
                If your university or institution is sponsoring your cohort, enter your code below to claim direct batch access.
              </p>
              <InviteCodeForm onSuccessRedirect={true} />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
