'use client'

import React, { useState } from 'react'
import { Share, Download, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ShareButtonProps {
  targetId: string
  title: string
  text?: string
  url?: string
}

export function ShareButton({ targetId, title, text = '', url = 'https://getmindfuel.vercel.app' }: ShareButtonProps) {
  const [sharing, setSharing] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleShare = async () => {
    try {
      setSharing(true)
      
      // Dynamic import to avoid SSR issues
      const html2canvas = (await import('html2canvas')).default
      
      const element = document.getElementById(targetId)
      if (!element) throw new Error('Target element not found')

      // Pre-process element styles for better capture if needed
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution
        backgroundColor: '#FAF8F4',
        logging: false,
        useCORS: true
      })

      const blob = await new Promise<Blob | null>((resolve) => 
        canvas.toBlob(resolve, 'image/png')
      )

      if (!blob) throw new Error('Failed to generate image')

      const file = new File([blob], 'mindfuel-insight.png', { type: 'image/png' })

      // Check if Web Share API is available and supports sharing files
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title,
          text,
          url,
          files: [file]
        })
        setSuccess(true)
      } else {
        // Fallback: Download the image
        const urlObj = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = urlObj
        a.download = 'mindfuel-insight.png'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(urlObj)
        setSuccess(true)
      }
      
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Share failed:', err)
      // Fallback to text sharing if image generation fails
      if (navigator.share) {
        try {
          await navigator.share({ title, text, url })
        } catch (e) {
          // User cancelled
        }
      }
    } finally {
      setSharing(false)
    }
  }

  return (
    <Button 
      onClick={handleShare}
      disabled={sharing}
      variant="outline"
      className="gap-2 rounded-xl text-xs font-semibold h-9 px-4 border-black/[0.06] hover:bg-[#F5F7F6]"
    >
      {success ? (
        <>
          <CheckCircle2 className="w-4 h-4 text-[#4CAF50]" />
          Shared
        </>
      ) : sharing ? (
        <>
          <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          Generating...
        </>
      ) : (typeof navigator !== 'undefined' && 'share' in navigator) ? (
        <>
          <Share className="w-4 h-4" />
          Share Insight
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Save Image
        </>
      )}
    </Button>
  )
}
