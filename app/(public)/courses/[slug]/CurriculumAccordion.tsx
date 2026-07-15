"use client"

import React, { useState } from 'react'
import {
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  Lock as LockIcon,
  Play as PlayIcon,
  ChevronDown as ChevronDownIcon,
  BookOpen as BookOpenIcon
} from 'lucide-react'
import { formatISTDateTime } from '@/lib/date'

interface Lesson {
  id: string
  module_id: string
  title: string
  type: 'video' | 'notes' | 'quiz' | 'recording'
  sort_order: number
  is_free_preview: boolean
  video_url?: string | null
  content_md?: string | null
}

interface Module {
  id: string
  title: string
  sort_order: number
  drip_locked: boolean
}

interface LiveSession {
  id: string
  title: string
  description: string | null
  starts_at: string
  duration_min: number
  status: 'upcoming' | 'live' | 'completed'
}

interface CurriculumAccordionProps {
  modules: Module[]
  lessonsByModule: Record<string, Lesson[]>
  isEnrolled: boolean
  liveSessions: LiveSession[]
}

function getYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
  const match = url.match(regExp)
  return (match && match[2].length === 11) ? match[2] : null
}

export default function CurriculumAccordion({
  modules,
  lessonsByModule,
  isEnrolled,
  liveSessions = []
}: CurriculumAccordionProps) {
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null)
  
  // Expand first module by default
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    if (modules && modules.length > 0) {
      initial[modules[0].id] = true
    }
    return initial
  })

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }))
  }

  // Interleave modules and live sessions to form a unified path
  const timelineNodes: Array<
    | { type: 'module'; id: string; data: Module; lessons: Lesson[] }
    | { type: 'live_session'; id: string; data: LiveSession; index: number }
  > = []

  const maxLen = Math.max(modules.length, liveSessions.length)
  for (let i = 0; i < maxLen; i++) {
    if (i < modules.length) {
      timelineNodes.push({
        type: 'module',
        id: `module-${modules[i].id}`,
        data: modules[i],
        lessons: lessonsByModule[modules[i].id] || []
      })
    }
    if (i < liveSessions.length) {
      timelineNodes.push({
        type: 'live_session',
        id: `session-${liveSessions[i].id}`,
        data: liveSessions[i],
        index: i
      })
    }
  }

  return (
    <div className="relative border-l border-slate-200 ml-4 pl-6 space-y-8 py-2 font-body text-xs">
      {timelineNodes.map((node) => {
        if (node.type === 'module') {
          const mod = node.data
          const modLessons = node.lessons
          const isExpanded = !!expandedModules[mod.id]

          return (
            <div key={node.id} className="relative group">
              {/* Timeline Connector Indicator */}
              <div className="absolute -left-[35px] top-3.5 w-4 h-4 rounded-full border-2 border-primary bg-white flex items-center justify-center shadow-3xs z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              </div>

              {/* Module Card Accordion */}
              <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-3xs transition-all hover:border-slate-350">
                <button
                  onClick={() => toggleModule(mod.id)}
                  className="w-full text-left bg-slate-50/40 hover:bg-slate-50/80 px-5 py-4 flex justify-between items-center transition-all cursor-pointer select-none"
                >
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Recorded Module</span>
                    <h4 className="text-xs font-bold text-slate-800 tracking-tight leading-tight">
                      {mod.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-450 bg-slate-100 px-2 py-0.5 rounded-md">
                      {modLessons.length} Lesson{modLessons.length === 1 ? '' : 's'}
                    </span>
                    <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform duration-250 ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Module Lessons list */}
                <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-[600px] border-t border-slate-100' : 'max-h-0'}`}>
                  <div className="divide-y divide-slate-100 px-5 bg-white">
                    {modLessons.length > 0 ? (
                      modLessons.map((l) => {
                        const icon = {
                          video: <PlayIcon className="w-3.5 h-3.5" />,
                          quiz: <BookOpenIcon className="w-3.5 h-3.5" />,
                          recording: <PlayIcon className="w-3.5 h-3.5" />,
                          notes: <BookOpenIcon className="w-3.5 h-3.5" />
                        }[l.type] || <BookOpenIcon className="w-3.5 h-3.5" />

                        const isClickable = isEnrolled || l.is_free_preview

                        return (
                          <div key={l.id} className="py-3.5 flex justify-between items-center gap-4 hover:bg-slate-50/30 transition-colors">
                            <button
                              disabled={!isClickable}
                              onClick={() => {
                                if (isClickable) {
                                  setPreviewLesson(l)
                                }
                              }}
                              className={`flex items-center gap-2.5 text-xs text-left w-full transition-colors ${
                                isClickable
                                  ? 'hover:text-primary cursor-pointer'
                                  : 'cursor-default'
                              }`}
                            >
                              <span className="text-slate-400 shrink-0">{icon}</span>
                              <span className={isClickable ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                                {l.title}
                              </span>
                            </button>

                            <div className="shrink-0">
                              {isEnrolled ? (
                                <span className="text-emerald-600 text-[10px] font-bold bg-emerald-50 px-2 py-0.5 rounded-md">✓ Enrolled</span>
                              ) : l.is_free_preview ? (
                                <button
                                  onClick={() => setPreviewLesson(l)}
                                  className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                                >
                                  Free preview
                                </button>
                              ) : (
                                <span title="Enroll to unlock">
                                  <LockIcon className="w-3.5 h-3.5 text-slate-300" />
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="py-5 text-center text-xs text-slate-400 italic">
                        No lessons in this module.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        } else {
          // Live Session Node
          const session = node.data
          return (
            <div key={node.id} className="relative group">
              {/* Timeline Connector Indicator (Glowing Red for Live) */}
              <div className="absolute -left-[35px] top-5 w-4 h-4 rounded-full border-2 border-rose-500 bg-white flex items-center justify-center shadow-3xs z-10 animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              </div>

              {/* Live Session Card Layout */}
              <div className="bg-gradient-to-br from-white to-slate-50/30 border border-slate-200/80 p-5 rounded-2xl shadow-3xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:border-slate-350">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Live Class {node.index + 1}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-450 flex items-center gap-1">
                      <ClockIcon className="w-3 h-3 text-slate-400" />
                      {session.duration_min} min
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 leading-tight">
                    {session.title}
                  </h4>
                  {session.description && (
                    <p className="text-[11px] font-medium text-slate-450 leading-relaxed max-w-md">
                      {session.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 text-slate-600 bg-white border border-slate-200/80 rounded-xl py-2 px-3 shadow-3xs self-start md:self-auto shrink-0 font-mono text-[10px] font-semibold">
                  <CalendarIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{formatISTDateTime(session.starts_at)}</span>
                </div>
              </div>
            </div>
          )
        }
      })}

      {/* Free Preview Video / Notes Modal */}
      {previewLesson && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col relative animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {previewLesson.is_free_preview ? 'Free Preview' : 'Lesson Content'}
                </span>
                <h4 className="text-xs font-bold text-slate-800 leading-tight">
                  {previewLesson.title}
                </h4>
              </div>
              <button
                onClick={() => setPreviewLesson(null)}
                className="text-slate-450 hover:text-slate-600 text-lg font-bold p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto max-h-[70vh]">
              {previewLesson.type === 'quiz' ? (
                <div className="p-8 text-center space-y-3">
                  <span className="text-3xl">📝</span>
                  <h5 className="text-xs font-bold text-slate-800">Quiz: {previewLesson.title}</h5>
                  <p className="text-[11px] font-medium text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Quizzes are interactive and graded server-side. To take this quiz, please log in and request access to the course.
                  </p>
                </div>
              ) : (previewLesson.type === 'video' || previewLesson.type === 'recording') ? (
                <div className="aspect-video w-full bg-slate-950 flex items-center justify-center relative">
                  {getYouTubeId(previewLesson.video_url) ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${getYouTubeId(previewLesson.video_url)}?autoplay=1&rel=0`}
                      title={previewLesson.title}
                      className="absolute inset-0 w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : previewLesson.video_url ? (
                    <video
                      src={previewLesson.video_url}
                      controls
                      autoPlay
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="text-center p-8 space-y-2">
                      <span className="text-2xl">⚠️</span>
                      <p className="text-xs font-bold text-slate-400">Video source not found</p>
                    </div>
                  )}
                </div>
              ) : previewLesson.type === 'notes' ? (
                <div className="p-6 text-slate-700 text-xs font-medium leading-relaxed whitespace-pre-wrap select-text">
                  {previewLesson.content_md || (
                    <div className="text-center py-8 text-slate-450 italic">
                      No document notes written for this preview lesson.
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400">
                  Unsupported preview format.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
