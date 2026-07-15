"use client"

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  markRequestContacted,
  markRequestPaid,
  markRequestDropped,
  grantEnrollmentAccess,
  revokeEnrollmentAccess
} from '@/lib/actions/enrollment'
import { formatISTDateTime } from '@/lib/date'
import ConfirmModal from '@/components/ConfirmModal'

// Request type definition matching our query
export interface EnrollmentRequest {
  id: string
  user_id: string
  course_id: string
  status: 'new' | 'contacted' | 'paid' | 'enrolled' | 'dropped'
  student_note: string | null
  admin_notes: string | null
  payment_reference: string | null
  created_at: string
  updated_at: string
  profiles: {
    full_name: string
    phone: string
  } | null
  courses: {
    title: string
    delivery_type: 'recorded' | 'live' | 'hybrid'
  } | null
}

interface BatchItem {
  id: string
  course_id: string
  name: string
  starts_at: string
  status: string
}

interface RequestsInboxProps {
  initialRequests: EnrollmentRequest[]
  batchesGrouped: Record<string, BatchItem[]>
}

function getRelativeTime(dateString: string) {
  const now = new Date()
  const past = new Date(dateString)
  const diffMs = now.getTime() - past.getTime()
  if (diffMs < 0) return 'Just now'
  
  const diffMins = Math.floor(diffMs / (1000 * 60))
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  
  const diffDays = Math.floor(diffHrs / 24)
  return `${diffDays}d ago`
}

