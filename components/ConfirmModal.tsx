import React from 'react'
import { AlertTriangle } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop blur overlay */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={isLoading ? undefined : onCancel}
      />

      {/* Modal card */}
      <div className="relative bg-white border border-slate-200 max-w-md w-full rounded-2xl p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 font-body text-slate-800">
        <div className="flex gap-4 items-start">
          <div className={`p-3 rounded-xl ${isDestructive ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-primary/10 text-primary border border-primary/20'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          
          <div className="space-y-1.5 flex-1">
            <h3 className="text-base font-extrabold tracking-tight text-slate-900 font-display">
              {title}
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 mt-6">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="bg-white hover:bg-slate-50 border border-slate-250 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50 shadow-2xs flex items-center gap-1.5 ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-primary hover:bg-primary-light text-white'
            }`}
          >
            {isLoading ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
