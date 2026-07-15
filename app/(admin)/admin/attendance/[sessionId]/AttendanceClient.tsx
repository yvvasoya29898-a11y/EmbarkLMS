"use client"

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import {
  toggleStudentAttendance,
  markAllStudentsPresent,
  finalizeAttendance
} from '@/lib/actions/attendance'
import { formatISTTime } from '@/lib/date'

interface StudentAttendanceItem {
  userId: string
  fullName: string
  joinedClickAt: string | null
  markedBy: 'auto' | 'admin' | null
  attended: boolean
}

interface AttendanceClientProps {
  sessionId: string
  sessionTitle: string
  batchName: string
  batchId: string
  initialStudents: StudentAttendanceItem[]
  isFinalized: boolean
}

export default function AttendanceClient({
  sessionId,
  sessionTitle,
  batchName,
  batchId,
  initialStudents,
  isFinalized
}: AttendanceClientProps) {
  const router = useRouter()
  const { confirm } = useToast()
  const [isPending, startTransition] = useTransition()
  const [students, setStudents] = useState<StudentAttendanceItem[]>(initialStudents)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleToggle = (userId: string, currentStatus: boolean) => {
    if (isFinalized) return

    const newStatus = !currentStatus
    setErrorMsg(null)
    setSuccessMsg(null)

    // Optimistically update UI
    setStudents(prev => prev.map(s => {
      if (s.userId === userId) {
        return {
          ...s,
          attended: newStatus,
          markedBy: 'admin',
          joinedClickAt: s.joinedClickAt || (newStatus ? new Date().toISOString() : null)
        }
      }
      return s
    }))

    startTransition(async () => {
      const result = await toggleStudentAttendance(sessionId, userId, newStatus)
      if (result.error) {
        setErrorMsg(result.error)
        // Revert on error
        setStudents(prev => prev.map(s => {
          if (s.userId === userId) {
            return {
              ...s,
              attended: currentStatus,
              markedBy: s.markedBy
            }
          }
          return s
        }))
      } else {
        router.refresh()
      }
    })
  }

  const handleMarkAllPresent = async () => {
    if (isFinalized) return
    const isConfirmed = await confirm({
      title: 'Mark All Present',
      message: 'Mark all enrolled students as present?',
      confirmText: 'Mark Present'
    })
    if (!isConfirmed) return

    setErrorMsg(null)
    setSuccessMsg(null)

    // Optimistically update UI
    const nowStr = new Date().toISOString()
    setStudents(prev => prev.map(s => ({
      ...s,
      attended: true,
      markedBy: 'admin',
      joinedClickAt: s.joinedClickAt || nowStr
    })))

    startTransition(async () => {
      const result = await markAllStudentsPresent(sessionId)
      if (result.error) {
        setErrorMsg(result.error)
        router.refresh()
      } else {
        setSuccessMsg('All students marked present successfully.')
        router.refresh()
      }
    })
  }

  const handleFinalize = async () => {
    if (isFinalized) return
    const isConfirmed = await confirm({
      title: 'Finalize Attendance',
      message: 'Finalize attendance? This will lock edits and re-calculate certificate issuing triggers.',
      confirmText: 'Finalize',
      isDestructive: true
    })
    if (!isConfirmed) return

    setErrorMsg(null)
    setSuccessMsg(null)

    startTransition(async () => {
      const result = await finalizeAttendance(sessionId)
      if (result.error) {
        setErrorMsg(result.error)
      } else {
        setSuccessMsg('Attendance finalized and locked successfully!')
        router.refresh()
      }
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between font-body">
      
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="space-y-1">
            <Link
              href={`/admin/batches/${batchId}`}
              className="text-xs font-bold text-slate-400 hover:text-slate-650 transition-colors"
            >
              ← Back to Batch Details
            </Link>
            <h1 className="text-lg font-bold text-slate-900 font-display">
              Attendance Sheet: {sessionTitle}
            </h1>
            <p className="text-xs text-slate-450 font-normal">
              Cohort: {batchName}
            </p>
          </div>

          <div className="flex gap-2">
            {!isFinalized && (
              <>
                <button
                  onClick={handleMarkAllPresent}
                  disabled={isPending}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 border border-slate-200 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Mark All Present
                </button>
                <button
                  onClick={handleFinalize}
                  disabled={isPending}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-5 rounded-xl text-xs transition-colors shadow-2xs cursor-pointer"
                >
                  {isPending ? 'Finalizing...' : 'Finalize & Lock'}
                </button>
              </>
            )}
            {isFinalized && (
              <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 font-mono uppercase tracking-wider">
                🔒 Finalized
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Core Attendance Table Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8 space-y-6">
        
        {errorMsg && (
          <div className="p-3.5 bg-red-50 text-red-650 border border-red-150 rounded-xl text-xs font-bold font-mono">
            ⚠️ {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 text-emerald-750 border border-emerald-150 rounded-xl text-xs font-bold">
            ✓ {successMsg}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-3xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold font-mono uppercase">
                <th className="py-3 px-5">Student Name</th>
                <th className="py-3 px-5">Join Time (IST)</th>
                <th className="py-3 px-5">Marking Source</th>
                <th className="py-3 px-5 text-right">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {students.length > 0 ? (
                students.map((student) => (
                  <tr key={student.userId} className="hover:bg-slate-50/40">
                    <td className="py-4 px-5 text-slate-900 font-bold">
                      {student.fullName}
                    </td>
                    <td className="py-4 px-5 text-slate-500 font-mono">
                      {student.joinedClickAt ? formatISTTime(student.joinedClickAt) : '—'}
                    </td>
                    <td className="py-4 px-5">
                      {student.markedBy ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                          student.markedBy === 'admin' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {student.markedBy}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal italic">—</span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => handleToggle(student.userId, student.attended)}
                        disabled={isFinalized || isPending}
                        className={`font-bold py-1.5 px-3.5 rounded-lg text-[10px] transition-all cursor-pointer ${
                          student.attended
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-3xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-400 border border-slate-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {student.attended ? 'Present' : 'Absent'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 font-normal italic">
                    No students currently enrolled in this batch.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-6 text-center text-xs text-slate-450">
        <p>© {new Date().getFullYear()} Embark AI Institute. Admin Panel.</p>
      </footer>

    </div>
  )
}
