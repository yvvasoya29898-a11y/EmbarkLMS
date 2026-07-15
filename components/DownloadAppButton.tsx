'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export default function DownloadAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const [isAlreadyInstalled, setIsAlreadyInstalled] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser default prompt
      e.preventDefault()
      // Store event
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check if PWA is already installed
    const isStandaloneSafari = 'standalone' in window.navigator && 
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true

    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      isStandaloneSafari
    ) {
      setIsAlreadyInstalled(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
      }
    } else {
      setShowInstructions(true)
    }
  }

  if (isAlreadyInstalled) return null

  return (
    <div className="relative">
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-primary font-bold py-1.5 px-3.5 border border-slate-200 rounded-xl text-[10px] uppercase tracking-wider font-mono transition-all duration-150 cursor-pointer shadow-3xs active:scale-95"
        title="Download App as a PWA"
      >
        <Download className="w-3 h-3 text-primary" />
        <span>Download App</span>
      </button>

      {showInstructions && (
        <div 
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setShowInstructions(false)}
        >
          <div 
            className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-xl relative animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/5 text-primary rounded-full mb-1">
                <Download className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-display">Install Embark App</h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                Add Embark LMS to your desktop or mobile home screen for a full-screen, native-like experience.
              </p>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-3.5 text-[11px] text-slate-600">
              <div className="flex gap-2.5">
                <span className="font-bold text-primary font-mono shrink-0">1.</span>
                <p>
                  <strong>Chrome / Edge / Brave:</strong> Click the <span className="font-mono text-primary font-bold">Install</span> icon in the address bar (next to bookmarks), or open browser settings and choose <span className="font-bold text-slate-800">&quot;Install app&quot;</span>.
                </p>
              </div>
              <div className="flex gap-2.5">
                <span className="font-bold text-primary font-mono shrink-0">2.</span>
                <p>
                  <strong>Safari (iPhone/iPad):</strong> Tap the <span className="underline">Share</span> icon in the bottom menu bar, scroll down, and select <span className="font-bold text-slate-800">&quot;Add to Home Screen&quot;</span>.
                </p>
              </div>
              <div className="flex gap-2.5">
                <span className="font-bold text-primary font-mono shrink-0">3.</span>
                <p>
                  <strong>Mobile Chrome:</strong> Tap the three-dot settings menu and select <span className="font-bold text-slate-800">&quot;Add to Home screen&quot;</span> or <span className="font-bold text-slate-800">&quot;Install app&quot;</span>.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer text-center mt-2 shadow-2xs"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
