"use client"

import React, { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { markLessonComplete } from '@/lib/actions/progress'
import { useToast } from '@/components/ToastProvider'

export interface LessonOutlineItem {
  id: string
  title: string
  type: 'video' | 'notes' | 'quiz' | 'recording'
  is_completed: boolean
}

export interface ModuleOutlineItem {
  module_id: string
  module_title: string
  is_locked: boolean
  lessons: LessonOutlineItem[]
}

export interface ResourceItem {
  id: string
  title: string
  file_url: string
}

export interface QuestionItem {
  id: string
  body: string
  options: string[]
}

export interface QuizItem {
  id: string
  pass_pct: number
  max_attempts: number
  questions: QuestionItem[]
}

export interface QuizAttemptItem {
  id: string
  score_pct: number
  attempted_at: string
}

export interface LessonItem {
  id: string
  title: string
  type: 'video' | 'notes' | 'quiz' | 'recording'
  video_url: string | null
  content_md: string | null
  module_id: string
}

interface LessonPlayerClientProps {
  courseSlug: string
  courseTitle: string
  currentLesson: LessonItem
  outline: ModuleOutlineItem[]
  resources: ResourceItem[]
  quiz: QuizItem | null
  quizAttempts: QuizAttemptItem[]
  progressPercent: number
}

function getYouTubeEmbedUrl(url: string | null): string {
  if (!url) return ''
  let videoId = ''
  try {
    if (url.includes('youtube.com/watch')) {
      const parsed = new URL(url)
      videoId = parsed.searchParams.get('v') || ''
    } else if (url.includes('youtu.be/')) {
      const parts = url.split('youtu.be/')
      videoId = parts[1]?.split('?')[0] || ''
    } else if (url.includes('youtube.com/embed/')) {
      const parts = url.split('youtube.com/embed/')
      videoId = parts[1]?.split('?')[0] || ''
    }
  } catch (e) {
    console.error('Error parsing YouTube URL:', e)
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0` : ''
}

function getYouTubeVideoId(url: string | null): string | null {
  if (!url) return null
  let videoId = ''
  try {
    if (url.includes('youtube.com/watch')) {
      const parsed = new URL(url)
      videoId = parsed.searchParams.get('v') || ''
    } else if (url.includes('youtu.be/')) {
      const parts = url.split('youtu.be/')
      videoId = parts[1]?.split('?')[0] || ''
    } else if (url.includes('youtube.com/embed/')) {
      const parts = url.split('youtube.com/embed/')
      videoId = parts[1]?.split('?')[0] || ''
    }
  } catch (e) {
    console.error('Error parsing YouTube ID:', e)
  }
  return videoId || null
}

export default function LessonPlayerClient({
  courseSlug,
  courseTitle,
  currentLesson,
  outline,
  resources,
  quiz,
  quizAttempts,
  progressPercent
}: LessonPlayerClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'notes' | 'resources'>('notes')
  const [videoPlayingMap, setVideoPlayingMap] = useState<Record<string, boolean>>({})
  const [isPending, startTransition] = useTransition()

  // Flattened outline sequence for navigation (skipping locked modules)
  const flatLessons = useMemo(() => {
    return outline.filter((m) => !m.is_locked).flatMap((m) => m.lessons)
  }, [outline])

  const currentIdx = flatLessons.findIndex((l) => l.id === currentLesson.id)
  const prevLesson = currentIdx > 0 ? flatLessons[currentIdx - 1] : null
  const nextLesson = currentIdx >= 0 && currentIdx < flatLessons.length - 1 ? flatLessons[currentIdx + 1] : null
  const isCurrentCompleted = flatLessons[currentIdx]?.is_completed || false



  const handleMarkComplete = () => {
    startTransition(async () => {
      const result = await markLessonComplete(currentLesson.id, courseSlug)
      if (result.error) {
        toast.error(result.error)
      } else {
        if (nextLesson) {
          router.push(`/learn/${courseSlug}/lesson/${nextLesson.id}`)
        } else {
          router.refresh()
        }
      }
    })
  }



  // Type Icons Helper
  const getIcon = (type: string) => {
    switch (type) {
      case 'video': return '🎥'
      case 'recording': return '📼'
      case 'notes': return '📄'
      case 'quiz': return '❓'
      default: return '📖'
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between font-body">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="space-y-1 font-body">
            <Link
              href={`/learn/${courseSlug}`}
              className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Course Roadmap
            </Link>
            <h1 className="text-sm font-bold text-white font-display">
              {courseTitle}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Outline navigation toggle (for mobiles) */}
            <a
              href="#sidebar-outline"
              className="sm:hidden text-xs bg-slate-800 border border-slate-700 py-1.5 px-3 rounded-lg text-slate-300 font-semibold"
            >
              📖 View Outline
            </a>
          </div>
        </div>
      </header>

      {/* Two-Panel Core Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row gap-6 p-6">
        
        {/* Left Column (Content Player & Tabs) */}
        <div className="flex-1 space-y-6 min-w-0">
          
          {/* Main Media Player Viewport */}
          <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
            
            {/* VIDEO/RECORDING PLAYERS */}
            {(currentLesson.type === 'video' || currentLesson.type === 'recording') && (
              <div className="aspect-video relative bg-black">
                {currentLesson.video_url ? (
                  (() => {
                    const isPlaying = videoPlayingMap[currentLesson.id] || false
                    const youtubeId = getYouTubeVideoId(currentLesson.video_url)

                    if (isPlaying || !youtubeId) {
                      return (
                        <iframe
                          src={`${getYouTubeEmbedUrl(currentLesson.video_url)}&autoplay=1`}
                          title={currentLesson.title}
                          className="absolute inset-0 w-full h-full border-none"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      )
                    }

                    return (
                      <div
                        className="absolute inset-0 flex items-center justify-center cursor-pointer group"
                        onClick={() => setVideoPlayingMap((prev) => ({ ...prev, [currentLesson.id]: true }))}
                      >
                        <Image
                          src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                          alt={currentLesson.title}
                          fill
                          className="object-cover opacity-80 group-hover:opacity-90 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
                        <div className="relative z-10 w-16 h-16 bg-rose-600 group-hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 duration-200">
                          <svg className="w-8 h-8 fill-current ml-1" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    )
                  })()
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 font-semibold">
                    No video link posted yet by admin.
                  </div>
                )}
              </div>
            )}

            {/* NOTES WRITER */}
            {currentLesson.type === 'notes' && (
              <div className="p-8 max-h-[500px] overflow-y-auto space-y-4 prose prose-invert max-w-none">
                <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                  Lesson Notes
                </span>
                <h2 className="text-xl font-bold text-white font-display mt-2 border-b border-slate-800 pb-3">
                  {currentLesson.title}
                </h2>
                {currentLesson.content_md ? (
                  <div className="text-sm text-slate-300 leading-relaxed font-normal whitespace-pre-wrap">
                    {currentLesson.content_md}
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-xs font-normal">
                    This lesson contains no written notes. Please check resources tab.
                  </p>
                )}
              </div>
            )}

            {/* QUIZ DASHBOARD PORTAL */}
            {currentLesson.type === 'quiz' && quiz && (
              <div className="p-8 space-y-6">
                <span className="bg-primary text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md">
                  Quiz assessment
                </span>
                
                <div>
                  <h2 className="text-xl font-bold text-white font-display leading-snug">
                    {currentLesson.title}
                  </h2>
                  <p className="text-slate-400 text-xs mt-1 font-normal">
                    This quiz contains {quiz.questions.length} questions. You need {quiz.pass_pct}% to pass.
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-400">Maximum Attempts:</span>
                    <span className="font-bold text-slate-200 font-mono">
                      {quiz.max_attempts}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs border-t border-slate-800 pt-3">
                    <span className="font-semibold text-slate-400">Attempts Used:</span>
                    <span className="font-bold text-slate-200 font-mono">
                      {quizAttempts.length} / {quiz.max_attempts}
                    </span>
                  </div>

                  {quizAttempts.length > 0 && (
                    <div className="border-t border-slate-800 pt-3 space-y-2">
                      <span className="font-semibold text-slate-400 text-xs block">Previous Scores:</span>
                      <div className="divide-y divide-slate-800">
                        {quizAttempts.map((attempt, idx) => {
                          const passedAttempt = attempt.score_pct >= quiz.pass_pct
                          return (
                            <div key={attempt.id} className="py-2 flex justify-between items-center text-xs">
                              <span className="text-slate-455">Attempt {idx + 1}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold font-mono text-slate-200">{attempt.score_pct}%</span>
                                <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] uppercase ${
                                  passedAttempt ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                }`}>
                                  {passedAttempt ? 'Passed' : 'Failed'}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {isCurrentCompleted ? (
                    <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 text-xs font-bold rounded-xl text-center flex items-center justify-center gap-1.5">
                      <span>✓</span> Quiz Passed Successfully!
                    </div>
                  ) : quizAttempts.length < quiz.max_attempts ? (
                    <Link
                      href={`/learn/${courseSlug}/quiz/${quiz.id}`}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors block text-center shadow-xs cursor-pointer select-none"
                    >
                      {quizAttempts.length === 0 ? 'Start Quiz Assessment' : 'Start Next Attempt'}
                    </Link>
                  ) : (
                    <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl text-center">
                      ❌ Maximum attempt limit reached. Please contact Admin.
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Under Player Header Description / Navigation */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-3xs">
            <div>
              <h2 className="text-sm font-bold text-white font-display">
                {currentLesson.title}
              </h2>
              <p className="text-slate-500 text-[10px] font-semibold uppercase mt-0.5 font-mono">
                Lesson format: {currentLesson.type}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {prevLesson ? (
                <Link
                  href={`/learn/${courseSlug}/lesson/${prevLesson.id}`}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-350 font-bold py-1.5 px-3 rounded-lg text-[11px] transition-colors"
                >
                  ← Prev
                </Link>
              ) : (
                <button
                  disabled
                  className="bg-slate-800 text-slate-600 cursor-not-allowed py-1.5 px-3 rounded-lg text-[11px] font-semibold"
                >
                  ← Prev
                </button>
              )}

              {/* Complete Action Button */}
              {currentLesson.type !== 'quiz' && (
                <button
                  onClick={handleMarkComplete}
                  disabled={isPending || isCurrentCompleted}
                  className={`font-bold py-1.5 px-4 rounded-lg text-[11px] transition-all cursor-pointer ${
                    isCurrentCompleted
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                  }`}
                >
                  {isPending ? 'Saving...' : isCurrentCompleted ? '✓ Completed' : 'Mark complete'}
                </button>
              )}

              {nextLesson ? (
                <Link
                  href={`/learn/${courseSlug}/lesson/${nextLesson.id}`}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-350 font-bold py-1.5 px-3 rounded-lg text-[11px] transition-colors"
                >
                  Next →
                </Link>
              ) : (
                <button
                  disabled
                  className="bg-slate-800 text-slate-600 cursor-not-allowed py-1.5 px-3 rounded-lg text-[11px] font-semibold"
                >
                  Next →
                </button>
              )}
            </div>
          </div>

          {/* Under content tabbed container (Notes/Resources) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-3xs overflow-hidden">
            <div className="flex border-b border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('notes')}
                className={`py-3.5 px-5 transition-colors cursor-pointer ${
                  activeTab === 'notes' ? 'text-white border-b-2 border-primary bg-slate-950/20' : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                Notes
              </button>
              <button
                onClick={() => setActiveTab('resources')}
                className={`py-3.5 px-5 transition-colors cursor-pointer ${
                  activeTab === 'resources' ? 'text-white border-b-2 border-primary bg-slate-950/20' : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                Resources ({resources.length})
              </button>
            </div>

            <div className="p-6 min-h-[150px]">
              {activeTab === 'notes' && (
                <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-normal">
                  {currentLesson.content_md ? (
                    currentLesson.content_md
                  ) : (
                    <span className="text-slate-500 italic">No notes posted for this lesson slot.</span>
                  )}
                </div>
              )}

              {activeTab === 'resources' && (
                <div className="space-y-2.5">
                  {resources.length > 0 ? (
                    resources.map((res) => (
                      <div
                        key={res.id}
                        className="flex justify-between items-center bg-slate-950/40 border border-slate-850 p-3.5 rounded-xl text-xs hover:bg-slate-800 transition-colors"
                      >
                        <span className="font-semibold text-slate-250 block truncate max-w-sm">
                          📂 {res.title}
                        </span>
                        <a
                          href={res.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-1.5 px-3.5 rounded-lg text-[10px] transition-colors shadow-3xs"
                        >
                          Download ↗
                        </a>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-500 italic text-xs">No reference resources available.</span>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column (Sidebar Outline) */}
        <aside
          id="sidebar-outline"
          className="w-full md:w-80 bg-slate-900 border border-slate-800 rounded-3xl p-5 h-fit space-y-5 scroll-mt-24 shadow-2xs shrink-0"
        >
          {/* Progress gauge */}
          <div className="space-y-2 border-b border-slate-850 pb-4">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-400">Course Progress</span>
              <span className="text-primary font-mono">{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Curriculum Outline
          </h3>

          <div className="space-y-4">
            {outline.map((mod, modIdx) => {
              const isModuleCompleted = mod.lessons.length > 0 && mod.lessons.every((l) => l.is_completed)
              return (
                <div key={mod.module_id} className="space-y-2">
                  
                  {/* Module title bar */}
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-xs font-bold text-slate-200 leading-snug">
                      Mod {modIdx + 1}: {mod.module_title}
                    </h4>
                    {mod.is_locked && !isModuleCompleted && (
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase font-mono">
                        🔒 Locked
                      </span>
                    )}
                  </div>

                {/* Lesson nodes */}
                <div className="pl-2.5 border-l border-slate-800 space-y-1.5">
                  {mod.lessons.map((lesson) => {
                    const isActive = lesson.id === currentLesson.id
                    
                    return mod.is_locked && !lesson.is_completed ? (
                      /* LOCKED LESSON */
                      <div
                        key={lesson.id}
                        className="flex items-center gap-2 p-2 rounded-xl text-slate-600 text-xs select-none cursor-not-allowed font-medium"
                      >
                        <span className="text-slate-700">🔒</span>
                        <span className="truncate">{lesson.title}</span>
                      </div>
                    ) : (
                      /* ACTIVE / ACCESSIBLE LESSON */
                      <Link
                        key={lesson.id}
                        href={`/learn/${courseSlug}/lesson/${lesson.id}`}
                        className={`flex justify-between items-center gap-2 p-2 rounded-xl text-xs transition-all font-medium ${
                          isActive
                            ? 'bg-primary/20 text-white font-bold border border-primary/30 shadow-2xs'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span>{getIcon(lesson.type)}</span>
                          <span className="truncate">{lesson.title}</span>
                        </div>
                        {lesson.is_completed && (
                          <span className="text-emerald-500 font-bold shrink-0">✓</span>
                        )}
                      </Link>
                    )
                  })}
                </div>

              </div>
            )
          })}
          </div>

        </aside>

      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 px-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Embark AI Institute. All rights reserved.</p>
      </footer>

    </div>
  )
}