export default function RequestsInbox({ initialRequests, batchesGrouped }: RequestsInboxProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'new' | 'contacted' | 'paid' | 'dropped' | 'enrolled'>('all')
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null)
  
  // Local input states for expanded row
  const [localPaymentRef, setLocalPaymentRef] = useState('')
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [localAdminNotes, setLocalAdminNotes] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Custom Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    isDestructive?: boolean
    onConfirm: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  })

  // Filter requests
  const filteredRequests = initialRequests.filter((req) => {
    if (filter === 'all') return true
    return req.status === filter
  })

  // Count helper
  const getCount = (status: typeof filter) => {
    if (status === 'all') return initialRequests.length
    return initialRequests.filter(r => r.status === status).length
  }

  // Row expand toggle
  const toggleExpand = (req: EnrollmentRequest) => {
    if (expandedRequestId === req.id) {
      setExpandedRequestId(null)
    } else {
      setExpandedRequestId(req.id)
      setLocalPaymentRef(req.payment_reference || '')
      setLocalAdminNotes(req.admin_notes || '')
      
      const courseBatches = batchesGrouped[req.course_id] || []
      setSelectedBatchId(courseBatches[0]?.id || '')
      setActionError(null)
    }
  }

  // Handle Mark Contacted
  const handleMarkContacted = (requestId: string) => {
    setActionError(null)
    startTransition(async () => {
      const result = await markRequestContacted(requestId)
      if (result?.error) {
        setActionError(result.error)
      } else {
        router.refresh()
        setExpandedRequestId(null)
      }
    })
  }

  // Handle Mark Paid
  const handleMarkPaid = (requestId: string) => {
    if (!localPaymentRef.trim()) {
      setActionError('Payment reference is required.')
      return
    }
    setActionError(null)
    startTransition(async () => {
      const result = await markRequestPaid(requestId, localPaymentRef)
      if (result?.error) {
        setActionError(result.error)
      } else {
        router.refresh()
        setExpandedRequestId(null)
      }
    })
  }

  // Handle Mark Dropped
  const handleMarkDropped = (requestId: string) => {
    setActionError(null)
    startTransition(async () => {
      const result = await markRequestDropped(requestId, localAdminNotes)
      if (result?.error) {
        setActionError(result.error)
      } else {
        router.refresh()
        setExpandedRequestId(null)
      }
    })
  }

  // Handle Grant Access
  const handleGrantAccess = (req: EnrollmentRequest) => {
    const isRecorded = req.courses?.delivery_type === 'recorded'
    
    if (!isRecorded && !selectedBatchId) {
      setActionError('A batch selection is required for Live and Hybrid courses.')
      return
    }
    if (!localPaymentRef.trim()) {
      setActionError('Payment reference is required.')
      return
    }

    setActionError(null)
    startTransition(async () => {
      const result = await grantEnrollmentAccess(
        req.id,
        isRecorded ? null : selectedBatchId,
        localPaymentRef,
        localAdminNotes
      )
      if (result?.error) {
        setActionError(result.error)
      } else {
        router.refresh()
        setExpandedRequestId(null)
      }
    })
  }

  // Handle Revoke Access
  const handleRevokeAccess = (requestId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Revoke Course Access?',
      message: "Are you sure you want to revoke access? This will remove the student's enrollment record and drop the request.",
      confirmText: 'Revoke Access',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
        setActionError(null)
        startTransition(async () => {
          const result = await revokeEnrollmentAccess(requestId)
          if (result?.error) {
            setActionError(result.error)
          } else {
            router.refresh()
            setExpandedRequestId(null)
          }
        })
      }
    })
  }

  // CSV Export Functionality
  const handleCSVExport = () => {
    const headers = ['Student Name', 'Email', 'Phone', 'Course Requested', 'Status', 'Requested At', 'Payment Reference', 'Student Note', 'Admin Notes']
    const rows = filteredRequests.map(r => [
      r.profiles?.full_name || 'N/A',
      r.user_id, // simple identifier, in a real system we'd include user email
      r.profiles?.phone || 'N/A',
      r.courses?.title || 'N/A',
      r.status,
      r.created_at,
      r.payment_reference || '',
      r.student_note || '',
      r.admin_notes || ''
    ])

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n')
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `embark_leads_${filter}_export.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Filters & Export Action Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'new', 'contacted', 'paid', 'dropped', 'enrolled'] as const).map((tab) => {
            const active = filter === tab
            const count = getCount(tab)
            return (
              <button
                key={tab}
                onClick={() => {
                  setFilter(tab)
                  setExpandedRequestId(null)
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  active
                    ? 'bg-primary text-white border-primary shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="capitalize">{tab}</span> ({count})
              </button>
            )
          })}
        </div>

        {/* CSV Export */}
        <button
          onClick={handleCSVExport}
          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-2 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
        >
          ⬇ Export CSV
        </button>
      </div>

      {/* Leads Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-slate-600">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-5 font-semibold">Student</th>
                <th className="py-3.5 px-5 font-semibold">Course requested</th>
                <th className="py-3.5 px-5 font-semibold">Phone</th>
                <th className="py-3.5 px-5 font-semibold">Requested</th>
                <th className="py-3.5 px-5 font-semibold">Status</th>
                <th className="py-3.5 px-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req) => {
                  const isExpanded = expandedRequestId === req.id
                  const ageMs = new Date().getTime() - new Date(req.created_at).getTime()
                  const isSlaBreached = req.status === 'new' && ageMs > 24 * 60 * 60 * 1000

                  // Colors for statuses
                  const statusColors = {
                    new: 'bg-blue-50 text-blue-700 border-blue-100',
                    contacted: 'bg-amber-50 text-amber-700 border-amber-100',
                    paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                    enrolled: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                    dropped: 'bg-slate-100 text-slate-700 border-slate-200'
                  }[req.status]

                  const courseBatches = batchesGrouped[req.course_id] || []

                  return (
                    <React.Fragment key={req.id}>
                      {/* Standard row */}
                      <tr
                        onClick={() => toggleExpand(req)}
                        className={`hover:bg-slate-50/60 transition-all cursor-pointer ${
                          isSlaBreached ? 'bg-red-50/40 hover:bg-red-50/60' : ''
                        } ${isExpanded ? 'bg-slate-50/80' : ''}`}
                      >
                        <td className="py-4 px-5 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{req.profiles?.full_name || 'Anonymous'}</span>
                            {isSlaBreached && (
                              <span className="bg-red-500 text-white text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded shadow-3xs animate-pulse">
                                SLA Breached (&gt;24h)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <div className="font-medium text-slate-800">{req.courses?.title || 'Unknown Course'}</div>
                          <span className="text-[10px] text-slate-400 capitalize">{req.courses?.delivery_type}</span>
                        </td>
                        <td className="py-4 px-5 font-medium font-mono text-slate-700">
                          {req.profiles?.phone || 'N/A'}
                        </td>
                        <td className="py-4 px-5 text-slate-500 font-medium">
                          {getRelativeTime(req.created_at)}
                        </td>
                        <td className="py-4 px-5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${statusColors}`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right font-bold text-slate-400 text-sm">
                          {isExpanded ? '▴' : '▾'}
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/40">
                          <td colSpan={6} className="py-5 px-6 border-b border-slate-200">
                            <div className="space-y-4 max-w-3xl">
                              {/* Details fields */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Student Note</span>
                                  <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700 min-h-[50px] shadow-3xs font-medium">
                                    {req.student_note || 'No time note provided by student.'}
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Reference</span>
                                  <input
                                    type="text"
                                    value={localPaymentRef}
                                    onChange={(e) => setLocalPaymentRef(e.target.value)}
                                    placeholder="UPI txn ID or bank ref"
                                    disabled={req.status === 'enrolled'}
                                    className="w-full bg-white border border-slate-200 focus:border-primary/50 focus:outline-hidden rounded-xl py-2 px-3 text-xs text-slate-800 transition-all font-mono"
                                  />
                                </div>

                                <div className="space-y-1.5">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assign to Batch</span>
                                  {req.courses?.delivery_type === 'recorded' ? (
                                    <div className="bg-slate-100 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-400 font-semibold select-none">
                                      Self-paced (No batch needed)
                                    </div>
                                  ) : (
                                    <select
                                      value={selectedBatchId}
                                      onChange={(e) => setSelectedBatchId(e.target.value)}
                                      disabled={req.status === 'enrolled'}
                                      className="w-full bg-white border border-slate-200 focus:border-primary/50 focus:outline-hidden rounded-xl py-2 px-3 text-xs text-slate-800 transition-all font-semibold"
                                    >
                                      {courseBatches.length > 0 ? (
                                        courseBatches.map((b) => (
                                          <option key={b.id} value={b.id}>
                                            {b.name}
                                          </option>
                                        ))
                                      ) : (
                                        <option value="">No open batches available</option>
                                      )}
                                    </select>
                                  )}
                                </div>
                              </div>

                              {/* Admin notes & history */}
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Admin Notes (internal)</span>
                                <textarea
                                  value={localAdminNotes}
                                  onChange={(e) => setLocalAdminNotes(e.target.value)}
                                  placeholder="Add details of sales call, offline collection details, bank name..."
                                  disabled={req.status === 'enrolled'}
                                  rows={2}
                                  className="w-full bg-white border border-slate-200 focus:border-primary/50 focus:outline-hidden rounded-xl py-2.5 px-3 text-xs text-slate-800 transition-all"
                                />
                              </div>

                              {/* Timestamps */}
                              <div className="text-[10px] text-slate-400 font-medium flex flex-wrap gap-4">
                                <span>Requested: {formatISTDateTime(req.created_at)}</span>
                                <span>Last Updated: {formatISTDateTime(req.updated_at)}</span>
                              </div>

                              {/* Action feedback / errors */}
                              {actionError && (
                                <div className="p-2.5 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-xl">
                                  ⚠️ {actionError}
                                </div>
                              )}

                              {/* Interactive Actions footer */}
                              <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  Current stage: <strong className="text-slate-700 font-extrabold">{req.status}</strong>
                                </span>

                                <div className="flex gap-2">
                                  {req.status !== 'enrolled' && req.status !== 'dropped' && (
                                    <>
                                      <button
                                        onClick={() => handleMarkDropped(req.id)}
                                        disabled={isPending}
                                        className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold py-2 px-4 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                                      >
                                        Mark dropped
                                      </button>

                                      {req.status === 'new' && (
                                        <button
                                          onClick={() => handleMarkContacted(req.id)}
                                          disabled={isPending}
                                          className="bg-primary hover:bg-primary-light text-white text-xs font-bold py-2 px-4 rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
                                        >
                                          📞 Mark contacted
                                        </button>
                                      )}

                                      {req.status === 'contacted' && (
                                        <button
                                          onClick={() => handleMarkPaid(req.id)}
                                          disabled={isPending}
                                          className="bg-primary hover:bg-primary-light text-white text-xs font-bold py-2 px-4 rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
                                        >
                                          💰 Mark paid
                                        </button>
                                      )}

                                      {(req.status === 'paid' || req.status === 'contacted' || req.status === 'new') && (
                                        <button
                                          onClick={() => handleGrantAccess(req)}
                                          disabled={isPending}
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
                                        >
                                          🔑 Grant access ✓
                                        </button>
                                      )}
                                    </>
                                  )}
                                  
                                  {req.status === 'enrolled' && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3.5 py-1.5 rounded-xl shadow-3xs flex items-center gap-1 leading-none select-none">
                                        ✓ Enrolled access granted
                                      </span>
                                      <button
                                        onClick={() => handleRevokeAccess(req.id)}
                                        disabled={isPending}
                                        className="bg-white hover:bg-rose-50 hover:text-rose-650 hover:border-rose-250 border border-slate-200 text-slate-650 text-xs font-bold py-2 px-4 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                                      >
                                        Revoke access
                                      </button>
                                    </div>
                                  )}
                                  
                                  {req.status === 'dropped' && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-xl flex items-center gap-1 leading-none select-none">
                                        ✗ Request dropped
                                      </span>
                                      <button
                                        onClick={() => handleGrantAccess(req)}
                                        disabled={isPending}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
                                      >
                                        🔑 Grant access ✓
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No requests found matching status &quot;{filter}&quot;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        isDestructive={confirmModal.isDestructive}
        isLoading={isPending}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}
