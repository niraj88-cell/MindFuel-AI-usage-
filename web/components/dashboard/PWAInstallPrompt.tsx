'use client'

import React, { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault()
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e)
      
      // Only show if we haven't dismissed it recently
      const dismissedAt = localStorage.getItem('pwa_prompt_dismissed')
      if (!dismissedAt || (Date.now() - parseInt(dismissedAt)) > 1000 * 60 * 60 * 24 * 7) { // 7 days
        setShowPrompt(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    
    // Show the install prompt
    deferredPrompt.prompt()
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString())
  }

  if (!showPrompt || isInstalled) return null

  return (
    <div className="bg-[#111827] text-white rounded-2xl p-4 shadow-xl flex items-start gap-4 animate-fade-in-up">
      <div className="bg-white/10 p-3 rounded-xl shrink-0">
        <Download className="w-6 h-6 text-[#FAF8F4]" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-base mb-1">Add to Home Screen</h3>
        <p className="text-sm text-gray-400 leading-relaxed mb-3">
          Install MindFuel to get your daily 8pm reflection reminder and one-tap logging.
        </p>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleInstall}
            className="bg-white text-black hover:bg-gray-200 h-8 px-4 rounded-lg text-xs font-semibold"
          >
            Install App
          </Button>
          <Button 
            onClick={handleDismiss}
            variant="ghost" 
            className="text-gray-400 hover:text-white hover:bg-white/10 h-8 px-4 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Not now
          </Button>
        </div>
      </div>
      <button onClick={handleDismiss} className="text-gray-500 hover:text-gray-300 transition-colors p-1 shrink-0 cursor-pointer">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
