"use client"

import React, { useState, useTransition } from 'react'
import { getBatchReportData } from '@/lib/actions/reports'

interface BatchItem {
  id: string
  name: string
  courses: {
    title: string
  } | null
}

interface StudentReportRow {
  userId: string
  fullName: string
  attendancePct: number
  lessonsCompleted: number
  quizAverage: number
  status: 'On track' | 'At risk'
}

interface ReportsClientProps {
  batches: BatchItem[]
  funnelCounts: {
    new: number
    contacted: number
    paid: number
    enrolled: number
    dropped: number
  }
  medianContactMinutes: number
  feedbackStats: {
    averageRating: number
    totalFeedback: number
    recentComments: Array<{
      id: string
      rating: number
      comments: string | null
      studentName: string
      courseTitle: string
      category: string
    }>
  }
}

export default function ReportsClient({
  batches,
  funnelCounts,
  medianContactMinutes,
  feedbackStats
}: ReportsClientProps) {
  const [activeTab, setActiveTab] = useState<'batch' | 'funnel' | 'feedback'>('batch')
  const [isPending, startTransition] = useTransition()

  // Batch Report State
  const [selectedBatchId, setSelectedBatchId] = useState<string>('')
  const [studentsList, setStudentsList] = useState<StudentReportRow[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)

  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId)
    setFetchError(null)
    if (!batchId) {
      setStudentsList([])
      return
    }

    startTransition(async () => {
      const result = await getBatchReportData(batchId)
      if (result.error) {
        setFetchError(result.error)
        setStudentsList([])
      } else {
        setStudentsList(result.students)
      }
    })
  }

  const formatMinutes = (totalMinutes: number) => {
    if (totalMinutes === 0) return 'N/A'
    const hours = Math.floor(totalMinutes / 60)
    const minutes = Math.round(totalMinutes % 60)
    if (hours === 0) return `${minutes}m`
    return `${hours}h ${minutes}m`
  }

  return (
    <div className="space-y-6">
      
      {/* Tabs list */}
      <div className="flex border-b border-slate-200 text-xs font-semibold bg-white rounded-2xl p-1 shadow-3xs">
        <button
          onClick={() => setActiveTab('batch')}
          className={`flex-1 py-3 text-center rounded-xl transition-all cursor-pointer ${
            activeTab === 'batch' ? 'bg-slate-900 text-white shadow-3xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          📈 Cohort Batch Performance
        </button>
        <button
          onClick={() => setActiveTab('funnel')}
          className={`flex-1 py-3 text-center rounded-xl transition-all cursor-pointer ${
            activeTab === 'funnel' ? 'bg-slate-900 text-white shadow-3xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          🎯 Lead Funnel & Conversion
        </button>
        <button
          onClick={() => setActiveTab('feedback')}
          className={`flex-1 py-3 text-center rounded-xl transition-all cursor-pointer ${
            activeTab === 'feedback' ? 'bg-slate-900 text-white shadow-3xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          💬 Course Feedback
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'batch' && (
        <div className="space-y-6">
          
          {/* Batch Selector & Export action */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-3xs">
            <div className="space-y-1 flex-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Select Cohort Batch
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => handleBatchChange(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-none w-full max-w-sm"
              >
                <option value="">-- Choose Batch --</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.courses?.title})
                  </option>
                ))}
              </select>
            </div>

            {selectedBatchId && studentsList.length > 0 && (
              <a
                href={`/api/reports/batch/${selectedBatchId}/csv`}
                className="bg-slate-950 hover:bg-slate-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition-colors shadow-2xs cursor-pointer text-center"
              >
                📥 Export Attendance Sheet CSV
              </a>
            )}
          </div>

          {fetchError && (
            <div className="p-3.5 bg-red-50 text-red-650 border border-red-100 rounded-xl text-xs font-bold font-mono">
              ⚠️ {fetchError}
            </div>
          )}

          {selectedBatchId ? (
            isPending ? (
              <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                Loading batch statistics details...
              </div>
            ) : studentsList.length > 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-3xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold font-mono uppercase">
                      <th className="py-3 px-5">Student Name</th>
                      <th className="py-3 px-5">Attendance %</th>
                      <th className="py-3 px-5">Lessons Completed</th>
                      <th className="py-3 px-5">Quiz Avg Score</th>
                      <th className="py-3 px-5 text-right">Status Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {studentsList.map((row) => (
                      <tr key={row.userId} className="hover:bg-slate-50/40">
                        <td className="py-4 px-5 text-slate-900 font-bold">
                          {row.fullName}
                        </td>
                        <td className="py-4 px-5 font-mono">
                          {row.attendancePct}%
                        </td>
                        <td className="py-4 px-5">
                          {row.lessonsCompleted} Completed
                        </td>
                        <td className="py-4 px-5 font-mono">
                          {row.quizAverage > 0 ? `${row.quizAverage}%` : '—'}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <span className={`inline-block font-bold text-[9px] uppercase px-2 py-0.5 rounded ${
                            row.status === 'On track'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-100 animate-pulse'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs italic">
                No active student enrollment found in this batch cohort.
              </div>
            )
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs italic">
              Please choose a batch cohort from the dropdown selector above to see performance analysis.
            </div>
          )}
        </div>
      )}

      {activeTab === 'funnel' && (
        <div className="space-y-6">
          
          {/* Funnel Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 shadow-3xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">1. New requests</span>
              <span className="text-xl font-bold text-slate-900 font-display">{funnelCounts.new}</span>
            </div>
            <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 shadow-3xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">2. Contacted leads</span>
              <span className="text-xl font-bold text-slate-900 font-display">{funnelCounts.contacted}</span>
            </div>
            <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 shadow-3xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">3. Paid requests</span>
              <span className="text-xl font-bold text-slate-900 font-display">{funnelCounts.paid}</span>
            </div>
            <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 shadow-3xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">4. Enrolled students</span>
              <span className="text-xl font-bold text-slate-900 font-display">{funnelCounts.enrolled}</span>
            </div>
            <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 shadow-3xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Inactivity Drops</span>
              <span className="text-xl font-bold text-slate-500 font-display">{funnelCounts.dropped}</span>
            </div>
          </div>

          {/* Median contact analysis */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-3 shadow-3xs">
            <h3 className="text-sm font-bold text-slate-900 font-display">
              Funnel Conversion Speed
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary font-display font-mono">
                {formatMinutes(medianContactMinutes)}
              </span>
              <span className="text-xs text-slate-500 font-semibold font-mono">
                Median response time (New ➔ First Contact)
              </span>
            </div>
            <p className="text-slate-400 text-xs font-normal">
              Measured from the initial timestamp of request submission to when the request is marked Contacted, Paid, or Enrolled. Keep response times under 24 hours to improve enrollment metrics.
            </p>
          </div>

        </div>
      )}

      {activeTab === 'feedback' && (
        <div className="space-y-6">
          
          {/* Feedback statistics summary */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-6 shadow-3xs">
            <div className="flex gap-8 divide-x divide-slate-100">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Average Rating</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-slate-900 font-mono font-display">
                    {feedbackStats.averageRating > 0 ? feedbackStats.averageRating.toFixed(1) : '0.0'}
                  </span>
                  <span className="text-amber-500 text-lg">★</span>
                </div>
              </div>
              
              <div className="space-y-1 pl-8">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Submissions</span>
                <span className="text-2xl font-bold text-slate-900 font-mono font-display">
                  {feedbackStats.totalFeedback} reviews
                </span>
              </div>
            </div>

            {feedbackStats.totalFeedback > 0 && (
              <a
                href="/api/reports/feedback/csv"
                className="bg-slate-950 hover:bg-slate-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition-colors shadow-2xs text-center cursor-pointer select-none"
              >
                📥 Export Feedback Reports CSV
              </a>
            )}
          </div>

          {/* Feedback Comments Sheet */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-3xs">
            <h3 className="text-sm font-bold text-slate-900 font-display">
              Recent Feedback Logs
            </h3>

            {feedbackStats.recentComments.length > 0 ? (
              <div className="divide-y divide-slate-150 text-xs font-medium text-slate-700">
                {feedbackStats.recentComments.map((item) => (
                  <div key={item.id} className="py-4 space-y-2">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">
                          {item.studentName}
                        </h4>
                        <span className="text-[9px] text-slate-400 block font-normal">
                          Course: {item.courseTitle} · {item.category}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 font-mono text-amber-500 font-bold bg-amber-500/5 px-2 py-0.5 border border-amber-500/10 rounded">
                        <span>{item.rating}</span>
                        <span className="text-[10px]">★</span>
                      </div>
                    </div>

                    {item.comments ? (
                      <p className="text-slate-650 bg-slate-50/40 border border-slate-150 p-3 rounded-xl leading-relaxed text-xs font-normal">
                        {item.comments}
                      </p>
                    ) : (
                      <p className="text-slate-400 italic text-[11px] font-normal pl-1">
                        No written comments provided.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 italic text-xs">
                No course feedback forms submitted yet by students.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  )
}
