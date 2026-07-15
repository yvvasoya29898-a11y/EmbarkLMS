"use client"

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { scheduleLiveSession, postSessionRecordingUrl } from '@/lib/actions/sessions'
import { formatISTDateTime } from '@/lib/date'

interface SessionItem {
  id: string
  title: string
  description: string | null
  starts_at: string
  duration_min: number
  meeting_url: string | null
  recording_url: string | null
  status: string
  attendance_count: number
}

interface BatchInfo {
  id: string
  name: string
  invite_code: string | null
  course_id: string
  status: string
  courses: {
    title: string
    delivery_type: string
  } | null
}

interface BatchManagerClientProps {
  batch: BatchInfo
  sessions: SessionItem[]
  enrolledCount: number
  certificatesCount: number
}

export default function BatchManagerClient({
  batch,
  sessions,
  enrolledCount,
  certificatesCount
}: BatchManagerClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Modals state
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [recordingSessionId, setRecordingSessionId] = useState<string | null>(null)

  // Schedule form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [durationMin, setDurationMin] = useState(55)
  const [meetingUrl, setMeetingUrl] = useState('')
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  // Recording form states
  const [recordingUrl, setRecordingUrl] = useState('')
  const [recordingError, setRecordingError] = useState<string | null>(null)

  // Handle Schedule submission
  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setScheduleError(null)

    if (!title || !startsAt || !meetingUrl) {
      setScheduleError('Title, starts_at, and meeting url are required.')
      return
    }

    startTransition(async () => {
      const result = await scheduleLiveSession(
        batch.id,
        title,
        description,
        new Date(startsAt).toISOString(),
        durationMin,
        meetingUrl
      )

      if (result.error) {
        setScheduleError(result.error)
      } else {
        // Reset form
        setTitle('')
        setDescription('')
        setStartsAt('')
        setDurationMin(55)
        setMeetingUrl('')
        setShowScheduleModal(false)
        router.refresh()
      }
    })
  }

  // Handle Recording URL submission
  const handleRecordingSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setRecordingError(null)

    if (!recordingSessionId) return
    if (!recordingUrl.trim()) {
      setRecordingError('Recording URL is required.')
      return
    }

    startTransition(async () => {
      const result = await postSessionRecordingUrl(recordingSessionId, recordingUrl)

      if (result.error) {
        setRecordingError(result.error)
      } else {
        setRecordingUrl('')
        setRecordingSessionId(null)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Batch Overview Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-5 shadow-3xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 font-display">
              {batch.courses?.title} · {batch.name}
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-100">
              {batch.status}
            </span>
          </div>

          <div className="text-slate-400 text-[11px] font-semibold flex flex-wrap gap-x-4 gap-y-1 mt-1 font-mono">
            <span>Enrolled: <strong className="text-slate-700 font-extrabold">{enrolledCount} students</strong></span>
            <span>Certificates: <strong className="text-slate-700 font-extrabold">{certificatesCount} issued</strong></span>
            <span>Invite code: <strong className="text-slate-700 font-extrabold">{batch.invite_code || 'None'}</strong></span>
          </div>
        </div>

        <button
          onClick={() => setShowScheduleModal(true)}
          className="bg-primary hover:bg-primary-light text-white text-xs font-bold py-2 px-4 rounded-xl transition-all cursor-pointer shadow-2xs w-full sm:w-auto text-center"
        >
          + Schedule Session
        </button>
      </div>

      {/* Sessions Schedule List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-slate-600">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-5 font-semibold">Session details</th>
                <th className="py-3.5 px-5 font-semibold">Date &amp; Time</th>
                <th className="py-3.5 px-5 font-semibold">Meeting URL</th>
                <th className="py-3.5 px-5 font-semibold">Recording</th>
                <th className="py-3.5 px-5 font-semibold">Attendance</th>
                <th className="py-3.5 px-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.length > 0 ? (
                sessions.map((session, index) => {
                  const hasRecording = !!session.recording_url
                  // statusColors removed because it is unused

                  return (
                    <tr key={session.id} className="hover:bg-slate-50/20 transition-colors">
                      <td className="py-4.5 px-5">
                        <span className="text-[10px] font-bold text-slate-400 font-mono block">
                          Session {index + 1}
                        </span>
                        <span className="font-semibold text-slate-900 block mt-0.5 leading-snug">
                          {session.title}
                        </span>
                        {session.description && (
                          <p className="text-slate-400 text-[11px] leading-normal line-clamp-1 mt-0.5 font-normal">
                            {session.description}
                          </p>
                        )}
                      </td>
                      <td className="py-4.5 px-5 font-medium text-slate-700">
                        {formatISTDateTime(session.starts_at)}
                      </td>
                      <td className="py-4.5 px-5 font-mono text-slate-400 break-all max-w-[150px]">
                        {session.meeting_url || '—'}
                      </td>
                      <td className="py-4.5 px-5">
                        {hasRecording ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md">
                            Posted
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-400 border border-slate-200 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-4.5 px-5 font-bold font-mono text-slate-700">
                        {session.attendance_count}/{enrolledCount}
                      </td>
                      <td className="py-4.5 px-5 text-right space-x-2">
                        {!hasRecording && (
                          <button
                            onClick={() => {
                              setRecordingSessionId(session.id)
                              setRecordingError(null)
                            }}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 px-2.5 rounded-lg text-[10px] transition-colors inline-block cursor-pointer shadow-3xs"
                          >
                            Post Recording
                          </button>
                        )}
                        <Link
                          href={`/admin/attendance/${session.id}`}
                          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-1.5 px-2.5 rounded-lg text-[10px] transition-colors inline-block shadow-3xs"
                        >
                          Mark
                        </Link>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No live classes scheduled for this batch. Click &quot;+ Schedule Session&quot; above to add some.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. Schedule Session Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-900 font-display">
                Schedule Live Session
              </h2>
              <button
                onClick={() => {
                  setShowScheduleModal(false)
                  setScheduleError(null)
                }}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {scheduleError && (
              <div className="p-2.5 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-xl">
                ⚠️ {scheduleError}
              </div>
            )}

            <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs font-medium">
              <div className="space-y-1.5">
                <label className="block text-slate-600">Session Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Session 4 · n8n automation"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-xl py-2 px-3 text-slate-800 focus:outline-hidden transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-600">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Setting up triggers and nodes"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-xl py-2 px-3 text-slate-800 focus:outline-hidden transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-slate-600">Date &amp; Time (Local)</label>
                  <input
                    type="datetime-local"
                    required
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-xl py-2 px-3 text-slate-800 focus:outline-hidden transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-600">Duration (Minutes)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={durationMin}
                    onChange={(e) => setDurationMin(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-xl py-2 px-3 text-slate-800 focus:outline-hidden transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-600">Meeting Link (Google Meet / Zoom)</label>
                <input
                  type="url"
                  required
                  placeholder="https://meet.google.com/xyz-abcd-pqr"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-xl py-2 px-3 text-slate-800 focus:outline-hidden transition-all font-mono"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-primary hover:bg-primary-light text-white font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : 'Save session'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleModal(false)
                    setScheduleError(null)
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Post Recording Modal */}
      {recordingSessionId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-900 font-display">
                Post Class Recording
              </h2>
              <button
                onClick={() => {
                  setRecordingSessionId(null)
                  setRecordingError(null)
                }}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {recordingError && (
              <div className="p-2.5 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-xl">
                ⚠️ {recordingError}
              </div>
            )}

            <form onSubmit={handleRecordingSubmit} className="space-y-4 text-xs font-medium">
              <div className="space-y-1.5">
                <label className="block text-slate-600">YouTube Unlisted URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://www.youtube.com/watch?v=xxxxxxxx"
                  value={recordingUrl}
                  onChange={(e) => setRecordingUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-xl py-2 px-3 text-slate-800 focus:outline-hidden transition-all font-mono"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-primary hover:bg-primary-light text-white font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {isPending ? 'Posting...' : 'Post recording'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecordingSessionId(null)
                    setRecordingError(null)
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
