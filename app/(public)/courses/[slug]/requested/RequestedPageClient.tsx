"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { updateRequestStudentNote, updateProfilePhone } from '@/lib/actions/enrollment'

interface RequestedPageClientProps {
  requestId: string
  courseTitle: string
  batchName: string | null
  initialPhone: string
  initialStudentNote: string | null
}

export default function RequestedPageClient({
  requestId,
  courseTitle,
  batchName,
  initialPhone,
  initialStudentNote
}: RequestedPageClientProps) {
  const [studentNote, setStudentNote] = useState(initialStudentNote || '')
  const [phone, setPhone] = useState(initialPhone)
  const [newPhone, setNewPhone] = useState(initialPhone)

  const [isEditingPhone, setIsEditingPhone] = useState(false)
  const [noteSuccess, setNoteSuccess] = useState<string | null>(null)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [phoneSuccess, setPhoneSuccess] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const [savingNote, setSavingNote] = useState(false)
  const [savingPhone, setSavingPhone] = useState(false)

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingNote(true)
    setNoteSuccess(null)
    setNoteError(null)

    const result = await updateRequestStudentNote(requestId, studentNote)
    setSavingNote(false)

    if (result.error) {
      setNoteError(result.error)
    } else {
      setNoteSuccess('Preferred call time saved successfully!')
    }
  }

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingPhone(true)
    setPhoneSuccess(null)
    setPhoneError(null)

    const result = await updateProfilePhone(newPhone)
    setSavingPhone(false)

    if (result.error) {
      setPhoneError(result.error)
    } else {
      setPhone(result.phone || newPhone)
      setIsEditingPhone(false)
      setPhoneSuccess('Phone number updated successfully!')
    }
  }

  return (
    <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xs text-center space-y-6">
      {/* Checkmark ✅ */}
      <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center text-3xl mx-auto shadow-2xs">
        ✅
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-bold text-slate-900 font-display">
          Request received
        </h1>
        <p className="text-slate-500 text-xs leading-relaxed">
          Our team will call you within 24 hours on{' '}
          <strong className="text-slate-800">
            {phone.replace(/(\d{5})$/, 'XXXXX')}
          </strong>{' '}
          to complete your enrollment for{' '}
          <strong className="text-slate-800">
            {courseTitle} {batchName ? `— ${batchName}` : ''}
          </strong>.
        </p>
      </div>

      <hr className="border-slate-100" />

      {/* Time to call note form */}
      <form onSubmit={handleSaveNote} className="text-left space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Preferred time to call (optional)
          </label>
          <input
            type="text"
            value={studentNote}
            onChange={(e) => setStudentNote(e.target.value)}
            placeholder="e.g. Evenings after 6 pm"
            className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden transition-all placeholder-slate-400"
          />
        </div>

        {noteSuccess && (
          <p className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg">
            {noteSuccess}
          </p>
        )}

        {noteError && (
          <p className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
            {noteError}
          </p>
        )}

        <button
          type="submit"
          disabled={savingNote}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-50"
        >
          {savingNote ? 'Saving...' : 'Save note'}
        </button>
      </form>

      <hr className="border-slate-100" />

      {/* Phone editing UI */}
      <div className="text-center space-y-3">
        {phoneSuccess && (
          <p className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg text-left">
            {phoneSuccess}
          </p>
        )}

        {phoneError && (
          <p className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg text-left">
            {phoneError}
          </p>
        )}

        {isEditingPhone ? (
          <form onSubmit={handleSavePhone} className="text-left space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Correct phone number
              </label>
              <input
                type="tel"
                inputMode="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savingPhone}
                className="flex-1 bg-primary hover:bg-primary-light text-white text-xs font-bold py-2 px-3 rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-50"
              >
                {savingPhone ? 'Updating...' : 'Save Phone'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewPhone(phone)
                  setIsEditingPhone(false)
                  setPhoneError(null)
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 text-xs font-semibold py-2 px-3 rounded-lg transition-all duration-150 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <p className="text-[11px] text-slate-400">
            Payment options shared on call: UPI / bank transfer.{' '}
            <button
              onClick={() => setIsEditingPhone(true)}
              className="text-primary hover:underline font-semibold cursor-pointer"
            >
              Wrong number? Update phone
            </button>
          </p>
        )}
      </div>

      <div className="pt-2">
        <Link
          href="/dashboard"
          className="w-full inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-all duration-150 text-center"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
