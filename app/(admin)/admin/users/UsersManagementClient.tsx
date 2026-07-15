"use client"

import React, { useState } from 'react'
import { updateUserRole } from '@/lib/actions/users'
import { bulkEnrollStudentsAction } from '@/lib/actions/enrollment'
import { formatISTDate } from '@/lib/date'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'

export interface UserEnrollment {
  id: string
  course_title: string
  batch_name: string | null
}

export interface UserProfile {
  id: string
  full_name: string
  phone: string
  role: 'student' | 'admin'
  created_at: string
  email: string
  enrollments: UserEnrollment[]
}

interface UsersManagementClientProps {
  initialUsers: UserProfile[]
  currentAdminId: string
}

export default function UsersManagementClient({
  initialUsers,
  currentAdminId
}: UsersManagementClientProps) {
  const router = useRouter()
  const { confirm } = useToast()

  // State Management
  const [users, setUsers] = useState<UserProfile[]>(initialUsers)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'student'>('all')
  const [actionError, setActionError] = useState('')
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<{ success: boolean; message: string } | null>(null)

  // Handle role modification
  const handleRoleChange = async (userId: string, newRole: 'student' | 'admin') => {
    setActionError('')
    
    if (userId === currentAdminId) {
      setActionError('Self-lockout prevention: You cannot modify your own role.')
      return
    }

    const confirmMsg = `Are you sure you want to change this user's role to ${newRole.toUpperCase()}?`
    const isConfirmed = await confirm({
      title: 'Change User Role',
      message: confirmMsg,
      confirmText: 'Change Role'
    })
    if (!isConfirmed) {
      return
    }

    setUpdatingUserId(userId)
    const res = await updateUserRole(userId, newRole)
    setUpdatingUserId(null)

    if (res.error) {
      setActionError(res.error)
    } else {
      // Update local state
      setUsers(
        users.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      )
      router.refresh()
    }
  }

  // Handle CSV Import parsing & validation
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setActionError('')
    setImportResults(null)
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        if (!text) {
          setActionError('Could not read file content.')
          setImporting(false)
          return
        }

        // Parse CSV lines
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0)
        if (lines.length < 2) {
          setActionError('CSV must have a header row and at least one data row.')
          setImporting(false)
          return
        }

        // Header mapping
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''))
        const emailIndex = headers.indexOf('email')
        const nameIndex = headers.indexOf('full_name') !== -1 ? headers.indexOf('full_name') : (headers.indexOf('fullname') !== -1 ? headers.indexOf('fullname') : headers.indexOf('name'))
        const phoneIndex = headers.indexOf('phone')
        const courseSlugIndex = headers.indexOf('course_slug') !== -1 ? headers.indexOf('course_slug') : (headers.indexOf('course') !== -1 ? headers.indexOf('course') : headers.indexOf('course_id'))
        const batchNameIndex = headers.indexOf('batch_name') !== -1 ? headers.indexOf('batch_name') : headers.indexOf('batch')

        if (emailIndex === -1 || nameIndex === -1 || courseSlugIndex === -1) {
          setActionError('CSV must contain "email", "full_name" (or "name"), and "course_slug" columns.')
          setImporting(false)
          return
        }

        const studentsList = []
        for (let i = 1; i < lines.length; i++) {
          const row = parseCSVRow(lines[i])
          if (row.length < Math.max(emailIndex, nameIndex, courseSlugIndex) + 1) continue

          const email = row[emailIndex]?.trim()
          const fullName = row[nameIndex]?.trim()
          const phone = phoneIndex !== -1 ? row[phoneIndex]?.trim() || '' : ''
          const courseSlug = row[courseSlugIndex]?.trim()
          const batchName = batchNameIndex !== -1 ? row[batchNameIndex]?.trim() || '' : ''

          if (email && fullName && courseSlug) {
            studentsList.push({
              email,
              fullName,
              phone,
              courseSlug,
              batchName: batchName || undefined
            })
          }
        }

        if (studentsList.length === 0) {
          setActionError('No valid student rows found in the CSV file.')
          setImporting(false)
          return
        }

        const confirmMsg = `Ready to import ${studentsList.length} students. Proceed?`
        const isConfirmed = await confirm({
          title: 'Bulk Import Students',
          message: confirmMsg,
          confirmText: 'Import'
        })
        if (!isConfirmed) {
          setImporting(false)
          return
        }

        const res = await bulkEnrollStudentsAction(studentsList)
        if (res.error) {
          setActionError(res.error)
        } else if (res.results) {
          const successCount = res.results.filter(r => r.success).length
          const failCount = res.results.filter(r => !r.success).length
          
          let summaryMsg = `Successfully imported ${successCount} students.`
          if (failCount > 0) {
            const failedEmails = res.results.filter(r => !r.success).map(r => `${r.email} (${r.error})`).join(', ')
            summaryMsg += ` Failed rows: ${failCount} [${failedEmails}].`
          }

          setImportResults({
            success: failCount === 0,
            message: summaryMsg
          })
          router.refresh()
        }
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'An error occurred while importing.')
      } finally {
        setImporting(false)
        e.target.value = '' // Clear file input
      }
    }

    reader.onerror = () => {
      setActionError('File read error.')
      setImporting(false)
    }

    reader.readAsText(file)
  }

  // Simple CSV row parser to support quotes/escaped commas
  const parseCSVRow = (text: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result.map(val => val.replace(/^["']|["']$/g, ''))
  }

  // Filter logic
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery)

    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  // CSV Export logic
  const exportToCSV = () => {
    const headers = ['Full Name', 'Email', 'Phone', 'Role', 'Joined Date', 'Active Enrollments']
    const rows = filteredUsers.map((u) => [
      u.full_name,
      u.email,
      u.phone,
      u.role,
      formatISTDate(u.created_at, { day: 'numeric', month: 'short', year: 'numeric' }),
      u.enrollments.map(e => `${e.course_title}${e.batch_name ? ` (${e.batch_name})` : ''}`).join('; ')
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `embark-users-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 font-body text-xs">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-display">
            Users
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            View profiles, assign roles (student/admin), search details, and export reports.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* Bulk Import */}
          <label className="w-full sm:w-auto bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center">
            {importing ? '⏳ Importing...' : '📥 Import Students (CSV)'}
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
              disabled={importing}
            />
          </label>

          <button
            onClick={exportToCSV}
            className="w-full sm:w-auto bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            📊 Export Users (CSV)
          </button>
        </div>
      </div>

      {actionError && (
        <div className="bg-rose-50 border border-rose-250 text-rose-700 font-semibold p-4 rounded-xl shadow-3xs animate-fade-in">
          ⚠️ {actionError}
        </div>
      )}

      {importResults && (
        <div className={`p-4 rounded-xl shadow-3xs animate-fade-in border font-semibold ${importResults.success ? 'bg-emerald-50 border-emerald-250 text-emerald-700' : 'bg-amber-50 border-amber-250 text-amber-705'}`}>
          📢 {importResults.message}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center shadow-3xs">
        {/* Role filters */}
        <div className="flex gap-1">
          {(['all', 'admin', 'student'] as const).map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`py-1.5 px-3.5 rounded-lg font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer ${
                roleFilter === role
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-55/70 text-slate-550 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {role === 'all' ? 'All Roles' : role}
            </button>
          ))}
        </div>
        {/* Search */}
        <div className="relative min-w-[260px]">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white text-slate-800 py-2 pl-8 pr-4 rounded-xl outline-hidden transition-all"
          />
          <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-slate-600">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-5 font-semibold">User details</th>
                <th className="py-3.5 px-5 font-semibold">Email</th>
                <th className="py-3.5 px-5 font-semibold">Phone</th>
                <th className="py-3.5 px-5 font-semibold">Active Enrollments</th>
                <th className="py-3.5 px-5 font-semibold">Role</th>
                <th className="py-3.5 px-5 font-semibold">Joined on</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => {
                  const isCurrentAdmin = u.id === currentAdminId
                  const isRoleUpdating = updatingUserId === u.id

                  const roleBadgeStyles = ({
                    admin: 'bg-rose-50 text-rose-700 border-rose-100 font-bold',
                    student: 'bg-indigo-50 text-indigo-700 border-indigo-100 font-bold'
                  })[u.role]

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900 text-sm">{u.full_name || 'Anonymous User'}</div>
                        <div className="text-[9px] text-slate-400 font-mono mt-0.5">{u.id}</div>
                      </td>
                      <td className="py-4 px-5 font-mono text-slate-700 font-medium">
                        {u.email}
                      </td>
                      <td className="py-4 px-5 font-mono text-slate-700 font-medium">
                        {u.phone || '—'}
                      </td>
                      <td className="py-4 px-5">
                        {u.enrollments.length > 0 ? (
                          <div className="flex flex-col gap-1 max-w-[280px]">
                            {u.enrollments.map((e) => (
                              <div
                                key={e.id}
                                className="bg-slate-100/80 border border-slate-200 text-slate-650 text-[10px] font-medium py-0.5 px-2 rounded-lg truncate"
                              >
                                {e.course_title} {e.batch_name && `(${e.batch_name})`}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">No active enrollments</span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        {isCurrentAdmin ? (
                          <span className="inline-block text-[10px] uppercase px-2.5 py-0.5 rounded-md border bg-slate-150 text-slate-600 border-slate-250 font-bold">
                            Admin (You)
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            disabled={isRoleUpdating}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as 'student' | 'admin')}
                            className={`text-[10px] uppercase px-2.5 py-0.5 rounded-md border font-bold cursor-pointer outline-hidden transition-all ${roleBadgeStyles} disabled:opacity-50`}
                          >
                            <option value="student">Student</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                        {isRoleUpdating && (
                          <span className="ml-2 text-[9px] text-slate-400 animate-pulse">updating...</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-slate-500 font-medium">
                        {formatISTDate(u.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                    {initialUsers.length === 0 ? 'No registered users found.' : 'No users match the search filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
