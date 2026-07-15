'use client'

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
}

interface Toast {
  id: string
  message: string
  title?: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string, duration?: number) => void
    error: (message: string, title?: string, duration?: number) => void
    warning: (message: string, title?: string, duration?: number) => void
    info: (message: string, title?: string, duration?: number) => void
  }
  confirm: (options: ConfirmOptions | string) => Promise<boolean>
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean
    options: ConfirmOptions
    resolve: (value: boolean) => void
  } | null>(null)

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((type: Toast['type'], message: string, title?: string, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, type, message, title, duration }])
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }, [removeToast])

  const toast = useMemo(() => ({
    success: (message: string, title?: string, duration?: number) => addToast('success', message, title, duration),
    error: (message: string, title?: string, duration?: number) => addToast('error', message, title, duration),
    warning: (message: string, title?: string, duration?: number) => addToast('warning', message, title, duration),
    info: (message: string, title?: string, duration?: number) => addToast('info', message, title, duration),
  }), [addToast])

  const confirm = useCallback((options: ConfirmOptions | string) => {
    return new Promise<boolean>((resolve) => {
      const parsedOptions: ConfirmOptions = 
        typeof options === 'string'
          ? { title: 'Confirm Action', message: options }
          : options

      setConfirmState({
        isOpen: true,
        options: parsedOptions,
        resolve,
      })
    })
  }, [])

  const handleCancel = () => {
    if (confirmState) {
      confirmState.resolve(false)
      setConfirmState(null)
    }
  }

  const handleConfirm = () => {
    if (confirmState) {
      confirmState.resolve(true)
      setConfirmState(null)
    }
  }

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast notifications container */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none w-80 max-w-[calc(100vw-3rem)]">
        {toasts.map((t) => {
          let icon = <Info className="w-5 h-5" />
          let colorClass = 'border-slate-200/80 bg-white/95 text-slate-800'
          let accentColor = 'bg-primary'
          let iconBg = 'bg-primary/10 text-primary border-primary/20'

          if (t.type === 'success') {
            icon = <CheckCircle2 className="w-5 h-5" />
            colorClass = 'border-emerald-100 bg-emerald-50/95 text-emerald-955 shadow-emerald-500/5'
            accentColor = 'bg-emerald-500'
            iconBg = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
          } else if (t.type === 'error') {
            icon = <AlertCircle className="w-5 h-5" />
            colorClass = 'border-rose-100 bg-rose-50/95 text-rose-955 shadow-rose-500/5'
            accentColor = 'bg-rose-500'
            iconBg = 'bg-rose-500/10 text-rose-600 border-rose-500/20'
          } else if (t.type === 'warning') {
            icon = <AlertTriangle className="w-5 h-5" />
            colorClass = 'border-amber-100 bg-amber-50/95 text-amber-955 shadow-amber-500/5'
            accentColor = 'bg-amber-500'
            iconBg = 'bg-amber-500/10 text-amber-600 border-amber-500/20'
          } else if (t.type === 'info') {
            icon = <Info className="w-5 h-5" />
            colorClass = 'border-sky-100 bg-sky-50/95 text-sky-955 shadow-sky-500/5'
            accentColor = 'bg-sky-500'
            iconBg = 'bg-sky-500/10 text-sky-600 border-sky-500/20'
          }

          return (
            <div
              key={t.id}
              className={`border backdrop-blur-md shadow-2xl rounded-2xl p-4 flex items-start gap-3 pointer-events-auto transition-all duration-300 transform translate-x-0 animate-in slide-in-from-right-5 duration-200 relative overflow-hidden ${colorClass}`}
            >
              {/* Colored left edge accent */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${accentColor}`} />

              <div className={`p-2 rounded-xl border shrink-0 ${iconBg}`}>
                {icon}
              </div>

              <div className="space-y-0.5 flex-1 select-none pr-4">
                {t.title && (
                  <h4 className="text-xs font-bold font-display uppercase tracking-wider">
                    {t.title}
                  </h4>
                )}
                <p className="text-xs font-medium font-body leading-normal">
                  {t.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-655 p-1 rounded-lg hover:bg-slate-100/50 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Progress bar animation */}
              <div 
                className={`absolute bottom-0 left-0 h-0.5 ${accentColor} opacity-30 w-full origin-left`}
                style={{
                  animation: `shrinkWidth ${t.duration || 4000}ms linear forwards`
                }}
              />
            </div>
          )
        })}
      </div>

      {/* Styled inline keyframe definition for progress bar */}
      <style jsx global>{`
        @keyframes shrinkWidth {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>

      {/* Custom Promise-based Confirm dialog */}
      {confirmState && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={handleCancel}
          />

          <div className="relative bg-white border border-slate-200 max-w-md w-full rounded-2xl p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 font-body text-slate-800">
            <div className="flex gap-4 items-start">
              <div
                className={`p-3 rounded-xl border shrink-0 ${
                  confirmState.options.isDestructive
                    ? 'bg-rose-50 text-rose-600 border-rose-100'
                    : 'bg-primary/10 text-primary border-primary/20'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>

              <div className="space-y-1.5 flex-1">
                <h3 className="text-base font-extrabold tracking-tight text-slate-900 font-display">
                  {confirmState.options.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {confirmState.options.message}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-6">
              <button
                type="button"
                onClick={handleCancel}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer"
              >
                {confirmState.options.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer shadow-2xs ${
                  confirmState.options.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-primary hover:bg-primary-light text-white'
                }`}
              >
                {confirmState.options.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}
